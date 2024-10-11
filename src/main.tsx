import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import './index.css'
import {FoobarLibrary} from "./foobarLibrary.tsx";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {PlaybackControls} from "./playbackControls.tsx";

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: false
        }
    }
});

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <FoobarLibrary playlistId="p2"/>
            <PlaybackControls />
        </QueryClientProvider>
    </StrictMode>,
)
