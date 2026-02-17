# How to Fix 'Error: ENOMEM: not enough memory' in Node.js

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, Error, Memory, Performance, Debugging

Description: Learn how to diagnose and fix ENOMEM memory errors in Node.js applications including heap size configuration, memory leaks, and optimization techniques.

---

The ENOMEM error occurs when Node.js runs out of available memory. This can happen due to memory leaks, processing large data sets, or insufficient heap size configuration.

## Understanding ENOMEM

```
FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed - JavaScript heap out of memory

<--- Last few GCs --->
[1:0x5555555e3a00]    42000 ms: Mark-sweep 1983.5 (2090.0) -> 1983.0 (2090.0) MB

<--- JS stacktrace --->
```

## Increase Heap Size

### Via Command Line

```bash
# Increase to 4GB
node --max-old-space-size=4096 app.js

# Increase to 8GB
node --max-old-space-size=8192 app.js
```

### Via Environment Variable

```bash
export NODE_OPTIONS="--max-old-space-size=4096"
node app.js
```

### In package.json

```json
{
  "scripts": {
    "start": "node --max-old-space-size=4096 app.js",
    "build": "node --max-old-space-size=8192 node_modules/.bin/webpack"
  }
}
```

### For Docker

```dockerfile
FROM node:20

ENV NODE_OPTIONS="--max-old-space-size=4096"

WORKDIR /app
COPY . .
RUN npm install
CMD ["node", "app.js"]
```

## Monitor Memory Usage

### Real-Time Monitoring

```javascript
function logMemoryUsage() {
  const used = process.memoryUsage();
  
  console.log({
    rss: `${Math.round(used.rss / 1024 / 1024)} MB`,
    heapTotal: `${Math.round(used.heapTotal / 1024 / 1024)} MB`,
    heapUsed: `${Math.round(used.heapUsed / 1024 / 1024)} MB`,
    external: `${Math.round(used.external / 1024 / 1024)} MB`,
    arrayBuffers: `${Math.round(used.arrayBuffers / 1024 / 1024)} MB`,
  });
}

// Log every 5 seconds
setInterval(logMemoryUsage, 5000);
```

### Memory Metrics Explained

| Metric | Description |
|--------|-------------|
| `rss` | Resident Set Size - total memory allocated |
| `heapTotal` | Total heap allocated by V8 |
| `heapUsed` | Heap actually used |
| `external` | Memory used by C++ objects |
| `arrayBuffers` | Memory for ArrayBuffers |

### Using v8 Module

```javascript
const v8 = require('v8');

function getHeapStats() {
  const stats = v8.getHeapStatistics();
  
  return {
    totalHeapSize: `${Math.round(stats.total_heap_size / 1024 / 1024)} MB`,
    usedHeapSize: `${Math.round(stats.used_heap_size / 1024 / 1024)} MB`,
    heapSizeLimit: `${Math.round(stats.heap_size_limit / 1024 / 1024)} MB`,
    mallocedMemory: `${Math.round(stats.malloced_memory / 1024 / 1024)} MB`,
    peakMallocedMemory: `${Math.round(stats.peak_malloced_memory / 1024 / 1024)} MB`,
  };
}

console.log(getHeapStats());
```

## Common Causes and Fixes

### 1. Processing Large Arrays

**Problem:**

```javascript
// Loading entire file into memory
const data = fs.readFileSync('large-file.json');
const items = JSON.parse(data);  // Millions of items
items.forEach(process);  // Keeps all in memory
```

**Solution: Stream Processing**

```javascript
const fs = require('fs');
const readline = require('readline');

async function processLargeFile(filePath) {
  const fileStream = fs.createReadStream(filePath);
  
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });
  
  for await (const line of rl) {
    // Process one line at a time
    const item = JSON.parse(line);
    await processItem(item);
  }
}
```

### 2. Memory Leaks from Event Listeners

**Problem:**

