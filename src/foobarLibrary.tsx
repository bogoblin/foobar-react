import {useEffect, useState} from "react";

interface BeefwebItem {
    columns: Array<string>
}

type AlbumId = string;

class Track {
    get index(): number | null {
        return this._index;
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
    private tracks: Array<Track>;

    constructor() {
        this.tracks = [];
    }

    addTrack(track: Track) {
        this.tracks.push(track);
    }

    name() {
        return this.tracks[0].album();
    }

    artUrl() {
        return this.tracks[0].artUrl();
    }

    albumId() {
        return this.tracks[0].albumId();
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

    if (library) {
        return <ul>
            {Object.values(library.albums).map(album => FoobarAlbum({album}))}
        </ul>
    } else {
        return <span>Loading...</span>
    }
}

function FoobarAlbum({album}: {album: Album}) {
    return <li key={album.albumId()}>
        <img src={album.artUrl()}/>
        <h2>{album.name()}</h2>
    </li>
}