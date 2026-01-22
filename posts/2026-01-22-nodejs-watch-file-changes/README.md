# How to Watch File Changes in Node.js

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, FileSystem, Watch, Development, HotReload

Description: Learn how to watch for file changes in Node.js using fs.watch, fs.watchFile, chokidar, and how to build hot reload functionality for development.

---

Watching files for changes is essential for development tools, build systems, and applications that need to react to file modifications. Node.js provides built-in file watching, but libraries like chokidar offer more reliable cross-platform support.

## Built-in fs.watch()

The fs module includes a `watch` function:

```javascript
const fs = require('fs');

// Watch a file
fs.watch('config.json', (eventType, filename) => {
  console.log(`Event: ${eventType}`);
  console.log(`File: ${filename}`);
});

// Watch a directory
fs.watch('./src', (eventType, filename) => {
  console.log(`${filename} was ${eventType}d`);
});
```

### With Options

```javascript
const fs = require('fs');

const watcher = fs.watch('./src', {
  recursive: true,       // Watch subdirectories (macOS/Windows)
  persistent: true,      // Keep process running
  encoding: 'utf8',      // Filename encoding
}, (eventType, filename) => {
  console.log(`${eventType}: ${filename}`);
});

// Close the watcher
watcher.close();
```

### Event Types

```javascript
const fs = require('fs');

fs.watch('./src', (eventType, filename) => {
  switch (eventType) {
    case 'rename':
      // File created, deleted, or renamed
      console.log(`File renamed/created/deleted: ${filename}`);
      break;
    case 'change':
      // File contents changed
      console.log(`File modified: ${filename}`);
      break;
  }
});
```

## Built-in fs.watchFile()

Polls the file for changes (more reliable but less efficient):

```javascript
const fs = require('fs');

// Watch a single file
fs.watchFile('config.json', (curr, prev) => {
  console.log('Previous modified time:', prev.mtime);
  console.log('Current modified time:', curr.mtime);
  
  if (curr.mtime !== prev.mtime) {
    console.log('File was modified');
  }
});

// With options
fs.watchFile('config.json', {
  interval: 1000,        // Poll every 1 second
  persistent: true,      // Keep process running
}, (curr, prev) => {
  // Handle change
});

// Stop watching
fs.unwatchFile('config.json');
```

### Detect File Deletion

```javascript
const fs = require('fs');

fs.watchFile('myfile.txt', (curr, prev) => {
  if (curr.nlink === 0) {
    // File was deleted (no more links)
    console.log('File deleted');
    fs.unwatchFile('myfile.txt');
  }
});
```

## Limitations of Built-in Watchers

Built-in watchers have issues:
- `fs.watch` behavior varies by platform
- May not report filename on some systems
- Recursive watching not supported on Linux
- Can emit duplicate events
- Missing events on some editors (atomic saves)

## Using Chokidar (Recommended)

Chokidar provides reliable cross-platform file watching:

```bash
npm install chokidar
```

### Basic Usage

```javascript
const chokidar = require('chokidar');

// Watch a directory
const watcher = chokidar.watch('./src', {
  ignored: /node_modules/,
  persistent: true,
});

// Add event listeners
watcher
  .on('add', path => console.log(`File added: ${path}`))
  .on('change', path => console.log(`File changed: ${path}`))
  .on('unlink', path => console.log(`File removed: ${path}`))
  .on('addDir', path => console.log(`Directory added: ${path}`))
  .on('unlinkDir', path => console.log(`Directory removed: ${path}`))
  .on('error', error => console.error(`Error: ${error}`))
  .on('ready', () => console.log('Initial scan complete'));

// Close watcher
// watcher.close();
```

### Chokidar Options

```javascript
const chokidar = require('chokidar');

const watcher = chokidar.watch(['src/**/*.js', 'config/*.json'], {
  ignored: /(^|[\/\\])\../,  // Ignore dotfiles
  persistent: true,
  
  // Performance options
  usePolling: false,          // Use native events (not polling)
  interval: 100,              // Poll interval if polling
  binaryInterval: 300,        // Poll interval for binary files
  
  // Stability options
  awaitWriteFinish: {
    stabilityThreshold: 200,  // Wait for write to finish
    pollInterval: 100,
  },
  
  // Filtering
  depth: 10,                  // Max depth to traverse
  followSymlinks: true,       // Follow symlinks
  
  // Initial state
  ignoreInitial: true,        // Don't emit 'add' for existing files
  
  // Permissions
  ignorePermissionErrors: false,
});
```

### Watch Specific File Types

```javascript
const chokidar = require('chokidar');

// Watch only JavaScript and TypeScript files
const watcher = chokidar.watch([
  'src/**/*.js',
  'src/**/*.ts',
  '!src/**/*.test.js',  // Exclude tests
], {
  ignored: /node_modules/,
});

watcher.on('change', (path) => {
  console.log(`Changed: ${path}`);
});
```

