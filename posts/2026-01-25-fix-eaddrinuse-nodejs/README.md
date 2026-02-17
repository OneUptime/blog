# How to Fix 'Error: listen EADDRINUSE' in Node.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NodeJS, Debugging, Networking, Troubleshooting, Server

Description: Resolve the EADDRINUSE error when your Node.js server fails to start because the port is already in use, with methods to find and kill blocking processes.

---

You start your Node.js server and get hit with this error:

```
Error: listen EADDRINUSE: address already in use :::3000
```

This means another process is already using port 3000 (or whatever port you specified). Here is how to find what is using the port and fix it.

## Quick Fixes

### Find and Kill the Process

On macOS and Linux:

```bash
# Find what is using port 3000
lsof -i :3000

# Output shows:
# COMMAND   PID    USER   FD   TYPE DEVICE SIZE/OFF NODE NAME
# node    12345   user   21u  IPv6 123456      0t0  TCP *:3000 (LISTEN)

# Kill the process by PID
kill 12345

# If it does not die, force kill
kill -9 12345
```

One-liner to kill whatever is on port 3000:

```bash
lsof -ti :3000 | xargs kill -9
```

On Windows:

```cmd
# Find the process
netstat -ano | findstr :3000

# Output shows:
# TCP    0.0.0.0:3000    0.0.0.0:0    LISTENING    12345

# Kill by PID
taskkill /PID 12345 /F
```

### Use a Different Port

If you cannot kill the process, use another port:

```javascript
const PORT = process.env.PORT || 3001;  // Try 3001 instead
```

Or set it at runtime:

```bash
PORT=3001 node app.js
```

## Understanding the Error

EADDRINUSE happens when:

1. Another instance of your app is already running
2. A different application uses that port
3. A previous Node.js process did not shut down cleanly
4. The port is reserved by the operating system

## Programmatic Solutions

### Handle the Error Gracefully

```javascript
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use`);
        console.log('Please try one of these solutions:');
        console.log(`1. Kill the process: lsof -ti :${PORT} | xargs kill`);
        console.log(`2. Use a different port: PORT=${PORT + 1} node app.js`);
        process.exit(1);
    }
    throw error;
});
```

### Auto-Retry with Next Available Port

```javascript
const express = require('express');
const app = express();

function startServer(port, maxRetries = 10) {
    const server = app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });

    server.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
            if (maxRetries > 0) {
                console.log(`Port ${port} in use, trying ${port + 1}...`);
                startServer(port + 1, maxRetries - 1);
            } else {
                console.error('Could not find an available port');
                process.exit(1);
            }
        } else {
            throw error;
        }
    });
}

const PORT = parseInt(process.env.PORT) || 3000;
startServer(PORT);
```

### Find Available Port Automatically

Use the `portfinder` or `get-port` package:

```bash
npm install get-port
```

```javascript
const express = require('express');
const getPort = require('get-port');

const app = express();

async function startServer() {
    // Prefer port 3000, but find alternative if busy
    const port = await getPort({ port: [3000, 3001, 3002, 4000, 5000] });

    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
}

startServer();
```

Or check availability manually:

```javascript
const net = require('net');

function isPortAvailable(port) {
    return new Promise((resolve) => {
        const server = net.createServer();

        server.once('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                resolve(false);
            }
        });

        server.once('listening', () => {
            server.close();
            resolve(true);
        });

        server.listen(port);
    });
}

async function findAvailablePort(startPort) {
    let port = startPort;
    while (!(await isPortAvailable(port))) {
        port++;
    }
    return port;
}

// Usage
findAvailablePort(3000).then(port => {
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
});
```

## Preventing the Problem

### Graceful Shutdown

Ensure your server closes properly when the process exits:

```javascript
const server = app.listen(PORT);

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
```

### Using Nodemon with Auto-Restart

Nodemon sometimes leaves zombie processes. Configure it properly:

```json
{
  "nodemonConfig": {
    "signal": "SIGTERM",
    "delay": 200
  }
}
```

Or in nodemon.json:

```json
{
  "signal": "SIGTERM",
  "delay": "200"
}
```

### PM2 Process Manager

PM2 handles process management better:

```bash
npm install -g pm2

# Start your app
pm2 start app.js --name myapp

# Restart without port conflicts
pm2 restart myapp

# Stop and release the port
pm2 stop myapp

# List running processes
pm2 list
```

## Development Tools

### VSCode Debug Configuration

When debugging, old debug sessions might hold ports. Stop them properly:

```json
// .vscode/launch.json
{
    "version": "0.2.0",
    "configurations": [
        {
            "type": "node",
            "request": "launch",
            "name": "Debug App",
            "program": "${workspaceFolder}/src/index.js",
            "restart": true,
            "console": "integratedTerminal",
            "killBehavior": "forceful"
        }
    ]
}
```

### Docker Development

When using Docker, port mapping can conflict:

```yaml
# docker-compose.yml
services:
  app:
    build: .
    ports:
      - "3000:3000"  # Host:Container
    # If 3000 is busy, change host port
    # - "3001:3000"
```

Check Docker containers using the port:

```bash
docker ps --filter "publish=3000"
```

## Debugging Checklist

When you hit EADDRINUSE:

1. Check for running Node processes: `ps aux | grep node`
2. Find what is using the port: `lsof -i :3000`
3. Check for Docker containers: `docker ps`
4. Look for background PM2 processes: `pm2 list`
5. Verify no zombie processes from previous crashes

## Platform-Specific Notes

### macOS

Sometimes macOS AirPlay uses port 5000. Check System Preferences > Sharing > AirPlay Receiver.

### Windows

Windows may reserve certain ports. Check reserved ranges:

```cmd
netsh interface ipv4 show excludedportrange protocol=tcp
```

### Linux

Ports below 1024 require root privileges:

```bash
# This fails without sudo
node app.js  # if PORT=80

# Fix: Use port above 1024 or run as root (not recommended)
# Better: Use nginx/iptables to forward 80 to 3000
```

## Summary

EADDRINUSE means something else is using your port. Find and kill the blocking process, use a different port, or implement automatic port finding. For development, use proper process managers and graceful shutdown handlers to prevent zombie processes from holding ports.
