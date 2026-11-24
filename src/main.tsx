import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/index.css'

const syncWindow = window as Window & { __quietlistSyncSecret?: string | null }
const initialPassphrase = syncWindow.__quietlistSyncSecret ?? null
delete syncWindow.__quietlistSyncSecret

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App initialPassphrase={initialPassphrase} /></React.StrictMode>)
