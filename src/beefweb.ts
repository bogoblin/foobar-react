import {LibraryColumns, Track} from "./foobarLibrary.tsx";
import createFetchClient from "openapi-fetch";
import createClient from "openapi-react-query";
import {components, paths} from "./beefwebSchema";

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

export interface PlayerTime {
    milliseconds: number;
    seconds: number;
    display: string;
}

export function playerTimeFromMilliseconds(milliseconds: number) {
    const seconds = Math.floor(milliseconds/1000);
    const display = `${Math.floor(seconds/60)}:${(seconds%60).toLocaleString([], {minimumIntegerDigits: 2})}`;
    return {milliseconds, seconds, display} as PlayerTime;
}

export class PlayerState {
    public playerState: components["schemas"]["PlayerState"];
    private createdAt: DOMHighResTimeStamp;
    public currentTrack: Track | null;

    constructor(playerState: components["schemas"]["PlayerState"]) {
        this.playerState = playerState;
        if (playerState.activeItem) {
            this.currentTrack = new Track("p2", playerState.activeItem.columns || []);
        } else {
            this.currentTrack = null;
        }
        this.createdAt = performance.now();
    }

    public position() {
        if (!this.activeItem) return undefined;

        const playerMilliseconds = (this.activeItem.position || 0)*1000;
        switch (this.playerState.playbackState) {
            case "playing": {
                const millisecondsSince = performance.now() - this.createdAt;
                const milliseconds = playerMilliseconds + millisecondsSince;
                return playerTimeFromMilliseconds(milliseconds);
            }
            case "paused": {
                return playerTimeFromMilliseconds(playerMilliseconds);
            }
            default: return undefined;
        }
    }

    public duration() {
        if (!this.activeItem) return undefined;

        const milliseconds = 1000*(this.activeItem?.duration || 1);
        return playerTimeFromMilliseconds(milliseconds);
    }

    get activeItem() {
        return this.playerState.activeItem;
    }

    get playbackState() {
        return this.playerState?.playbackState || "stopped";
    }
}

export class UpdateEventSource {
    private playerStateUpdateHook: ((state: PlayerState) => void) | undefined;
    public playerState: PlayerState | undefined;

    constructor() {
        const params = new URLSearchParams({
            player: "true",
            trcolumns: LibraryColumns.join(','),
            playlists: "true",
            playlistItems: "true",
            plref: "p2",
            plrange: "0:100000",
            plcolumns: LibraryColumns.join(','),
        }).toString();
        const es = new EventSource(`http://localhost:8880/api/query/updates?${params}`);
        es.onmessage = (e) => {
            const data = JSON.parse(e.data);
            const player = data["player"] as components["schemas"]["PlayerState"];
            if (player && this.playerStateUpdateHook) {
                this.playerState = new PlayerState(player);
                this.playerStateUpdateHook(this.playerState);
            }
        }
    }

    setPlayerStateUpdateHook(hook: (state: PlayerState) => void) {
        this.playerStateUpdateHook = hook;
    }
}