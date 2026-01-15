import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import './prism-theme.css';
import 'react-diff-view/style/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
