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
    private readonly columns: Record<string, string>;

    constructor(item: BeefwebItem, columns: Array<string>) {
        this._index = null;
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
}

class Library {
    public tracks: Array<Track>;
    public albums: Map<AlbumId, Album>;

    constructor() {
        this.tracks = [];
        this.albums = new Map();
    }

    addTrack(track: Track) {
        const index = this.tracks.length;
        track.setIndex(index);
        this.tracks.push(track);
        const album = this.albums.get(track.albumId()) || new Album();
        album.addTrack(track);
        this.albums.set(track.albumId(), album);
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
        const track = new Track(item, columns);
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
        return <span>Songs: {library.totalCount()}, Albums: {library.albums.size}</span>
    } else {
        return <span>Loading...</span>
    }
}