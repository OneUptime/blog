# How to Use Nodemon for Development in Node.js

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, Nodemon, Development, Productivity, Tools

Description: Learn how to use Nodemon for automatic server restart during development in Node.js with configuration options and best practices.

---

Nodemon is a utility that monitors your Node.js application for changes and automatically restarts the server. It eliminates the need to manually stop and restart your application during development.

## Installation

```bash
# Global installation
npm install -g nodemon

# Local development dependency (recommended)
npm install --save-dev nodemon
```

## Basic Usage

### Command Line

```bash
# Run with nodemon
nodemon app.js

# With arguments
nodemon app.js -- --port 3000

# Specify entry file
nodemon server.js

# Run with specific Node version features
nodemon --exec "node --inspect" app.js
```

### Package.json Scripts

```json
{
  "scripts": {
    "start": "node app.js",
    "dev": "nodemon app.js",
    "debug": "nodemon --inspect app.js"
  }
}
```

```bash
npm run dev
```

## Configuration

### nodemon.json

Create a `nodemon.json` file in your project root:

```json
{
  "watch": ["src"],
  "ext": "js,json,ts",
  "ignore": ["src/**/*.test.js", "node_modules"],
  "exec": "node src/server.js",
  "env": {
    "NODE_ENV": "development"
  },
  "delay": "2500"
}
```

### Configuration in package.json

```json
{
  "name": "my-app",
  "scripts": {
    "dev": "nodemon"
  },
  "nodemonConfig": {
    "watch": ["src"],
    "ext": "js,json",
    "ignore": ["*.test.js"],
    "exec": "node src/server.js"
  }
}
```

### Configuration Options

| Option | Description |
|--------|-------------|
| `watch` | Paths to watch for changes |
| `ext` | File extensions to watch |
| `ignore` | Paths/patterns to ignore |
| `exec` | Command to execute |
| `delay` | Delay before restart (ms) |
| `env` | Environment variables |
| `signal` | Signal to restart process |
| `verbose` | Show detailed output |

## Watch Specific Directories

```json
{
  "watch": [
    "src",
    "config",
    "routes"
  ],
  "ext": "js,mjs,json,graphql"
}
```

```bash
# Command line equivalent
nodemon --watch src --watch config --ext js,json app.js
```

## Ignore Files and Directories

```json
{
  "ignore": [
    "*.test.js",
    "*.spec.js",
    "node_modules",
    "public",
    "logs",
    ".git",
    "coverage",
    "*.md"
  ]
}
```

```bash
# Command line
nodemon --ignore "*.test.js" --ignore "node_modules/*" app.js
```

## Using with TypeScript

### With ts-node

```bash
npm install --save-dev ts-node typescript
```

```json
{
  "watch": ["src"],
  "ext": "ts,json",
  "ignore": ["src/**/*.spec.ts"],
  "exec": "ts-node ./src/index.ts"
}
```

### With tsx (Faster)

```bash
npm install --save-dev tsx
```

```json
{
  "watch": ["src"],
  "ext": "ts,tsx,json",
  "exec": "tsx ./src/index.ts"
}
```

### With swc (Fastest)

```bash
npm install --save-dev @swc/core @swc-node/register
```

```json
{
  "watch": ["src"],
  "ext": "ts,json",
  "exec": "node -r @swc-node/register ./src/index.ts"
}
```

## Debugging with Nodemon

### Node Inspector

```json
{
  "exec": "node --inspect src/server.js"
}
```

```bash
nodemon --inspect app.js
```

### VS Code Integration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "attach",
      "name": "Attach to Nodemon",
      "port": 9229,
      "restart": true,
      "skipFiles": ["<node_internals>/**"]
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug with Nodemon",
      "runtimeExecutable": "nodemon",
      "program": "${workspaceFolder}/src/server.js",
      "restart": true,
      "console": "integratedTerminal"
    }
  ]
}
```

## Environment Variables

### In nodemon.json

```json
{
  "env": {
    "NODE_ENV": "development",
    "DEBUG": "app:*",
    "PORT": "3000"
  }
}
```

### With .env Files

```bash
npm install dotenv
```

```json
{
  "exec": "node -r dotenv/config src/server.js"
}
```

### Different Environments

```json
{
  "scripts": {
    "dev": "NODE_ENV=development nodemon",
    "dev:debug": "NODE_ENV=development nodemon --inspect"
  }
}
```

## Event Hooks

### Running Commands on Events

```json
{
  "events": {
    "start": "echo 'Starting...'",
    "restart": "echo 'Restarting...'",
    "crash": "echo 'Crashed!'",
    "exit": "echo 'Shutting down...'"
  }
}
```

### Complex Event Scripts

```json
{
  "events": {
    "restart": "osascript -e 'display notification \"Server restarted\" with title \"Nodemon\"'"
  }
}
```

## Graceful Shutdown

```javascript
// server.js
const express = require('express');
const app = express();

