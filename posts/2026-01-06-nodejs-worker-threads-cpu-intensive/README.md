# How to Use Worker Threads in Node.js for CPU-Intensive Tasks

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, Performance, Scaling, DevOps

Description: Learn to use Node.js worker threads for parallel processing of CPU-intensive tasks without blocking the event loop, including thread pools and real-world patterns.

---

Node.js runs JavaScript in a single thread. This works well for I/O-bound work where most time is spent waiting for network or disk operations. But CPU-intensive tasks - image processing, data parsing, cryptographic operations, or complex calculations - block the event loop and prevent your application from handling other requests.

Worker threads let you offload CPU-intensive work to separate threads, keeping your main thread responsive.

## When to Use Worker Threads

| Use Case | Worker Threads? | Why |
|----------|-----------------|-----|
| Image resizing | Yes | CPU-bound, blocks event loop |
| JSON parsing large files | Yes | CPU-bound for large payloads |
| Database queries | No | I/O-bound, async is sufficient |
| Bcrypt password hashing | Yes | Deliberately CPU-intensive |
| HTTP requests | No | I/O-bound |
| PDF generation | Yes | CPU-bound rendering |
| File streaming | No | I/O-bound |
| Video transcoding | Yes | Very CPU-intensive |

## Basic Worker Thread Usage

### Creating a Worker

**main.js:**

```javascript
const { Worker } = require('worker_threads');

function runWorker(data) {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./worker.js', {
      workerData: data,
    });

    worker.on('message', resolve);
    worker.on('error', reject);
    worker.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });
  });
}

// Usage
async function main() {
  const result = await runWorker({ numbers: [1, 2, 3, 4, 5] });
  console.log('Result:', result);
}

main();
```

**worker.js:**

```javascript
const { parentPort, workerData } = require('worker_threads');

// Do CPU-intensive work
function computeSum(numbers) {
  return numbers.reduce((sum, n) => sum + n, 0);
}

const result = computeSum(workerData.numbers);

// Send result back to main thread
parentPort.postMessage(result);
```

### Inline Workers

For simpler cases, you can define the worker inline:

```javascript
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

if (isMainThread) {
  // Main thread code
  const worker = new Worker(__filename, {
    workerData: { input: 'process this' },
  });

  worker.on('message', (result) => {
    console.log('Result:', result);
  });
} else {
  // Worker thread code
  const result = heavyComputation(workerData.input);
  parentPort.postMessage(result);
}
```

## Building a Worker Thread Pool

Creating a new worker for every task is expensive. A thread pool reuses workers:

```javascript
const { Worker } = require('worker_threads');
const os = require('os');

class WorkerPool {
  constructor(workerPath, poolSize = os.cpus().length) {
    this.workerPath = workerPath;
    this.poolSize = poolSize;
    this.workers = [];
    this.freeWorkers = [];
    this.taskQueue = [];

    this.init();
  }

  init() {
    for (let i = 0; i < this.poolSize; i++) {
      this.addWorker();
    }
  }

  addWorker() {
    const worker = new Worker(this.workerPath);

    worker.on('message', (result) => {
      // Get the callback for this task
      const callback = worker.currentCallback;
      worker.currentCallback = null;

      // Return worker to pool
      this.freeWorkers.push(worker);

      // Process next queued task if any
      this.processQueue();

      // Resolve the promise
      callback.resolve(result);
    });

    worker.on('error', (error) => {
      const callback = worker.currentCallback;
      if (callback) {
        callback.reject(error);
      }

      // Remove failed worker and create new one
      this.workers = this.workers.filter(w => w !== worker);
      this.addWorker();
    });

    this.workers.push(worker);
    this.freeWorkers.push(worker);
  }

  exec(data) {
    return new Promise((resolve, reject) => {
      const task = { data, resolve, reject };

      if (this.freeWorkers.length > 0) {
        this.runTask(task);
      } else {
        this.taskQueue.push(task);
      }
    });
  }

  runTask(task) {
    const worker = this.freeWorkers.pop();
    worker.currentCallback = task;
    worker.postMessage(task.data);
  }

  processQueue() {
    if (this.taskQueue.length > 0 && this.freeWorkers.length > 0) {
      const task = this.taskQueue.shift();
      this.runTask(task);
    }
  }

  async destroy() {
    for (const worker of this.workers) {
      await worker.terminate();
    }
    this.workers = [];
    this.freeWorkers = [];
  }
}

// Usage
const pool = new WorkerPool('./compute-worker.js', 4);

async function processItems(items) {
  const results = await Promise.all(
    items.map(item => pool.exec(item))
  );
  return results;
}
```

## Real-World Examples

### Image Processing with Sharp

**image-worker.js:**

