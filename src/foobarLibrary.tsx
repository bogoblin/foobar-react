import {useEffect, useState} from "react";

class Library {
    private readonly libraryJson: unknown;

    constructor(libraryJson: unknown) {
        this.libraryJson = libraryJson;
    }
    
    totalCount(): number {
        // @ts-expect-error We don't know the type of the response yet ig
        return this.libraryJson['playlistItems']['totalCount'] as number;
    }
}

export function FoobarLibrary({playlistId}: {playlistId: string}) {
    const [library, setLibrary] = useState<Library | null>(null);

    useEffect(() => {
        fetch(`http://localhost:8880/api/query?player=true&playlists=true&playlistItems=true&plref=${playlistId}&plrange=0%3A100000&plcolumns=%25title%25,%25artist%25,%25album%25`)
            .then(response => response.json())
            .then(library => setLibrary(new Library(library)))
    }, [playlistId])

    if (library) {
        return <span>Songs: {library.totalCount()}</span>
    } else {
        return <span>Loading...</span>
    }
}