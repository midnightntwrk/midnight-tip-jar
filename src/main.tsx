import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Augments the global Window type with window.midnight
import '@midnight-ntwrk/dapp-connector-api';
import App from './App';
import './App.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
