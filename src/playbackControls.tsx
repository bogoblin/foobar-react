import {UpdateEventSource} from "./beefweb.ts";
import {useState} from "react";

const stream = new UpdateEventSource();

export function PlaybackControls() {
    const [playerState, setPlayerState] = useState(stream.playerState);
    stream.setPlayerStateUpdateHook(setPlayerState);
    if (playerState) {
        return <div>
            <div>{playerState?.activeItem.columns.join(' ')}</div>
            <div>{playerState.activeItem.position} / {playerState.activeItem.duration}</div>
        </div>;
    } else {
        return <div></div>
    }
}