import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { ThemeProvider } from './contexts/ThemeContext.jsx'
import { WhopAuthProvider } from './lib/whop-sdk.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <WhopAuthProvider>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </WhopAuthProvider>
  </React.StrictMode>,
)
