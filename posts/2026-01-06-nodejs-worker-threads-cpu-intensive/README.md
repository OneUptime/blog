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

The main thread creates a worker, passes data to it, and listens for messages. The worker runs in a separate thread, preventing CPU-intensive operations from blocking the event loop. Communication between threads happens through message passing.

**main.js:**

```javascript
const { Worker } = require('worker_threads');

// Wrapper function that returns a Promise for easier async/await usage
function runWorker(data) {
  return new Promise((resolve, reject) => {
    // Create a new worker thread running worker.js
    // workerData is passed to the worker and accessible via require('worker_threads').workerData
    const worker = new Worker('./worker.js', {
      workerData: data,
    });

    // Handle successful result from worker
    worker.on('message', resolve);

    // Handle errors thrown in the worker
    worker.on('error', reject);

    // Handle worker exit - non-zero exit code indicates failure
    worker.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });
  });
}

// Usage example
async function main() {
  // Run CPU-intensive work in a separate thread
  const result = await runWorker({ numbers: [1, 2, 3, 4, 5] });
  console.log('Result:', result);
}

main();
```

The worker script receives data via `workerData` and sends results back to the main thread using `parentPort.postMessage()`. The worker runs synchronously - it does not have access to the main thread's event loop.

**worker.js:**

```javascript
const { parentPort, workerData } = require('worker_threads');

// CPU-intensive computation that would block the event loop in the main thread
function computeSum(numbers) {
  // This runs in a separate thread, so it won't block incoming HTTP requests
  return numbers.reduce((sum, n) => sum + n, 0);
}

// workerData contains the data passed from the main thread
const result = computeSum(workerData.numbers);

// Send the result back to the main thread
// parentPort is the communication channel to the parent
parentPort.postMessage(result);
```

### Inline Workers

For simpler cases, you can define both the main thread and worker code in the same file. Use `isMainThread` to determine which context is running. This is useful for self-contained scripts but not recommended for complex applications.

```javascript
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

// isMainThread is true when running in the main process, false in workers
if (isMainThread) {
  // === Main thread code ===
  // __filename makes the worker load this same file
  const worker = new Worker(__filename, {
    workerData: { input: 'process this' },
  });

  worker.on('message', (result) => {
    console.log('Result:', result);
  });
} else {
  // === Worker thread code ===
  // This block runs when the file is loaded as a worker
  const result = heavyComputation(workerData.input);
  parentPort.postMessage(result);
}
```

## Building a Worker Thread Pool

Creating a new worker for every task is expensive (~35ms startup time). A thread pool maintains pre-created workers that are reused for multiple tasks. Tasks are queued when all workers are busy and processed as workers become available.

```javascript
const { Worker } = require('worker_threads');
const os = require('os');

class WorkerPool {
  constructor(workerPath, poolSize = os.cpus().length) {
    this.workerPath = workerPath;
    this.poolSize = poolSize;
    this.workers = [];      // All workers in the pool
    this.freeWorkers = [];  // Workers currently available
    this.taskQueue = [];    // Tasks waiting for a worker

    this.init();
  }

  // Create all workers upfront
  init() {
    for (let i = 0; i < this.poolSize; i++) {
      this.addWorker();
    }
  }

  // Create a single worker and set up its event handlers
  addWorker() {
    const worker = new Worker(this.workerPath);

    // Handle completed task
    worker.on('message', (result) => {
      // Get the callback for this task
      const callback = worker.currentCallback;
      worker.currentCallback = null;

      // Return worker to the available pool
      this.freeWorkers.push(worker);

      // Check if there are queued tasks waiting
      this.processQueue();

      // Resolve the promise for the completed task
      callback.resolve(result);
    });

    // Handle worker errors
    worker.on('error', (error) => {
      const callback = worker.currentCallback;
      if (callback) {
        callback.reject(error);
      }

      // Remove failed worker and create a replacement
      this.workers = this.workers.filter(w => w !== worker);
      this.addWorker();
    });

    this.workers.push(worker);
    this.freeWorkers.push(worker);
  }

  // Execute a task, returning a Promise
  exec(data) {
    return new Promise((resolve, reject) => {
      const task = { data, resolve, reject };

      // If a worker is available, run immediately
      if (this.freeWorkers.length > 0) {
        this.runTask(task);
      } else {
        // Otherwise queue the task
        this.taskQueue.push(task);
      }
    });
  }

  // Assign a task to an available worker
  runTask(task) {
    const worker = this.freeWorkers.pop();
    worker.currentCallback = task;  // Store callback for when task completes
    worker.postMessage(task.data);
  }

  // Process next queued task if workers available
  processQueue() {
    if (this.taskQueue.length > 0 && this.freeWorkers.length > 0) {
      const task = this.taskQueue.shift();
      this.runTask(task);
    }
  }

  // Gracefully shut down all workers
  async destroy() {
    for (const worker of this.workers) {
      await worker.terminate();
    }
    this.workers = [];
    this.freeWorkers = [];
  }
}

// Usage - create pool with 4 workers
const pool = new WorkerPool('./compute-worker.js', 4);

// Process multiple items in parallel using the pool
async function processItems(items) {
  const results = await Promise.all(
    items.map(item => pool.exec(item))
  );
  return results;
}
```

