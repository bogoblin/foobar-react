import {$api, PlayerState, PlayerTime, playerTimeFromMilliseconds, UpdateEventSource} from "./beefweb.ts";
import {useCallback, useEffect, useRef, useState} from "react";
import './playbackControls.css';

const stream = new UpdateEventSource();

export function PlaybackControls() {
    const [playerState, setPlayerState] = useState(stream.playerState);
    stream.setPlayerStateUpdateHook(setPlayerState);

    const play = $api.useMutation("post", "/player/play");
    const pause = $api.useMutation("post", "/player/pause");
    const previous = $api.useMutation("post", "/player/previous");
    const next = $api.useMutation("post", "/player/next");

    const playbackState = playerState?.playbackState || "stopped";

    return <div style={{
        display: "grid",
        gridTemplateColumns: "1fr",
        gridTemplateRows: "repeat(3, auto)",
        padding: "10px",
        boxShadow: "rgba(0,0,0,50%) 0 -10px 10px",
        zIndex: 1000
    }}>
        <div style={{}}>
            <div id={"current-title"}>{playerState?.currentTrack?.getColumn("%title%")}</div>
            <div id={"current-artist"}>{playerState?.currentTrack?.getColumn("%artist%")}</div>
            <a href={'#'+playerState?.currentTrack?.albumId()} id={"current-album"}>{playerState?.currentTrack?.getColumn("%album%")}</a>
        </div>
        <div style={{}}>
            <Playhead playerState={playerState}/>
        </div>
        <div id={"playback-controls-buttons"} style={{textAlign: "center", fontSize: "xx-large"}}>
            <a onClick={() => previous.mutate({})}>⏮️</a>
            {
                playbackState === "playing"
                    ? <a onClick={() => pause.mutate({})}>⏸️</a>
                    : <a onClick={() => play.mutate({})}>▶️</a>
            }
            <a onClick={() => next.mutate({})}>⏭️</a>
        </div>
    </div>;
}

function Playhead({playerState}: { playerState: PlayerState | undefined }) {
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

    const scrub = $api.useMutation("post", "/player");

    if (position && duration) {
        return <form style={{display: "flex", flexDirection: "row"}}>
            <input type={"range"} id={"playhead"}
                   min={0} max={duration.milliseconds}
                   value={position.milliseconds}
                   onChange={(e) => {
                       if (playerState?.playerState.activeItem) {
                           playerState.playerState.activeItem.position = ( parseInt(e.target.value) || 0 ) / 1000;
                           scrub.mutate({
                               body: playerState.playerState.activeItem
                           });
                       }
                   }}
            />
            <div>{`${position.display} / ${duration.display}`}</div>
        </form>;
    } else {
        return "Nothing playing";
    }
}