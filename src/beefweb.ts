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