```javascript
class DataFetcher {
  constructor() {
    // Leak: listeners accumulate
    process.on('message', this.handleMessage);
  }
  
  handleMessage(msg) {
    // Handle message
  }
}

// Creating many instances leaks memory
for (let i = 0; i < 1000; i++) {
  new DataFetcher();
}
```

**Solution:**

```javascript
class DataFetcher {
  constructor() {
    this.handleMessage = this.handleMessage.bind(this);
    process.on('message', this.handleMessage);
  }
  
  handleMessage(msg) {
    // Handle message
  }
  
  destroy() {
    // Clean up listener
    process.removeListener('message', this.handleMessage);
  }
}
```

### 3. Unbounded Caches

**Problem:**

```javascript
const cache = {};

function getData(key) {
  if (!cache[key]) {
    cache[key] = fetchExpensiveData(key);  // Never clears
  }
  return cache[key];
}
```

**Solution: Use LRU Cache**

```javascript
const LRU = require('lru-cache');

const cache = new LRU({
  max: 500,                    // Max items
  maxSize: 50 * 1024 * 1024,   // 50MB max
  sizeCalculation: (value) => {
    return JSON.stringify(value).length;
  },
  ttl: 1000 * 60 * 5,          // 5 minutes
});

function getData(key) {
  let data = cache.get(key);
  if (!data) {
    data = fetchExpensiveData(key);
    cache.set(key, data);
  }
  return data;
}
```

### 4. Accumulating Data in Closures

**Problem:**

```javascript
function createProcessors() {
  const results = [];  // Grows indefinitely
  
  return function process(item) {
    const result = heavyComputation(item);
    results.push(result);  // Memory leak
    return result;
  };
}

const process = createProcessors();
while (true) {
  process(getNextItem());  // results array grows forever
}
```

**Solution:**

```javascript
function createProcessor(maxResults = 1000) {
  const results = [];
  
  return function process(item) {
    const result = heavyComputation(item);
    results.push(result);
    
    // Limit stored results
    if (results.length > maxResults) {
      results.shift();
    }
    
    return result;
  };
}
```

### 5. Large String Concatenation

**Problem:**

```javascript
let html = '';
for (const item of largeArray) {
  html += `<div>${item.name}</div>`;  // Creates new string each time
}
```

**Solution:**

```javascript
// Use array join
const parts = largeArray.map(item => `<div>${item.name}</div>`);
const html = parts.join('');

// Or use streams for very large output
const { Writable } = require('stream');

function generateHTML(items, outputStream) {
  for (const item of items) {
    outputStream.write(`<div>${item.name}</div>`);
  }
}
```

## Stream Large Data

### Reading Large Files

```javascript
const fs = require('fs');
const { Transform } = require('stream');
const { pipeline } = require('stream/promises');

// Process JSON lines file
async function processJSONL(inputPath, outputPath) {
  const transformStream = new Transform({
    objectMode: true,
    transform(chunk, encoding, callback) {
      const line = chunk.toString();
      if (line.trim()) {
        const item = JSON.parse(line);
        const processed = processItem(item);
        callback(null, JSON.stringify(processed) + '\n');
      } else {
        callback();
      }
    },
  });
  
  await pipeline(
    fs.createReadStream(inputPath),
    transformStream,
    fs.createWriteStream(outputPath)
  );
}
```

### Batch Processing

```javascript
async function* batchGenerator(items, batchSize) {
  let batch = [];
  
  for await (const item of items) {
    batch.push(item);
    
    if (batch.length >= batchSize) {
      yield batch;
      batch = [];
    }
  }
  
  if (batch.length > 0) {
    yield batch;
  }
}

async function processBatches(items) {
  for await (const batch of batchGenerator(items, 100)) {
    await Promise.all(batch.map(processItem));
    
    // Force garbage collection between batches if needed
    if (global.gc) {
      global.gc();
    }
  }
}
```

## Memory Profiling

### Heap Snapshot

