import {useState} from "react";
import './foobarLibrary.css';
import fontColorContrast from "font-color-contrast";
import {$api, play} from "./beefweb.ts";
import {components} from "./beefwebSchema";

type AlbumId = string;

export class Track {
    get index() {
        return this._index || 0;
    }
    private _index: number | null;
    private playlistId: string;
    private readonly columns: string[];

    constructor(playlistId: string, columns: string[]) {
        this._index = null;
        this.playlistId = playlistId;
        this.columns = columns;
    }

    setIndex(index: number) {
        this._index = index;
    }

    getColumn(columnName: typeof LibraryColumns[number]) {
        return this.columns[LibraryColumns.indexOf(columnName)];
    }

    albumId(): AlbumId {
        return `${this.getColumn("%album artist%")} - ${this.getColumn("%album%")}`;
    }

    artUrl() {
        return `http://localhost:8880/api/artwork/${this.playlistId}/${this.index}`;
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

    name() {return this._tracks[0].getColumn("%album%");}

    artist() {return this._tracks[0].getColumn('%album artist%');}

    artUrl() {return this._tracks[0].artUrl();}

    albumId() {return this._tracks[0].albumId();}

    tracks() {return this._tracks;}

    textColor() {
        return this._textColor || [255,255,255]; // White as the default because black is the default for the background
    }
}

class Library {
    public tracks: Array<Track>;
    public albums: Record<AlbumId, Album>;
    public playlistId: string;

    constructor(playlistId: string) {
        this.tracks = [];
        this.albums = {};
        this.playlistId = playlistId;
    }

    addPlaylistItems(playlistItems: components["schemas"]["PlaylistItemsResult"]) {
        console.log("building library");
        for (const item of playlistItems['items'] || []) {
            if (item?.columns) {
                const track = new Track(this.playlistId, item.columns);
                this.addTrack(track);
            }
        }
    }

    addTrack(track: Track) {
        const index = this.tracks.length;
        track.setIndex(index);
        this.tracks.push(track);
        const album = this.albums[track.albumId()] || new Album();
        album.addTrack(track);
        this.albums[track.albumId()] = album;
    }
}

const LibraryColumns = ['%title%', '%artist%', '%album artist%', '%album%', '%track number%'] as const;

export function FoobarLibrary({playlistId}: {playlistId: string}) {
    // TODO: move this so it doesn't get re run all the time:
    const { data } = $api.useQuery(
        "get",
        "/query",
        {
            params: {
                query: {
                    player: false,
                    playlists: false,
                    playlistItems: true,
                    plref: playlistId,
                    plrange: '0:100000',
                    // @ts-expect-error The API expects us to serialise the list with a comma,
                    // but this library does it with separate query parameters
                    plcolumns: LibraryColumns.join(',')
                }
            }
        }
    );

    if (data?.playlistItems) {
        const library = new Library(playlistId);
        library.addPlaylistItems(data.playlistItems);
        return <AlbumsView library={library}></AlbumsView>
    } else {
        return <AlbumsView library={null}></AlbumsView>
    }
}

function AlbumsView({library}: {library: Library | null}) {
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
        return 'Loading...';
    }
}

function FoobarAlbum({album, openAlbumId, toggleOpen, closingAlbumId}: {album: Album, openAlbumId: AlbumId|null, toggleOpen: (albumId: AlbumId|null) => void, closingAlbumId: AlbumId|null}) {
    const albumId = album.albumId();
    return <>
        <li key={albumId} onClick={() => toggleOpen(albumId)}>
            <img crossOrigin={"anonymous"} src={album.artUrl()} onLoad={(e) => {
                if (album.bgColor[0] === 0) {
                    album.bgColor = albumColors(e.currentTarget);
                }
            }}/>
            <div className={"album-title"}>{album.name()}</div>
            <div className={"album-artist"}>{album.artist()}</div>
        </li>
        <FoobarAlbumDetails key={`${albumId}-details`} album={album} open={albumId === openAlbumId} closing={albumId === closingAlbumId}/>
    </>;
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
        >{track.getColumn('%track number%')}. {track.getColumn('%title%')}</li>)}
        </ul>
    </div>
}