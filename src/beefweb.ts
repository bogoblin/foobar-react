import {Track} from "./foobarLibrary.tsx";
import createFetchClient from "openapi-fetch";
import createClient from "openapi-react-query";
import {paths} from "./beefwebSchema";

const fetchClient = createFetchClient<paths>({
    baseUrl: "http://localhost:8880/api"
});
export const $api = createClient(fetchClient);

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
    get playerState(): BeefwebPlayer | null {
        return this._playerState;
    }
    private playerStateUpdateHook: ((state: BeefwebPlayer) => void) | undefined;
    private _playerState: BeefwebPlayer | null = null;

    constructor() {
        const es = new EventSource('http://localhost:8880/api/query/updates?player=true&trcolumns=%25artist%25%20-%20%25title%25%2C%25artist%25%20-%20%25album%25%20-%20%25title%25&playlists=true&playlistItems=true&plref=p2&plcolumns=%25artist%25%2C%25album%25%2C%25track%25%2C%25title%25%2C%25length%25&plrange=0%3A100000')
        es.onmessage = (e) => {
            const data = JSON.parse(e.data);
            if (data['player'] && this.playerStateUpdateHook) {
                this.playerStateUpdateHook(data['player']);
            }
        }
    }

    setPlayerStateUpdateHook(hook: (state: BeefwebPlayer) => void) {
        this.playerStateUpdateHook = hook;
    }
}

interface BeefwebPlayer {
    activeItem: {
        duration: number;
        position: number;
        index: number;
        playlistId: string;
        playlistIndex: number;
        columns: Array<string>;
    };
    info: object;
    options: Array<object>;
    playbackMode: number;
    playbackModes: Array<string>;
    volume: object;
}