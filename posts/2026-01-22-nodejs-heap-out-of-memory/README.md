# How to Fix FATAL ERROR: CALL_AND_RETRY_LAST Allocation Failed in Node.js

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, Memory, Performance, Debugging, HeapMemory

Description: Learn how to fix the Node.js FATAL ERROR CALL_AND_RETRY_LAST Allocation failed - JavaScript heap out of memory error by increasing heap size and optimizing memory usage.

---

The `FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed - JavaScript heap out of memory` error occurs when Node.js runs out of heap memory. This guide covers how to increase memory limits and optimize memory usage.

## Understanding the Error

```bash
<--- Last few GCs --->
[1234:0x00000000] 12345 ms: Mark-sweep 1396.9 (1425.9) -> 1396.9 (1425.9) MB, 1234.5 / 0.0 ms

<--- JS stacktrace --->
FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed - JavaScript heap out of memory
```

Or in newer Node.js versions:

```bash
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
```

## Increase Heap Memory Limit

### Command Line Flag

```bash
# Increase to 4GB
node --max-old-space-size=4096 app.js

# Increase to 8GB
node --max-old-space-size=8192 app.js
```

### Using NODE_OPTIONS Environment Variable

```bash
# Linux/macOS
export NODE_OPTIONS="--max-old-space-size=4096"
node app.js

# Windows
set NODE_OPTIONS=--max-old-space-size=4096
node app.js
```

### In package.json Scripts

```json
{
  "scripts": {
    "start": "node --max-old-space-size=4096 app.js",
    "build": "node --max-old-space-size=4096 node_modules/.bin/webpack",
    "dev": "NODE_OPTIONS='--max-old-space-size=4096' npm run start"
  }
}
```

### For npm/npx Commands

```bash
# npm scripts
NODE_OPTIONS="--max-old-space-size=4096" npm run build

# npx
NODE_OPTIONS="--max-old-space-size=4096" npx webpack
```

### For TypeScript

```json
{
  "scripts": {
    "build": "node --max-old-space-size=4096 node_modules/typescript/bin/tsc"
  }
}
```

### For Create React App

```json
{
  "scripts": {
    "build": "react-scripts --max-old-space-size=4096 build"
  }
}
```

Or with cross-env:

```bash
npm install cross-env --save-dev
```

```json
{
  "scripts": {
    "build": "cross-env NODE_OPTIONS='--max-old-space-size=4096' react-scripts build"
  }
}
```

## Memory Limits by Default

| Node Version | Default Heap | 32-bit | 64-bit Max |
|--------------|--------------|--------|------------|
| v12-v14 | ~1.5GB | 512MB | ~4GB |
| v15+ | ~2GB | 512MB | System RAM |

Check current memory usage:

```javascript
const v8 = require('v8');

const heapStats = v8.getHeapStatistics();
console.log('Heap size limit:', heapStats.heap_size_limit / 1024 / 1024, 'MB');
console.log('Total heap:', heapStats.total_heap_size / 1024 / 1024, 'MB');
console.log('Used heap:', heapStats.used_heap_size / 1024 / 1024, 'MB');
```

## Monitor Memory Usage

### Runtime Monitoring

```javascript
// Log memory usage periodically
setInterval(() => {
  const used = process.memoryUsage();
  console.log({
    rss: Math.round(used.rss / 1024 / 1024) + ' MB',
    heapTotal: Math.round(used.heapTotal / 1024 / 1024) + ' MB',
    heapUsed: Math.round(used.heapUsed / 1024 / 1024) + ' MB',
    external: Math.round(used.external / 1024 / 1024) + ' MB',
  });
}, 5000);
```

### Memory Leak Detection

```javascript
// Track heap growth
let lastHeapUsed = 0;

setInterval(() => {
  const { heapUsed } = process.memoryUsage();
  const growth = heapUsed - lastHeapUsed;
  
  if (growth > 10 * 1024 * 1024) {  // 10MB growth
    console.warn('Significant heap growth:', growth / 1024 / 1024, 'MB');
  }
  
  lastHeapUsed = heapUsed;
}, 10000);
```

## Common Causes and Solutions

### 1. Large Arrays or Objects

```javascript
// Problem: Loading all data into memory
const allUsers = await User.find({});  // Millions of records

// Solution: Use streaming/batching
const cursor = User.find({}).cursor();
for await (const user of cursor) {
  processUser(user);
}

// Or pagination
async function processInBatches(batchSize = 1000) {
  let skip = 0;
  let batch;
  
  do {
    batch = await User.find({}).skip(skip).limit(batchSize);
    await Promise.all(batch.map(processUser));
    skip += batchSize;
  } while (batch.length === batchSize);
}
```

### 2. String Concatenation in Loops

```javascript
// Problem: Creates many intermediate strings
let result = '';
for (let i = 0; i < 1000000; i++) {
  result += 'data';
}

// Solution: Use array join
const parts = [];
for (let i = 0; i < 1000000; i++) {
  parts.push('data');
}
const result = parts.join('');
```

