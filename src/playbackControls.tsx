import {PlayerState, PlayerTime, playerTimeFromMilliseconds, UpdateEventSource} from "./beefweb.ts";
import {useCallback, useEffect, useRef, useState} from "react";
import './playbackControls.css';

const stream = new UpdateEventSource();

export function PlaybackControls() {
    const [playerState, setPlayerState] = useState(stream.playerState);
    stream.setPlayerStateUpdateHook(setPlayerState);
    return <div>
        <div>{ playerState?.playerState.playbackState }</div>
        <div>{playerState?.activeItem?.columns?.join(' ')}</div>
        <Playhead playerState={playerState}/>
    </div>;
}

function Playhead({playerState}: {playerState: PlayerState | undefined}) {
    const [position, setPosition] = useState<PlayerTime | undefined>(undefined);

    // This stores the handle to requestAnimationFrame so that it can be cancelled:
    const animationRef = useRef(0);

    const updatePlayhead = useCallback(() => {
        if (playerState) setPosition(playerState.position());
        animationRef.current = requestAnimationFrame(updatePlayhead);
    }, [playerState]);

    useEffect(() => {
        animationRef.current = requestAnimationFrame(updatePlayhead);
        return () => cancelAnimationFrame(animationRef.current);
    }, [playerState, updatePlayhead]);

    const duration = playerState
        ? playerState.duration() : playerTimeFromMilliseconds(0);

    if (position && duration) {
        return <form>
            <input type={"range"} id={"playhead"}
                   min={0} max={duration.milliseconds}
                   value={position.milliseconds}
                   onChange={(e) => {
                       // todo
                       // setPosition(parseInt(e.target.value));
                   }}
            />
            <div>{`${position.display} / ${duration.display}`}</div>
        </form>;
    } else {
        return "Nothing playing";
    }
}