```javascript
const { parentPort } = require('worker_threads');
const sharp = require('sharp');

parentPort.on('message', async ({ inputPath, outputPath, options }) => {
  try {
    await sharp(inputPath)
      .resize(options.width, options.height, {
        fit: options.fit || 'cover',
      })
      .jpeg({ quality: options.quality || 80 })
      .toFile(outputPath);

    parentPort.postMessage({ success: true, outputPath });
  } catch (error) {
    parentPort.postMessage({ success: false, error: error.message });
  }
});
```

**main.js:**

```javascript
const { Worker } = require('worker_threads');
const os = require('os');

class ImageProcessor {
  constructor() {
    this.workers = [];
    this.taskQueue = [];
    this.freeWorkers = [];

    const workerCount = Math.max(1, os.cpus().length - 1);
    for (let i = 0; i < workerCount; i++) {
      this.createWorker();
    }
  }

  createWorker() {
    const worker = new Worker('./image-worker.js');

    worker.on('message', (result) => {
      const { resolve, reject } = worker.currentTask;
      worker.currentTask = null;
      this.freeWorkers.push(worker);
      this.processQueue();

      if (result.success) {
        resolve(result);
      } else {
        reject(new Error(result.error));
      }
    });

    this.workers.push(worker);
    this.freeWorkers.push(worker);
  }

  processQueue() {
    while (this.taskQueue.length > 0 && this.freeWorkers.length > 0) {
      const task = this.taskQueue.shift();
      const worker = this.freeWorkers.pop();
      worker.currentTask = task;
      worker.postMessage(task.data);
    }
  }

  resize(inputPath, outputPath, options) {
    return new Promise((resolve, reject) => {
      const task = {
        data: { inputPath, outputPath, options },
        resolve,
        reject,
      };

      if (this.freeWorkers.length > 0) {
        const worker = this.freeWorkers.pop();
        worker.currentTask = task;
        worker.postMessage(task.data);
      } else {
        this.taskQueue.push(task);
      }
    });
  }
}

// Express integration
const express = require('express');
const app = express();
const processor = new ImageProcessor();

app.post('/resize', async (req, res) => {
  try {
    const result = await processor.resize(
      req.body.inputPath,
      req.body.outputPath,
      { width: 800, height: 600 }
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### CPU-Intensive Data Processing

**data-worker.js:**

```javascript
const { parentPort, workerData } = require('worker_threads');

// Heavy computation example: Processing large JSON
function processLargeDataset(data) {
  const results = [];

  for (const item of data) {
    // Simulate complex processing
    const processed = {
      id: item.id,
      computed: complexCalculation(item.values),
      aggregates: computeAggregates(item.metrics),
      transformed: transformData(item.raw),
    };
    results.push(processed);
  }

  return results;
}

function complexCalculation(values) {
  // CPU-intensive calculation
  return values.reduce((acc, val) => {
    return acc + Math.sqrt(val) * Math.log(val + 1);
  }, 0);
}

function computeAggregates(metrics) {
  const sorted = [...metrics].sort((a, b) => a - b);
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    median: sorted[Math.floor(sorted.length / 2)],
    mean: metrics.reduce((a, b) => a + b, 0) / metrics.length,
  };
}

function transformData(raw) {
  return JSON.parse(JSON.stringify(raw)); // Deep clone as example
}

// Process data received from main thread
parentPort.on('message', (chunk) => {
  const result = processLargeDataset(chunk);
  parentPort.postMessage(result);
});
```

### Password Hashing with Worker Threads

```javascript
// hash-worker.js
const { parentPort } = require('worker_threads');
const bcrypt = require('bcrypt');

parentPort.on('message', async ({ action, password, hash }) => {
  try {
    if (action === 'hash') {
      const hashedPassword = await bcrypt.hash(password, 12);
      parentPort.postMessage({ success: true, hash: hashedPassword });
    } else if (action === 'compare') {
      const match = await bcrypt.compare(password, hash);
      parentPort.postMessage({ success: true, match });
    }
  } catch (error) {
    parentPort.postMessage({ success: false, error: error.message });
  }
});

// auth-service.js
const { Worker } = require('worker_threads');

class AuthService {
  constructor() {
    this.worker = new Worker('./hash-worker.js');
    this.pending = new Map();
    this.requestId = 0;

    this.worker.on('message', (result) => {
      const { resolve, reject } = this.pending.get(result.id);
      this.pending.delete(result.id);

      if (result.success) {
        resolve(result);
      } else {
        reject(new Error(result.error));
      }
    });
  }

  async hashPassword(password) {
    return this.sendRequest({ action: 'hash', password });
  }

  async verifyPassword(password, hash) {
    const result = await this.sendRequest({ action: 'compare', password, hash });
    return result.match;
  }

  sendRequest(data) {
    return new Promise((resolve, reject) => {
      const id = this.requestId++;
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage({ ...data, id });
    });
  }
}

module.exports = new AuthService();
```

## Sharing Data Between Threads

### SharedArrayBuffer for Zero-Copy Sharing

```javascript
const { Worker, isMainThread } = require('worker_threads');