### 3. Unbounded Caches

```javascript
// Problem: Cache grows indefinitely
const cache = {};

function getData(key) {
  if (!cache[key]) {
    cache[key] = expensiveComputation(key);
  }
  return cache[key];
}

// Solution: Use LRU cache with size limit
const LRU = require('lru-cache');

const cache = new LRU({
  max: 500,  // Maximum 500 items
  maxSize: 100 * 1024 * 1024,  // 100MB max
  sizeCalculation: (value) => JSON.stringify(value).length,
  ttl: 1000 * 60 * 5,  // 5 minute TTL
});
```

### 4. Event Listener Leaks

```javascript
// Problem: Adding listeners without removing
function setupConnection(socket) {
  socket.on('data', handleData);  // Never removed
}

// Solution: Remove listeners
function setupConnection(socket) {
  const handler = (data) => handleData(data);
  socket.on('data', handler);
  
  socket.on('close', () => {
    socket.removeListener('data', handler);
  });
}

// Or use once for single-use listeners
socket.once('data', handleData);
```

### 5. Closures Holding References

```javascript
// Problem: Closure keeps large object alive
function createHandler() {
  const largeData = loadLargeDataset();
  
  return function handler(req, res) {
    // largeData stays in memory even if not used
    res.send('Hello');
  };
}

// Solution: Only capture what you need
function createHandler() {
  const largeData = loadLargeDataset();
  const summary = computeSummary(largeData);
  // largeData can be GC'd
  
  return function handler(req, res) {
    res.json(summary);
  };
}
```

### 6. Large File Processing

```javascript
// Problem: Loading entire file
const data = fs.readFileSync('large-file.json', 'utf8');
const parsed = JSON.parse(data);

// Solution: Use streams
const { createReadStream } = require('fs');
const JSONStream = require('JSONStream');

const stream = createReadStream('large-file.json')
  .pipe(JSONStream.parse('*'));

stream.on('data', (item) => {
  processItem(item);
});
```

## Force Garbage Collection

```bash
# Enable GC exposure
node --expose-gc app.js
```

```javascript
// Manual GC (for debugging only)
if (global.gc) {
  global.gc();
}

// Force GC periodically (development only)
setInterval(() => {
  if (global.gc) {
    global.gc();
    console.log('Manual GC completed');
  }
}, 60000);
```

## Memory Profiling

### Heap Snapshot

```javascript
const v8 = require('v8');
const fs = require('fs');

function takeHeapSnapshot() {
  const snapshotPath = `heap-${Date.now()}.heapsnapshot`;
  const snapshotStream = v8.writeHeapSnapshot(snapshotPath);
  console.log(`Heap snapshot written to ${snapshotStream}`);
}

// Take snapshot when memory is high
setInterval(() => {
  const { heapUsed } = process.memoryUsage();
  if (heapUsed > 1000 * 1024 * 1024) {  // 1GB
    takeHeapSnapshot();
  }
}, 60000);
```

### Using Chrome DevTools

```bash
# Start with inspector
node --inspect app.js
```

1. Open Chrome and go to `chrome://inspect`
2. Click "inspect" on your Node.js process
3. Go to Memory tab
4. Take heap snapshots and compare

## Docker Considerations

```dockerfile
# Ensure container has enough memory
FROM node:18

ENV NODE_OPTIONS="--max-old-space-size=4096"

WORKDIR /app
COPY . .
RUN npm ci
CMD ["node", "app.js"]
```

```yaml
# docker-compose.yml
services:
  app:
    build: .
    deploy:
      resources:
        limits:
          memory: 6G  # Container limit should be higher than heap limit
```

## Webpack and Build Tools

### Webpack

```javascript
// webpack.config.js
module.exports = {
  // Use filesystem caching
  cache: {
    type: 'filesystem',
  },
  // Optimize chunks
  optimization: {
    splitChunks: {
      chunks: 'all',
    },
  },
};
```

```bash
# Build with increased memory
NODE_OPTIONS="--max-old-space-size=8192" npm run build
```

### ESBuild (Faster Alternative)

```bash
npm install esbuild
```

```javascript
// esbuild uses native code, much lower memory
require('esbuild').buildSync({
  entryPoints: ['app.js'],
  bundle: true,
  outfile: 'dist/out.js',
});
```

## Summary

| Solution | When to Use |
|----------|-------------|
| Increase `--max-old-space-size` | Quick fix, system has RAM |
| Streaming/batching | Processing large datasets |
| LRU cache | Unbounded cache growth |
| Remove listeners | Event emitter leaks |
| Use esbuild | Build tool memory issues |
| Heap snapshots | Debug memory leaks |

Best practices:
- Start with conservative memory increases (4GB)
- Profile to find root cause, do not just increase memory
- Use streams for large files
- Implement proper cleanup in event handlers
- Consider alternative tools (esbuild) for build processes
- Monitor memory usage in production
