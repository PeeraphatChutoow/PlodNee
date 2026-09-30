import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppProtected from './AppProtected.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppProtected />
  </StrictMode>,
)
