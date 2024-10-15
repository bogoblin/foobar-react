import {useState} from "react";
import './foobarLibrary.css';
import {$api, play} from "./beefweb.ts";
import {components} from "./beefwebSchema";
import {getContrastRatio, RGB} from "a11y-contrast-color";
import {get_kmeans, Centroid} from "kmeans-color-wasm";

type AlbumId = string;

export class Track {
    get index() {
        // Foobar2000 uses 1 indexed but beefweb uses 0 index
        return parseInt(this.getColumn("%list_index%")) - 1;
    }
    private playlistId: string;
    private readonly columns: string[];

    constructor(playlistId: string, columns: string[]) {
        this.playlistId = playlistId;
        this.columns = columns;
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
    private _tracks: Array<Track>;

    constructor() {
        this._tracks = [];
    }

    addTrack(track: Track) {
        this._tracks.push(track);
    }

    name() {return this._tracks[0].getColumn("%album%");}

    artist() {return this._tracks[0].getColumn('%album artist%');}

    year() {
        return this._tracks[0].getColumn("$year($meta(Date))");
    }

    artUrl() {return this._tracks[0].artUrl();}

    albumId() {return this._tracks[0].albumId();}

    tracks() {
        this._tracks.sort((a, b) =>
            parseInt(a.getColumn("%track number%")) - parseInt(b.getColumn("%track number%"))
        );
        return this._tracks;
    }

    private _bgColor: string | undefined;
    bgColor() {
        return this._bgColor || 'black';
    }
    private _textColor: string | undefined;
    textColor() {
        return this._textColor || 'white';
    }
    private _accentColor: string | undefined;
    accentColor() {
        return this._accentColor || 'red';
    }

    get sortKey() {
        const artist = this.artist().replace(/^(The |A )/, '');
        const title = this.name().replace(/^(The |A )/, '');
        return `${artist} - ${title}`;
    }

    calculateColors(image: HTMLImageElement) {
        if (this._bgColor) return;
        const result = get_kmeans(image, {
            color_space: "LAB",
            converge: 0.05,
            k: 5,
            max_iter: 50,
        });
        result.sort((a, b) => b.percentage - a.percentage);
        const color0 = centroidToRgb(result[0]);
        const colors = result.map(c => {
            const color = centroidToRgb(c);
            return {
                color,
                contrast: getContrastRatio(color, color0)
            }
        });
        this._bgColor = rgbToString(color0);

        // We would prefer to use the most prominent colors, but we need to
        // choose colors that have enough contrast so that you can read it.
        for (let i=1; i<colors.length; i++) {
            if (!this._textColor && colors[i].contrast > 4.5) {
                this._textColor = rgbToString(colors[i].color);
            }
            else if (!this._accentColor && colors[i].contrast > 2) {
                this._accentColor = rgbToString(colors[i].color);
            }
        }

        // If we fall through, then just pick the color with the most contrast
        colors.sort((a, b) => b.contrast - a.contrast);
        if (!this._textColor) {
            this._textColor = rgbToString(colors[1].color);
        }
        if (!this._accentColor) {
            this._accentColor = rgbToString(colors[2].color);
        }
    }
}

function centroidToRgb(centroid: Centroid) {
    return [...centroid.rgb] as RGB;
}
function rgbToString(rgb: RGB) {
    return `rgb(${rgb.join(',')})`;
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
        this.tracks.push(track);
        const album = this.albums[track.albumId()] || new Album();
        album.addTrack(track);
        this.albums[track.albumId()] = album;
    }

    getAlbums() {
        const albums = Object.values(this.albums);
        albums.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
        return albums;
    }
}

export const LibraryColumns = ['%title%', '%artist%', '%album artist%', '%album%', '%track number%', '%path%', '%_path_raw%', '%list_index%', '$year($meta(Date))'] as const;

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
            {library.getAlbums().map(album => FoobarAlbum({album, openAlbumId, toggleOpen, closingAlbumId}))}
        </ul>
    } else {
        return 'Loading...';
    }
}

function FoobarAlbum({album, openAlbumId, toggleOpen, closingAlbumId}: {album: Album, openAlbumId: AlbumId|null, toggleOpen: (albumId: AlbumId|null) => void, closingAlbumId: AlbumId|null}) {
    const albumId = album.albumId();
    const detailsOpen = albumId === openAlbumId || albumId === closingAlbumId;
    return <>
        <li id={albumId} key={albumId} className={"library-album"}>
            <a onClick={() => toggleOpen(albumId)}>
                <img crossOrigin={"anonymous"} src={album.artUrl()} onLoad={(e) => {
                    album.calculateColors(e.currentTarget);
                }}/>
                <div className={"album-title"}>{album.name()}</div>
                <div className={"album-artist"}>{album.artist()}</div>
            </a>
            {detailsOpen ? <div style={{backgroundColor: album.bgColor()}} className={albumId === openAlbumId ? 'triangle open' : 'triangle closing'}/> : ''}
        </li>
        {detailsOpen
            ? <FoobarAlbumDetails key={`${albumId}-details`} album={album} open={albumId === openAlbumId} closing={albumId === closingAlbumId}/>
            : <></>
        }
    </>;
}

function FoobarAlbumDetails({album, open, closing}: {album: Album, open: boolean, closing: boolean}) {
    return <div className={"album-details " + (open?'open':'') + (closing?'closing':'')}
                style = {{
                    backgroundColor: album.bgColor(),
                    color: album.textColor(),
                }}
    >
        <div className={"album-details-inner"}>
            <div className={"header"} style={{gridArea: "header", borderBottom: `${album.accentColor()} 1px solid`}}>
                    <div className={"title"}>{album.name()}</div>
                    <div className={"artist"}>{album.artist()}</div>
                    <div className={"year"}>{album.year()}</div>
            </div>
            <img src={album.artUrl()} style={{gridArea: "art"}}/>
            <ul style={{gridArea: "tracks"}}>
                {album.tracks().map(track => <li
                    key={track.index}

                    value={track.getColumn("%track number%")}
                >
                    <span className={"track"}>
                    <button className={"play-song"}
                            onClick={() => {
                                play(track).then(console.log);
                            }}/>
                    <span>{track.getColumn('%title%')}</span>
                    </span>
                </li>)}
            </ul>
        </div>
    </div>
}