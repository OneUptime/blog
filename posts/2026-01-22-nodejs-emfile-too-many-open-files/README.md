# How to Fix Error: EMFILE: too many open files in Node.js

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, FileSystem, ErrorHandling, Performance, Linux

Description: Learn how to fix the EMFILE too many open files error in Node.js by increasing system limits, using graceful-fs, and implementing proper file handle management.

---

The `EMFILE: too many open files` error occurs when Node.js exceeds the operating system's limit on simultaneously open file descriptors. This commonly happens during bulk file operations, heavy I/O workloads, or socket connections.

## Understanding the Error

```bash
Error: EMFILE: too many open files, open '/path/to/file'
    at Object.openSync (fs.js:476:3)
    at Object.readFileSync (fs.js:377:35)
```

Or with watch operations:

```bash
Error: EMFILE: too many open files, watch '/path/to/directory'
```

## Check Current Limits

### Linux/macOS

```bash
# Check soft limit
ulimit -n

# Check hard limit
ulimit -Hn

# Check system-wide limits
cat /proc/sys/fs/file-max

# Check open files for a process
lsof -p <PID> | wc -l
```

### In Node.js

```javascript
const { constants } = require('os');

// Maximum open files (may not be available)
console.log(process.getMaxListeners());

// Check current file descriptors
const fs = require('fs');
const path = '/proc/self/fd';

if (fs.existsSync(path)) {
  const fds = fs.readdirSync(path);
  console.log('Open file descriptors:', fds.length);
}
```

## Solution 1: Increase System Limits

### Linux (Temporary)

```bash
# Increase for current session
ulimit -n 65535
node app.js
```

### Linux (Permanent)

```bash
# Edit limits.conf
sudo nano /etc/security/limits.conf
```

Add:

```conf
* soft nofile 65535
* hard nofile 65535
root soft nofile 65535
root hard nofile 65535
```

Also edit `/etc/sysctl.conf`:

```conf
fs.file-max = 2097152
```

Apply changes:

```bash
sudo sysctl -p
# Log out and back in, or reboot
```

### macOS (Temporary)

```bash
ulimit -n 65535
node app.js
```

### macOS (Permanent)

```bash
# Create or edit /Library/LaunchDaemons/limit.maxfiles.plist
sudo nano /Library/LaunchDaemons/limit.maxfiles.plist
```

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>Label</key>
    <string>limit.maxfiles</string>
    <key>ProgramArguments</key>
    <array>
      <string>launchctl</string>
      <string>limit</string>
      <string>maxfiles</string>
      <string>65536</string>
      <string>524288</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
  </dict>
</plist>
```

```bash
sudo launchctl load /Library/LaunchDaemons/limit.maxfiles.plist
```

### Docker

```dockerfile
# Dockerfile
FROM node:18

# Increase file limits
RUN echo "* soft nofile 65535" >> /etc/security/limits.conf && \
    echo "* hard nofile 65535" >> /etc/security/limits.conf

CMD ["node", "app.js"]
```

```yaml
# docker-compose.yml
services:
  app:
    build: .
    ulimits:
      nofile:
        soft: 65535
        hard: 65535
```

## Solution 2: Use graceful-fs

graceful-fs queues file operations when limits are reached:

```bash
npm install graceful-fs
```

### Replace fs module

```javascript
// Instead of
const fs = require('fs');

// Use
const fs = require('graceful-fs');

// Or patch globally
const realFs = require('fs');
const gracefulFs = require('graceful-fs');
gracefulFs.gracefulify(realFs);
```

### With Promises

```javascript
const gracefulFs = require('graceful-fs');
const { promisify } = require('util');

const readFile = promisify(gracefulFs.readFile);
const writeFile = promisify(gracefulFs.writeFile);

async function processFiles(files) {
  const results = await Promise.all(
    files.map(file => readFile(file, 'utf8'))
  );
  return results;
}
```

## Solution 3: Limit Concurrency

### Using p-limit

```bash
npm install p-limit
```

```javascript
const pLimit = require('p-limit');
const fs = require('fs').promises;

// Limit to 100 concurrent file operations
const limit = pLimit(100);

async function processFiles(files) {
  const promises = files.map(file =>
    limit(() => fs.readFile(file, 'utf8'))
  );
  
  return Promise.all(promises);
}
```

### Using async-pool

```bash
npm install tiny-async-pool
```

```javascript
const asyncPool = require('tiny-async-pool');
const fs = require('fs').promises;

async function processFiles(files) {
  const results = [];
  
  // Process 50 files concurrently
  for await (const result of asyncPool(50, files, async (file) => {
    return fs.readFile(file, 'utf8');
  })) {
    results.push(result);
  }
  
  return results;
}
```

### Manual Queue

```javascript
const fs = require('fs').promises;

class FileQueue {
  constructor(concurrency = 100) {
    this.concurrency = concurrency;
    this.running = 0;
    this.queue = [];
  }
  
  async add(operation) {
    return new Promise((resolve, reject) => {
      this.queue.push({ operation, resolve, reject });
      this.processQueue();
    });
  }
  