### Debouncing Changes

```javascript
const chokidar = require('chokidar');

let timeout;

const watcher = chokidar.watch('./src');

watcher.on('change', (path) => {
  clearTimeout(timeout);
  
  timeout = setTimeout(() => {
    console.log(`Rebuilding after change to ${path}`);
    rebuild();
  }, 100);  // Wait 100ms for more changes
});
```

### Batch Processing

```javascript
const chokidar = require('chokidar');

let changedFiles = new Set();
let timeout;

const watcher = chokidar.watch('./src');

watcher.on('change', (path) => {
  changedFiles.add(path);
  
  clearTimeout(timeout);
  timeout = setTimeout(() => {
    console.log('Changed files:', Array.from(changedFiles));
    processChanges(Array.from(changedFiles));
    changedFiles.clear();
  }, 200);
});
```

## Building a Hot Reload System

### Simple Hot Reload Server

```javascript
const chokidar = require('chokidar');
const { fork } = require('child_process');

let server = null;

function startServer() {
  server = fork('./server.js');
  console.log('Server started');
}

function restartServer() {
  if (server) {
    server.kill();
    console.log('Server stopped');
  }
  startServer();
}

// Watch for changes
const watcher = chokidar.watch('./src', {
  ignored: /node_modules/,
  ignoreInitial: true,
});

watcher.on('change', (path) => {
  console.log(`File changed: ${path}`);
  restartServer();
});

// Initial start
startServer();

// Graceful shutdown
process.on('SIGINT', () => {
  watcher.close();
  if (server) server.kill();
  process.exit();
});
```

### Cache Invalidation on Change

```javascript
const chokidar = require('chokidar');
const path = require('path');

// Clear require cache for a module
function clearCache(modulePath) {
  const resolved = require.resolve(modulePath);
  
  // Delete the module
  delete require.cache[resolved];
  
  // Delete modules that require this module
  Object.keys(require.cache).forEach(key => {
    if (require.cache[key].children.some(m => m.id === resolved)) {
      delete require.cache[key];
    }
  });
}

const watcher = chokidar.watch('./src/**/*.js');

watcher.on('change', (filePath) => {
  console.log(`Reloading: ${filePath}`);
  clearCache(path.resolve(filePath));
  
  // Re-require the updated module
  const updated = require(path.resolve(filePath));
});
```

### Live Reload with WebSocket

```javascript
// server.js
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const chokidar = require('chokidar');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Notify clients of changes
function notifyClients() {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send('reload');
    }
  });
}

// Watch files
const watcher = chokidar.watch('./public', {
  ignoreInitial: true,
});

watcher.on('change', () => {
  console.log('File changed, notifying clients');
  notifyClients();
});

server.listen(3000);
```

```html
<!-- Client-side -->
<script>
  const ws = new WebSocket('ws://localhost:3000');
  ws.onmessage = (event) => {
    if (event.data === 'reload') {
      location.reload();
    }
  };
</script>
```

## Watch Configuration Files

```javascript
const chokidar = require('chokidar');
const fs = require('fs').promises;

let config = null;

async function loadConfig() {
  const data = await fs.readFile('config.json', 'utf8');
  config = JSON.parse(data);
  console.log('Config loaded:', config);
  return config;
}

// Initial load
await loadConfig();

// Watch for changes
chokidar.watch('config.json').on('change', async () => {
  console.log('Config file changed, reloading...');
  try {
    await loadConfig();
  } catch (error) {
    console.error('Failed to reload config:', error);
  }
});
```

## File Watching in Tests

```javascript
const chokidar = require('chokidar');

describe('File Watcher', () => {
  let watcher;
  
  beforeEach(() => {
    watcher = chokidar.watch('./test-files', {
      ignoreInitial: true,
    });
  });
  
  afterEach(async () => {
    await watcher.close();
  });
  
  it('should detect file changes', (done) => {
    watcher.on('change', (path) => {
      expect(path).toContain('test.txt');
      done();
    });
    
    // Trigger a change
    fs.writeFileSync('./test-files/test.txt', 'new content');
  });
});
```

## Summary

| Method | Pros | Cons |
|--------|------|------|
| `fs.watch()` | Fast, event-based | Inconsistent across platforms |
| `fs.watchFile()` | Reliable, works everywhere | Uses polling, less efficient |
| Chokidar | Reliable, feature-rich | External dependency |

Best practices:
- Use chokidar for production applications
- Debounce rapid changes to avoid multiple rebuilds
- Ignore node_modules and build directories
- Use `awaitWriteFinish` for editors with atomic saves
- Handle errors gracefully
- Clean up watchers when done
