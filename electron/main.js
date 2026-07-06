const { app, BrowserWindow, Menu } = require("electron");
const path = require("path");
const { spawn } = require("child_process");

let mainWindow = null;
let serverProcess = null;

const isDev = process.env.NODE_ENV !== "production";
const SERVER_PORT = 3000;

function startServer() {
  return new Promise((resolve, reject) => {
    const serverPath = path.join(__dirname, "server", "index.ts");
    serverProcess = spawn("npx", ["tsx", serverPath], {
      cwd: __dirname,
      env: { ...process.env, PORT: String(SERVER_PORT) },
      stdio: ["pipe", "pipe", "pipe"],
      shell: true,
    });

    serverProcess.stdout.on("data", (data) => {
      const output = data.toString();
      console.log("[Server]", output);
      if (output.includes("TinyMola") || output.includes("API")) {
        resolve();
      }
    });

    serverProcess.stderr.on("data", (data) => {
      console.error("[Server Error]", data.toString());
    });

    serverProcess.on("error", reject);

    // Timeout fallback
    setTimeout(resolve, 5000);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: "TinyMola 代发管理系统",
    icon: path.join(__dirname, "public", "icon.png"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
  });

  // Remove menu bar
  Menu.setApplicationMenu(null);

  if (isDev) {
    mainWindow.loadURL(`http://localhost:5173`);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    const url = `http://localhost:${SERVER_PORT}`;
    mainWindow.loadURL(url);
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  if (!isDev) {
    try {
      await startServer();
      console.log("Server started on port", SERVER_PORT);
    } catch (e) {
      console.error("Failed to start server:", e);
    }
  }

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (serverProcess) {
    serverProcess.kill();
  }
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});
