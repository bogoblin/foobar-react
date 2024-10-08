import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import './index.css'
import {FoobarLibrary} from "./foobarLibrary.tsx";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FoobarLibrary playlistId="p2"/>
  </StrictMode>,
)
