import {useEffect, useState} from "react";
import './foobarLibrary.css';
import fontColorContrast from "font-color-contrast";
import {play} from "./beefweb.ts";

interface BeefwebItem {
    columns: Array<string>
}

type AlbumId = string;

export class Track {
    get index(): number | null {
        return this._index || 0;
    }
    private _index: number | null;
    private playlistId: string;
    private readonly columns: Record<string, string>;

    constructor(playlistId: string, item: BeefwebItem, columns: Array<string>) {
        this._index = null;
        this.playlistId = playlistId;
        this.columns = {};
        for (let i=0; i<columns.length; i++) {
            this.columns[columns[i]] = item.columns[i];
        }
    }

    setIndex(index: number) {
        this._index = index;
    }

    albumId(): AlbumId {
        return `${this.albumArtist()} - ${this.album()}`;
    }

    album() {
        return this.columns['%album%'];
    }

    title() {
        return this.columns['%title%']
    }

    albumArtist() {
        return this.columns['%album artist%'];
    }

    artUrl() {
        return `http://localhost:8880/api/artwork/${this.playlistId}/${this.index}`;
    }

    trackNumber() {
        return this.columns['%track number%'];
    }
}

class Album {
    get bgColor(): [number, number, number] {
        return this._bgColor || [0,0,0];
    }

    set bgColor(value: [number, number, number]) {
        if (this._bgColor === null) {
            this._bgColor = value;
            if (fontColorContrast(...value) === '#000000') {
                this._textColor = [0, 0, 0];
            } else {
                this._textColor = [255, 255, 255];
            }
        }
    }
    private _tracks: Array<Track>;
    private _bgColor: [number, number, number] | null = null;
    private _textColor: [number, number, number] | null = null;

    constructor() {
        this._tracks = [];
    }

    addTrack(track: Track) {
        this._tracks.push(track);
    }

    name() {
        return this._tracks[0].album();
    }

    artist() {
        return this._tracks[0].albumArtist();
    }

    artUrl() {
        return this._tracks[0].artUrl();
    }

    albumId() {
        return this._tracks[0].albumId();
    }

    tracks() {
        return this._tracks;
    }

    textColor() {
        return this._textColor || [255,255,255]; // White as the default because black is the default for the background
    }
}

class Library {
    public tracks: Array<Track>;
    public albums: Record<AlbumId, Album>;

    constructor() {
        this.tracks = [];
        this.albums = {};
    }

    addTrack(track: Track) {
        const index = this.tracks.length;
        track.setIndex(index);
        this.tracks.push(track);
        const album = this.albums[track.albumId()] || new Album();
        album.addTrack(track);
        this.albums[track.albumId()] = album;
    }
    
    totalCount(): number {
        return this.tracks.length;
    }

    columns(): Array<string> {
        return ['%title%', '%artist%', '%album artist%', '%album%', '%track number%'];
    }
}

async function fetchLibrary(playlistId: string) {
    const library = new Library();
    const columns = library.columns();
    const params = new URLSearchParams({
        player: 'false',
        playlists: 'false',
        playlistItems: 'true',
        plref: playlistId,
        plrange: '0:10000',
        plcolumns: columns.join(',')
    });
    const url = `http://localhost:8880/api/query?${params.toString()}`;
    const response = await (await fetch(url)).json();

    for (const item of response['playlistItems']['items']) {
        const track = new Track(playlistId, item, columns);
        library.addTrack(track);
    }

    return library;
}

export function FoobarLibrary({playlistId}: {playlistId: string}) {
    const [library, setLibrary] = useState<Library | null>(null);

    useEffect(() => {
        fetchLibrary(playlistId)
            .then(library => setLibrary(library))
    }, [playlistId])

    const [openAlbumId, setOpenAlbumId] = useState<AlbumId | null>(null);
    const [closingAlbumId, setClosingAlbumId] = useState<AlbumId | null>(null);

    function toggleOpen(albumId: AlbumId|null) {
        setClosingAlbumId(openAlbumId);
        if (openAlbumId === albumId) {
            setOpenAlbumId(null);
        } else {
            setOpenAlbumId(albumId);
        }
    }

    if (library) {
        return <ul className={"library"}>
            {Object.values(library.albums).map(album => FoobarAlbum({album, openAlbumId, toggleOpen, closingAlbumId}))}
        </ul>
    } else {
        return <span>Loading...</span>
    }
}

function FoobarAlbum({album, openAlbumId, toggleOpen, closingAlbumId}: {album: Album, openAlbumId: AlbumId|null, toggleOpen: (albumId: AlbumId|null) => void, closingAlbumId: AlbumId|null}) {
    const albumId = album.albumId();
    return <>
        <li key={album.albumId()} onClick={() => toggleOpen(albumId)}>
            <img crossOrigin={"anonymous"} src={album.artUrl()} onLoad={(e) => {
                if (album.bgColor[0] === 0) {
                    album.bgColor = albumColors(e.currentTarget);
                }
            }}/>
            <div className={"album-title"}>{album.name()}</div>
            <div className={"album-artist"}>{album.artist()}</div>
        </li>
        <FoobarAlbumDetails album={album} open={albumId === openAlbumId} closing={albumId === closingAlbumId}/></>
}

function albumColors(element: HTMLImageElement): [number, number, number] {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return [0,0,0];
    ctx.drawImage(element, 0, 0, 16, 16);
    const imageData = ctx.getImageData(0, 0, 16, 16);
    const total = [0,0,0];
    for (let y=0; y<imageData.height; y++) {
        for (let x=0; x<imageData.width; x++) {
            const index = (y*imageData.width+x)*4;
            total[0] += imageData.data[index+0];
            total[1] += imageData.data[index+1];
            total[2] += imageData.data[index+2];
        }
    }
    const [r,g,b] = total.map(v => Math.floor(v/(imageData.width*imageData.height)));
    return [r,g,b];
}

function FoobarAlbumDetails({album, open, closing}: {album: Album, open: boolean, closing: boolean}) {
    return <div className={"album-details " + (open?'open':'') + (closing?'closing':'')}
                style = {{
                    backgroundColor: `rgb(${album.bgColor.join(',')})`,
                    color: `rgb(${album.textColor().join(',')})`,
    }}
    >
        <ul>
        {album.tracks().map(track => <li
            key={track.index}
            onClick={() => {
                play(track).then(console.log);
            }}
        >{track.trackNumber()}. {track.title()}</li>)}
        </ul>
    </div>
}