if (isMainThread) {
  // Create shared memory
  const sharedBuffer = new SharedArrayBuffer(1024 * 1024); // 1MB
  const sharedArray = new Int32Array(sharedBuffer);

  // Initialize data
  for (let i = 0; i < 1000; i++) {
    sharedArray[i] = i;
  }

  const worker = new Worker(__filename, {
    workerData: { sharedBuffer },
  });

  worker.on('message', () => {
    console.log('First 10 values after worker processing:');
    console.log(Array.from(sharedArray.slice(0, 10)));
  });
} else {
  const { workerData, parentPort } = require('worker_threads');
  const sharedArray = new Int32Array(workerData.sharedBuffer);

  // Modify shared data (visible to main thread)
  for (let i = 0; i < sharedArray.length; i++) {
    sharedArray[i] *= 2;
  }

  parentPort.postMessage('done');
}
```

### Atomics for Thread-Safe Operations

```javascript
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

if (isMainThread) {
  const sharedBuffer = new SharedArrayBuffer(4);
  const counter = new Int32Array(sharedBuffer);

  // Create multiple workers
  const workers = [];
  for (let i = 0; i < 4; i++) {
    workers.push(new Worker(__filename, {
      workerData: { sharedBuffer },
    }));
  }

  Promise.all(workers.map(w => new Promise(r => w.on('exit', r))))
    .then(() => {
      console.log('Final counter value:', counter[0]);
      // Will be 40000 (4 workers * 10000 increments each)
    });
} else {
  const counter = new Int32Array(workerData.sharedBuffer);

  // Thread-safe increment
  for (let i = 0; i < 10000; i++) {
    Atomics.add(counter, 0, 1);
  }

  process.exit(0);
}
```

## Best Practices

### 1. Right-Size Your Thread Pool

```javascript
const os = require('os');

// Leave one core for the main thread
const POOL_SIZE = Math.max(1, os.cpus().length - 1);

// For mixed workloads, consider I/O wait time
const IO_HEAVY_POOL_SIZE = os.cpus().length * 2;
```

### 2. Avoid Transferring Large Data

```javascript
// BAD: Copying large buffer
worker.postMessage({ data: largeBuffer });

// GOOD: Transfer ownership (zero-copy)
worker.postMessage({ data: largeBuffer }, [largeBuffer.buffer]);

// After transfer, largeBuffer is empty in main thread
console.log(largeBuffer.length); // 0
```

### 3. Handle Worker Crashes Gracefully

```javascript
class ResilientWorkerPool {
  createWorker() {
    const worker = new Worker(this.workerPath);

    worker.on('error', (error) => {
      console.error('Worker error:', error);
      this.handleWorkerFailure(worker);
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        console.error(`Worker exited with code ${code}`);
        this.handleWorkerFailure(worker);
      }
    });

    return worker;
  }

  handleWorkerFailure(failedWorker) {
    // Remove from pools
    this.workers = this.workers.filter(w => w !== failedWorker);
    this.freeWorkers = this.freeWorkers.filter(w => w !== failedWorker);

    // Reject pending task if any
    if (failedWorker.currentTask) {
      failedWorker.currentTask.reject(new Error('Worker crashed'));
    }

    // Create replacement worker
    const newWorker = this.createWorker();
    this.workers.push(newWorker);
    this.freeWorkers.push(newWorker);

    // Process queued tasks
    this.processQueue();
  }
}
```

### 4. Implement Timeouts

```javascript
async exec(data, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Worker task timed out'));
      // Optionally terminate and replace the worker
    }, timeoutMs);

    const task = {
      data,
      resolve: (result) => {
        clearTimeout(timeoutId);
        resolve(result);
      },
      reject: (error) => {
        clearTimeout(timeoutId);
        reject(error);
      },
    };

    this.taskQueue.push(task);
    this.processQueue();
  });
}
```

## When Not to Use Worker Threads

Worker threads add complexity. Avoid them when:

1. **Tasks are I/O-bound**: Use async/await instead
2. **Tasks are quick**: Worker overhead exceeds benefit for tasks < 10ms
3. **You need simple parallelism**: `Promise.all()` with async functions is simpler
4. **Memory is constrained**: Each worker uses ~10MB additional memory

## Summary

| Aspect | Recommendation |
|--------|----------------|
| **Pool Size** | `os.cpus().length - 1` |
| **Data Transfer** | Use `transferList` for large buffers |
| **Shared State** | Use SharedArrayBuffer + Atomics |
| **Error Handling** | Implement worker replacement on crash |
| **Timeouts** | Always implement task timeouts |
| **Use Case** | CPU-bound tasks > 10ms |

Worker threads unlock Node.js's full potential for CPU-intensive workloads. By keeping heavy computation off the main thread, your application stays responsive to incoming requests while maximizing CPU utilization across all available cores.
