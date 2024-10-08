import {Track} from "./foobarLibrary.tsx";

export async function play(track: Track) {
    const url = `http://localhost:8880/api/player/play/p2/${track.index}`;
    return fetch(url, {
        method: "POST",
        headers: {
            "Accept": "text/plain"
        }
    });
}

export class UpdateEventSource {
    constructor() {
        const es = new EventSource('http://localhost:8880/api/query/updates?player=true&trcolumns=%25artist%25%20-%20%25title%25%2C%25artist%25%20-%20%25album%25%20-%20%25title%25&playlists=true&playlistItems=true&plref=p2&plcolumns=%25artist%25%2C%25album%25%2C%25track%25%2C%25title%25%2C%25length%25&plrange=0%3A100000')
        es.onmessage = (e) => {
            const data = JSON.parse(e.data);
            console.log(data)
        }
    }
}