const server = app.listen(3000, () => {
  console.log('Server running on port 3000');
});

// Handle graceful shutdown
process.once('SIGUSR2', () => {
  console.log('Received SIGUSR2, shutting down gracefully...');
  
  server.close(() => {
    console.log('Server closed');
    process.kill(process.pid, 'SIGUSR2');
  });
});

process.on('SIGINT', () => {
  console.log('Received SIGINT');
  server.close(() => {
    process.exit(0);
  });
});
```

```json
{
  "signal": "SIGUSR2"
}
```

## Delay Restart

Useful when watching files that change in batches:

```json
{
  "delay": "2500"
}
```

```bash
nodemon --delay 2.5 app.js
```

## Running Non-Node Scripts

### Python

```json
{
  "execMap": {
    "py": "python"
  },
  "watch": ["src"],
  "ext": "py"
}
```

```bash
nodemon script.py
```

### Custom Executables

```json
{
  "execMap": {
    "js": "node --harmony",
    "ts": "ts-node",
    "rb": "ruby"
  }
}
```

## Complete Configuration Example

```json
{
  "restartable": "rs",
  "ignore": [
    ".git",
    "node_modules/**/node_modules",
    "*.test.js",
    "*.spec.js",
    "coverage",
    "logs",
    "*.log"
  ],
  "watch": [
    "src",
    "config"
  ],
  "ext": "js,json,ts",
  "verbose": true,
  "legacyWatch": false,
  "exec": "node",
  "signal": "SIGUSR2",
  "env": {
    "NODE_ENV": "development",
    "DEBUG": "*"
  },
  "delay": "500",
  "events": {
    "start": "echo '\n=== Server starting... ===' ",
    "restart": "echo '\n=== Server restarting... ==='"
  }
}
```

## Common Issues and Solutions

### High CPU Usage

Use polling mode for some file systems:

```json
{
  "legacyWatch": true
}
```

### Watching Too Many Files

```json
{
  "watch": ["src"],
  "ignore": ["**/node_modules/**", "**/.git/**"]
}
```

### Not Detecting Changes

```bash
# Increase watch limit (Linux)
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### Restart Loop

Add delay or ignore problematic files:

```json
{
  "delay": "1000",
  "ignore": ["*.tmp", "*.log"]
}
```

## Alternative: node --watch

Node.js 18+ has built-in watch mode:

```bash
# Built-in watch (Node 18+)
node --watch app.js

# Watch specific paths
node --watch-path=./src --watch-path=./config app.js
```

```json
{
  "scripts": {
    "dev": "node --watch src/server.js"
  }
}
```

### Nodemon vs node --watch

| Feature | Nodemon | node --watch |
|---------|---------|--------------|
| Watch paths | Yes | Yes (Node 18+) |
| Ignore patterns | Yes | Limited |
| Custom executables | Yes | No |
| Event hooks | Yes | No |
| Config file | Yes | No |
| TypeScript | Via exec | No |
| Delay restart | Yes | No |

## Summary

| Command | Description |
|---------|-------------|
| `nodemon app.js` | Start with nodemon |
| `nodemon --watch src` | Watch specific directory |
| `nodemon --ignore tests` | Ignore directory |
| `nodemon --ext js,ts` | Watch specific extensions |
| `nodemon --inspect` | Enable debugging |
| `nodemon --delay 1` | 1 second delay |

| Config Option | Use Case |
|---------------|----------|
| `watch` | Limit watched directories |
| `ignore` | Exclude files/folders |
| `ext` | File extensions to watch |
| `exec` | Custom command |
| `delay` | Debounce restarts |
| `events` | Run scripts on events |

| Best Practice | Description |
|---------------|-------------|
| Local install | Add to devDependencies |
| Config file | Consistent team settings |
| Ignore properly | Avoid watching node_modules |
| Graceful shutdown | Handle SIGUSR2 signal |