```javascript
const v8 = require('v8');
const fs = require('fs');

function takeHeapSnapshot() {
  const snapshotFile = `heap-${Date.now()}.heapsnapshot`;
  const snapshotStream = v8.writeHeapSnapshot(snapshotFile);
  console.log(`Heap snapshot written to ${snapshotFile}`);
  return snapshotFile;
}

// Take snapshot when memory is high
setInterval(() => {
  const used = process.memoryUsage().heapUsed;
  const limit = 500 * 1024 * 1024;  // 500MB
  
  if (used > limit) {
    takeHeapSnapshot();
  }
}, 30000);
```

### Using Chrome DevTools

```bash
# Start with inspector
node --inspect app.js

# Open Chrome and navigate to:
# chrome://inspect
```

### Memory Leak Detection

```javascript
// Track object allocations
const objects = new WeakMap();
let objectCount = 0;

function trackObject(obj, label) {
  if (!objects.has(obj)) {
    objects.set(obj, { label, created: Date.now() });
    objectCount++;
  }
}

// Periodic leak check
setInterval(() => {
  const memUsed = process.memoryUsage().heapUsed / 1024 / 1024;
  console.log(`Objects: ${objectCount}, Memory: ${memUsed.toFixed(2)} MB`);
}, 10000);
```

## Automatic Memory Management

### Graceful Degradation

```javascript
const MEMORY_THRESHOLD = 0.85;  // 85% of heap limit

function checkMemoryPressure() {
  const stats = v8.getHeapStatistics();
  const usedRatio = stats.used_heap_size / stats.heap_size_limit;
  
  return usedRatio > MEMORY_THRESHOLD;
}

async function processWithMemoryCheck(items) {
  for (const item of items) {
    if (checkMemoryPressure()) {
      console.warn('Memory pressure detected, pausing...');
      
      // Clear caches
      clearCaches();
      
      // Force GC if available
      if (global.gc) global.gc();
      
      // Wait for memory to free
      await new Promise(r => setTimeout(r, 1000));
    }
    
    await processItem(item);
  }
}
```

### Auto-Restart on OOM

```javascript
// In your process manager (PM2 ecosystem.config.js)
module.exports = {
  apps: [{
    name: 'app',
    script: './app.js',
    max_memory_restart: '1G',  // Restart if memory exceeds 1GB
    node_args: '--max-old-space-size=1536',
  }],
};
```

### Memory-Aware Queue Processing

```javascript
class MemoryAwareQueue {
  constructor(options = {}) {
    this.maxMemoryPercent = options.maxMemoryPercent || 0.8;
    this.queue = [];
    this.processing = false;
  }
  
  getMemoryUsage() {
    const stats = v8.getHeapStatistics();
    return stats.used_heap_size / stats.heap_size_limit;
  }
  
  async add(task) {
    this.queue.push(task);
    this.process();
  }
  
  async process() {
    if (this.processing) return;
    this.processing = true;
    
    while (this.queue.length > 0) {
      // Check memory before processing
      if (this.getMemoryUsage() > this.maxMemoryPercent) {
        console.log('Memory pressure, waiting...');
        await new Promise(r => setTimeout(r, 5000));
        continue;
      }
      
      const task = this.queue.shift();
      await task();
    }
    
    this.processing = false;
  }
}
```

## Summary

| Solution | When to Use |
|----------|-------------|
| Increase heap size | Known large memory needs |
| Stream processing | Large files or datasets |
| LRU cache | Unbounded cache growth |
| Batch processing | Processing many items |
| Memory profiling | Finding memory leaks |

| Command | Effect |
|---------|--------|
| `--max-old-space-size=4096` | Set heap to 4GB |
| `--expose-gc` | Enable manual GC |
| `--inspect` | Enable DevTools debugging |
| `--heapsnapshot-signal=SIGUSR2` | Snapshot on signal |

| Memory Issue | Solution |
|--------------|----------|
| Growing arrays | Use streams or batches |
| Event listener leak | Remove listeners on cleanup |
| Cache growth | Use LRU cache with limits |
| String concatenation | Use array.join() |
| Closure leaks | Limit closure scope |
