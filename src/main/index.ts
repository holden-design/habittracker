import { app, BrowserWindow } from 'electron';
import path from 'path';
import isDev from 'electron-is-dev';

let mainWindow: BrowserWindow | null = null;

// Set app name
app.name = 'Personal Systems';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Set window title
  mainWindow.setTitle('Personal Systems');

  // Set Content Security Policy
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'",
          "script-src 'self' https://accounts.google.com https://connect.facebook.net",
          "style-src 'self' 'unsafe-inline' https://accounts.google.com",
          "img-src 'self' data: https://*.googleusercontent.com https://*.fbcdn.net",
          "font-src 'self' data:",
          "connect-src 'self' ws: wss: http://localhost:5000 https://oauth2.googleapis.com https://graph.facebook.com",
          "frame-src https://accounts.google.com https://www.facebook.com",
          "frame-ancestors 'none'",
        ].join('; '),
      },
    });
  });

  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../build/index.html')}`;

  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