  async processQueue() {
    while (this.running < this.concurrency && this.queue.length > 0) {
      const { operation, resolve, reject } = this.queue.shift();
      this.running++;
      
      try {
        const result = await operation();
        resolve(result);
      } catch (error) {
        reject(error);
      } finally {
        this.running--;
        this.processQueue();
      }
    }
  }
}

// Usage
const queue = new FileQueue(100);

async function readFiles(files) {
  return Promise.all(
    files.map(file => queue.add(() => fs.readFile(file, 'utf8')))
  );
}
```

## Solution 4: Use Streams

Streams use fewer file descriptors for large files:

```javascript
const fs = require('fs');
const { pipeline } = require('stream/promises');

// Instead of loading entire file
// const data = fs.readFileSync('large.json');

// Use streams
async function processLargeFile(input, output) {
  await pipeline(
    fs.createReadStream(input),
    // Transform stream if needed
    fs.createWriteStream(output)
  );
}
```

### Process Files Sequentially

```javascript
const fs = require('fs').promises;

async function processFilesSequentially(files) {
  const results = [];
  
  for (const file of files) {
    const content = await fs.readFile(file, 'utf8');
    results.push(content);
  }
  
  return results;
}
```

## Solution 5: Close File Handles Properly

### Always Close Handles

```javascript
const fs = require('fs');

// Using try/finally
const fd = fs.openSync('file.txt', 'r');
try {
  // Read operations
  const buffer = Buffer.alloc(1024);
  fs.readSync(fd, buffer);
} finally {
  fs.closeSync(fd);
}

// Async version
async function readWithHandle(path) {
  const handle = await fs.promises.open(path, 'r');
  try {
    const content = await handle.readFile('utf8');
    return content;
  } finally {
    await handle.close();
  }
}
```

### Using File Handle API

```javascript
const fs = require('fs').promises;

async function processFile(path) {
  let handle;
  try {
    handle = await fs.open(path, 'r');
    const content = await handle.readFile({ encoding: 'utf8' });
    return content;
  } finally {
    await handle?.close();
  }
}
```

## Solution 6: Handle Watch Limits

```javascript
const chokidar = require('chokidar');

// Use polling for many files
const watcher = chokidar.watch('**/*', {
  usePolling: true,
  interval: 1000,
  
  // Ignore patterns
  ignored: [
    /node_modules/,
    /\.git/,
  ],
  
  // Limit depth
  depth: 5,
});
```

## Debugging File Descriptor Leaks

### Track Open Handles

```javascript
const fs = require('fs');
const originalOpen = fs.open;
const originalClose = fs.close;
const openFiles = new Map();

fs.open = function(path, flags, mode, callback) {
  originalOpen.call(fs, path, flags, mode, (err, fd) => {
    if (!err) {
      openFiles.set(fd, { path, stack: new Error().stack });
    }
    callback(err, fd);
  });
};

fs.close = function(fd, callback) {
  openFiles.delete(fd);
  originalClose.call(fs, fd, callback);
};

// Check for leaks
setInterval(() => {
  console.log('Open files:', openFiles.size);
  if (openFiles.size > 1000) {
    console.log(Array.from(openFiles.values()).slice(0, 10));
  }
}, 5000);
```

### Using why-is-node-running

```bash
npm install why-is-node-running
```

```javascript
const log = require('why-is-node-running');

// After your app should have exited
setTimeout(() => {
  log();  // Logs all active handles
}, 10000);
```

## Best Practices

### Batch Operations

```javascript
const fs = require('fs').promises;
const pLimit = require('p-limit');

const limit = pLimit(100);

async function copyFiles(pairs) {
  return Promise.all(
    pairs.map(([src, dest]) =>
      limit(async () => {
        const content = await fs.readFile(src);
        await fs.writeFile(dest, content);
      })
    )
  );
}
```

### Reusable Connection Pools

```javascript
class FilePool {
  constructor(maxOpen = 100) {
    this.maxOpen = maxOpen;
    this.active = 0;
    this.waiting = [];
  }
  
  async acquire() {
    if (this.active < this.maxOpen) {
      this.active++;
      return;
    }
    
    // Wait for release
    return new Promise(resolve => {
      this.waiting.push(resolve);
    });
  }
  
  release() {
    this.active--;
    
    if (this.waiting.length > 0) {
      this.active++;
      const next = this.waiting.shift();
      next();
    }
  }
  
  async withFile(path, operation) {
    await this.acquire();
    try {
      return await operation(path);
    } finally {
      this.release();
    }
  }
}

// Usage
const pool = new FilePool(100);

async function readFile(path) {
  return pool.withFile(path, async (p) => {
    return fs.promises.readFile(p, 'utf8');
  });
}
```

## Summary

| Solution | Best For |
|----------|----------|
| Increase ulimit | Quick fix, high I/O apps |
| graceful-fs | Drop-in replacement |
| p-limit | Controlled concurrency |
| Streams | Large files |
| Sequential processing | Low resource environments |

Best practices:
- Set appropriate system limits in production
- Use graceful-fs as a safety net
- Limit concurrent file operations
- Always close file handles explicitly
- Use streams for large files
- Monitor open file descriptors in production