## Real-World Examples

### Image Processing with Sharp

Image resizing is CPU-intensive and can block the event loop for hundreds of milliseconds. Offloading to worker threads keeps your API responsive while processing images in parallel.

**image-worker.js:**

```javascript
const { parentPort } = require('worker_threads');
const sharp = require('sharp');

// Listen for image processing requests from the main thread
parentPort.on('message', async ({ inputPath, outputPath, options }) => {
  try {
    // Sharp performs CPU-intensive image processing
    await sharp(inputPath)
      .resize(options.width, options.height, {
        fit: options.fit || 'cover', // How to fit image to dimensions
      })
      .jpeg({ quality: options.quality || 80 }) // Compress output
      .toFile(outputPath);

    // Send success response back to main thread
    parentPort.postMessage({ success: true, outputPath });
  } catch (error) {
    // Send error response - never throw in workers, always message back
    parentPort.postMessage({ success: false, error: error.message });
  }
});
```

This ImageProcessor class manages a pool of image processing workers and integrates with Express. Leave one CPU core free for the main thread to handle incoming requests.

**main.js:**

```javascript
const { Worker } = require('worker_threads');
const os = require('os');

class ImageProcessor {
  constructor() {
    this.workers = [];
    this.taskQueue = [];
    this.freeWorkers = [];

    // Leave one core for the main thread to remain responsive
    const workerCount = Math.max(1, os.cpus().length - 1);
    for (let i = 0; i < workerCount; i++) {
      this.createWorker();
    }
  }

  createWorker() {
    const worker = new Worker('./image-worker.js');

    // Handle completed image processing
    worker.on('message', (result) => {
      const { resolve, reject } = worker.currentTask;
      worker.currentTask = null;

      // Return worker to pool and process next queued task
      this.freeWorkers.push(worker);
      this.processQueue();

      // Resolve or reject based on worker result
      if (result.success) {
        resolve(result);
      } else {
        reject(new Error(result.error));
      }
    });

    this.workers.push(worker);
    this.freeWorkers.push(worker);
  }

  // Assign queued tasks to available workers
  processQueue() {
    while (this.taskQueue.length > 0 && this.freeWorkers.length > 0) {
      const task = this.taskQueue.shift();
      const worker = this.freeWorkers.pop();
      worker.currentTask = task;
      worker.postMessage(task.data);
    }
  }

  // Public API for resizing images
  resize(inputPath, outputPath, options) {
    return new Promise((resolve, reject) => {
      const task = {
        data: { inputPath, outputPath, options },
        resolve,
        reject,
      };

      // Process immediately if worker available, otherwise queue
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

// Express integration - create a single processor instance
const express = require('express');
const app = express();
const processor = new ImageProcessor();

// Image resize endpoint - main thread stays responsive
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

Processing large datasets with complex calculations can block the event loop for seconds. This worker demonstrates parallel data processing with mathematical operations that benefit from multi-threading.

**data-worker.js:**

```javascript
const { parentPort, workerData } = require('worker_threads');

