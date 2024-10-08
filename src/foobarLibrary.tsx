import {useEffect, useState} from "react";
import './foobarLibrary.css';

interface BeefwebItem {
    columns: Array<string>
}

type AlbumId = string;

class Track {
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
}

class Album {
    private _tracks: Array<Track>;

    constructor() {
        this._tracks = [];
    }

    addTrack(track: Track) {
        this._tracks.push(track);
    }

    name() {
        return this._tracks[0].album();
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
        return ['%title%', '%artist%', '%album artist%', '%album%'];
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
    return <><li key={album.albumId()} onClick={() => toggleOpen(albumId)}>
        <img src={album.artUrl()}/>
        <h2>{album.name()}</h2>
    </li><FoobarAlbumDetails album={album} open={albumId === openAlbumId} closing={albumId === closingAlbumId}/></>
}

function FoobarAlbumDetails({album, open, closing}: {album: Album, open: boolean, closing: boolean}) {
    return <div className={"album-details " + (open?'open':'') + (closing?'closing':'')}>
        <ul>
        {album.tracks().map(track => <li>{track.title()}</li>)}
        </ul>
    </div>
}