// Heavy computation: Process large dataset with complex transformations
function processLargeDataset(data) {
  const results = [];

  for (const item of data) {
    // Each item requires multiple CPU-intensive operations
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

// CPU-intensive mathematical operations
function complexCalculation(values) {
  // Math operations are single-threaded in the main thread
  // In a worker, they run in parallel with other workers
  return values.reduce((acc, val) => {
    return acc + Math.sqrt(val) * Math.log(val + 1);
  }, 0);
}

// Statistical aggregations - sorting is O(n log n)
function computeAggregates(metrics) {
  const sorted = [...metrics].sort((a, b) => a - b);
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    median: sorted[Math.floor(sorted.length / 2)],
    mean: metrics.reduce((a, b) => a + b, 0) / metrics.length,
  };
}

// Deep clone as example of serialization overhead
function transformData(raw) {
  return JSON.parse(JSON.stringify(raw));
}

// Listen for data chunks from main thread
parentPort.on('message', (chunk) => {
  const result = processLargeDataset(chunk);
  parentPort.postMessage(result);
});
```

### Password Hashing with Worker Threads

Bcrypt is deliberately slow to resist brute-force attacks, but this blocks the event loop. Moving hashing to a worker keeps your authentication endpoints responsive even under load.

```javascript
// hash-worker.js
const { parentPort } = require('worker_threads');
const bcrypt = require('bcrypt');

// Handle both hashing and verification requests
parentPort.on('message', async ({ action, password, hash, id }) => {
  try {
    if (action === 'hash') {
      // Hash with cost factor 12 (~250ms) - runs in worker, not main thread
      const hashedPassword = await bcrypt.hash(password, 12);
      parentPort.postMessage({ success: true, hash: hashedPassword, id });
    } else if (action === 'compare') {
      // Verify password against hash
      const match = await bcrypt.compare(password, hash);
      parentPort.postMessage({ success: true, match, id });
    }
  } catch (error) {
    parentPort.postMessage({ success: false, error: error.message, id });
  }
});

// auth-service.js
const { Worker } = require('worker_threads');

class AuthService {
  constructor() {
    this.worker = new Worker('./hash-worker.js');
    this.pending = new Map();  // Track pending requests by ID
    this.requestId = 0;

    // Route responses back to the correct Promise
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

  // Public API for password hashing
  async hashPassword(password) {
    return this.sendRequest({ action: 'hash', password });
  }

  // Public API for password verification
  async verifyPassword(password, hash) {
    const result = await this.sendRequest({ action: 'compare', password, hash });
    return result.match;
  }

  // Internal: send request to worker with unique ID
  sendRequest(data) {
    return new Promise((resolve, reject) => {
      const id = this.requestId++;
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage({ ...data, id });
    });
  }
}

// Export singleton instance
module.exports = new AuthService();
```

## Sharing Data Between Threads

### SharedArrayBuffer for Zero-Copy Sharing

Normal message passing serializes data (slow for large datasets). SharedArrayBuffer allows threads to access the same memory region directly, eliminating copy overhead. Changes made in one thread are instantly visible in others.

```javascript
const { Worker, isMainThread } = require('worker_threads');

if (isMainThread) {
  // === Main Thread ===
  // Create shared memory region accessible by both threads
  // Unlike regular Arrays, this memory is NOT copied when sent to workers
  const sharedBuffer = new SharedArrayBuffer(1024 * 1024); // 1MB

  // Create a typed array view over the shared memory
  const sharedArray = new Int32Array(sharedBuffer);

  // Initialize data in shared memory
  for (let i = 0; i < 1000; i++) {
    sharedArray[i] = i;
  }

  // Pass shared buffer reference (not a copy!) to worker
  const worker = new Worker(__filename, {
    workerData: { sharedBuffer },
  });

  worker.on('message', () => {
    // Read modified data directly - no deserialization needed
    console.log('First 10 values after worker processing:');
    console.log(Array.from(sharedArray.slice(0, 10)));
  });
} else {
  // === Worker Thread ===
  const { workerData, parentPort } = require('worker_threads');

  // Access the SAME memory region as the main thread
  const sharedArray = new Int32Array(workerData.sharedBuffer);

  // Modify shared data - changes are immediately visible to main thread
  for (let i = 0; i < sharedArray.length; i++) {
    sharedArray[i] *= 2;
  }

  // Signal completion
  parentPort.postMessage('done');
}
```

### Atomics for Thread-Safe Operations

When multiple threads modify shared memory simultaneously, you get race conditions. Atomics provides thread-safe operations that are guaranteed to complete without interruption, ensuring data integrity.

```javascript
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

if (isMainThread) {
  // === Main Thread ===
  // Create minimal shared buffer for a single counter
  const sharedBuffer = new SharedArrayBuffer(4); // 4 bytes = 1 Int32
  const counter = new Int32Array(sharedBuffer);

  // Spawn 4 workers, all incrementing the same counter
  const workers = [];
  for (let i = 0; i < 4; i++) {
    workers.push(new Worker(__filename, {
      workerData: { sharedBuffer },
    }));
  }

  // Wait for all workers to complete
  Promise.all(workers.map(w => new Promise(r => w.on('exit', r))))
    .then(() => {
      console.log('Final counter value:', counter[0]);
      // Will be exactly 40000 (4 workers * 10000 increments each)
      // Without Atomics, result would be unpredictable due to race conditions
    });
} else {
  // === Worker Thread ===
  const counter = new Int32Array(workerData.sharedBuffer);

  // Atomics.add is thread-safe - guaranteed atomic read-modify-write
  // Without Atomics: counter[0]++ would lose increments due to race conditions
  for (let i = 0; i < 10000; i++) {
    Atomics.add(counter, 0, 1); // index 0, add 1
  }

  process.exit(0);
}
```

## Best Practices

### 1. Right-Size Your Thread Pool

Match pool size to your workload type. For pure CPU work, use one fewer than CPU count to leave the main thread responsive. For mixed workloads with I/O waits, you can oversubscribe.

```javascript
const os = require('os');

// Pure CPU work: leave one core for the main thread to handle I/O
const POOL_SIZE = Math.max(1, os.cpus().length - 1);

// Mixed workloads with I/O waits: workers spend time waiting, so oversubscribe
// Factor of 2 works well when workers do ~50% I/O
const IO_HEAVY_POOL_SIZE = os.cpus().length * 2;
```

### 2. Avoid Transferring Large Data

By default, `postMessage` serializes and copies data. For large ArrayBuffers, use the transfer list to move ownership instead - this is zero-copy and much faster.

```javascript
// BAD: Copying large buffer - slow for large data
// Data is serialized, copied to worker, then deserialized
worker.postMessage({ data: largeBuffer });

// GOOD: Transfer ownership (zero-copy) using transfer list
// The buffer is moved, not copied - instant regardless of size
worker.postMessage({ data: largeBuffer }, [largeBuffer.buffer]);

// IMPORTANT: After transfer, the buffer is empty in the sending thread!
// The worker now owns it exclusively
console.log(largeBuffer.length); // 0
```

### 3. Handle Worker Crashes Gracefully

Workers can crash due to uncaught exceptions or out-of-memory errors. A resilient pool detects failures, rejects the pending task, creates a replacement worker, and continues processing.

```javascript
class ResilientWorkerPool {
  createWorker() {
    const worker = new Worker(this.workerPath);

    // Handle uncaught exceptions in worker
    worker.on('error', (error) => {
      console.error('Worker error:', error);
      this.handleWorkerFailure(worker);
    });

    // Handle unexpected worker exit (crash, kill, etc.)
    worker.on('exit', (code) => {
      if (code !== 0) {
        console.error(`Worker exited with code ${code}`);
        this.handleWorkerFailure(worker);
      }
    });

    return worker;
  }

  handleWorkerFailure(failedWorker) {
    // Remove crashed worker from all pools
    this.workers = this.workers.filter(w => w !== failedWorker);
    this.freeWorkers = this.freeWorkers.filter(w => w !== failedWorker);

    // Reject the task that was being processed (if any)
    if (failedWorker.currentTask) {
      failedWorker.currentTask.reject(new Error('Worker crashed'));
    }

    // Create replacement worker to maintain pool size
    const newWorker = this.createWorker();
    this.workers.push(newWorker);
    this.freeWorkers.push(newWorker);

    // Resume processing queued tasks
    this.processQueue();
  }
}
```

### 4. Implement Timeouts

Runaway tasks can block workers indefinitely. Implement timeouts to detect stuck workers, reject the task, and optionally terminate and replace the worker.

```javascript
async exec(data, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    // Set up timeout to detect stuck workers
    const timeoutId = setTimeout(() => {
      reject(new Error('Worker task timed out'));
      // Consider: terminate stuck worker and create replacement
      // this.terminateAndReplace(worker);
    }, timeoutMs);

    // Wrap resolve/reject to clear timeout
    const task = {
      data,
      resolve: (result) => {
        clearTimeout(timeoutId); // Cancel timeout on success
        resolve(result);
      },
      reject: (error) => {
        clearTimeout(timeoutId); // Cancel timeout on error
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
