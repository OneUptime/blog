# How to Create Worker Thread Pools in Node.js

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, Worker Threads, Concurrency, Performance

Description: Learn how to create worker thread pools in Node.js for CPU-intensive operations without blocking the event loop.

---

Node.js is famously single-threaded, which works well for I/O-bound tasks but becomes a bottleneck for CPU-intensive operations. The `worker_threads` module, introduced in Node.js v10.5.0, allows you to run JavaScript in parallel threads. Creating a thread pool takes this further by reusing workers efficiently.

## Understanding the Worker Threads Module

The `worker_threads` module provides a way to create threads that execute JavaScript in parallel. Unlike the cluster module, which spawns separate processes, worker threads share memory through `SharedArrayBuffer` and transfer data via message passing.

```javascript
const { Worker, isMainThread, parentPort } = require('worker_threads');

if (isMainThread) {
  const worker = new Worker(__filename);
  worker.on('message', (result) => console.log('Result:', result));
  worker.postMessage({ num: 42 });
} else {
  parentPort.on('message', (data) => {
    const result = heavyComputation(data.num);
    parentPort.postMessage(result);
  });
}
```

## Building a Custom Thread Pool

A thread pool maintains a fixed number of workers and distributes tasks among them. Here is a basic implementation:

```javascript
const { Worker } = require('worker_threads');
const os = require('os');

class ThreadPool {
  constructor(workerScript, poolSize = os.cpus().length) {
    this.workerScript = workerScript;
    this.poolSize = poolSize;
    this.workers = [];
    this.taskQueue = [];
    this.freeWorkers = [];

    this.initializeWorkers();
  }

  initializeWorkers() {
    for (let i = 0; i < this.poolSize; i++) {
      const worker = new Worker(this.workerScript);
      worker.on('message', (result) => this.handleWorkerMessage(worker, result));
      worker.on('error', (err) => this.handleWorkerError(worker, err));
      this.workers.push(worker);
      this.freeWorkers.push(worker);
    }
  }

  handleWorkerMessage(worker, result) {
    const { resolve } = worker.currentTask;
    resolve(result);
    worker.currentTask = null;
    this.freeWorkers.push(worker);
    this.processQueue();
  }

  handleWorkerError(worker, error) {
    const { reject } = worker.currentTask;
    reject(error);
    worker.currentTask = null;
    this.freeWorkers.push(worker);
    this.processQueue();
  }

  runTask(data) {
    return new Promise((resolve, reject) => {
      this.taskQueue.push({ data, resolve, reject });
      this.processQueue();
    });
  }

  processQueue() {
    if (this.taskQueue.length === 0 || this.freeWorkers.length === 0) return;

    const worker = this.freeWorkers.pop();
    const task = this.taskQueue.shift();
    worker.currentTask = task;
    worker.postMessage(task.data);
  }

  async destroy() {
    await Promise.all(this.workers.map((w) => w.terminate()));
  }
}
```

## Task Queuing and Load Balancing

The pool above uses a simple FIFO queue. Tasks are assigned to the first available worker. For more sophisticated scenarios, you can implement priority queues or round-robin distribution:

```javascript
runPriorityTask(data, priority = 0) {
  return new Promise((resolve, reject) => {
    const task = { data, resolve, reject, priority };
    const index = this.taskQueue.findIndex((t) => t.priority < priority);
    if (index === -1) {
      this.taskQueue.push(task);
    } else {
      this.taskQueue.splice(index, 0, task);
    }
    this.processQueue();
  });
}
```

## Inter-Thread Communication

Workers communicate with the main thread using `postMessage` and `on('message')`. For sharing large data efficiently, use `SharedArrayBuffer`:

```javascript
// Main thread
const sharedBuffer = new SharedArrayBuffer(1024);
const sharedArray = new Int32Array(sharedBuffer);
worker.postMessage({ sharedArray });

// Worker thread
parentPort.on('message', ({ sharedArray }) => {
  Atomics.add(sharedArray, 0, 1); // Thread-safe increment
});
```

## Using Poolifier Library

For production use, consider the `poolifier` library, which provides battle-tested thread pool implementations:

```javascript
const { FixedThreadPool, DynamicThreadPool } = require('poolifier');

// Fixed pool with constant number of workers
const fixedPool = new FixedThreadPool(4, './worker.js', {
  errorHandler: (e) => console.error(e),
  onlineHandler: () => console.log('Worker online'),
});

// Dynamic pool that scales based on load
const dynamicPool = new DynamicThreadPool(2, 8, './worker.js');

// Execute tasks
const result = await fixedPool.execute({ task: 'compute', value: 100 });
```

Poolifier handles worker lifecycle, error recovery, and provides both fixed and dynamic pool strategies out of the box.

## Workers vs Cluster: When to Use Each

Use **worker threads** when you need to parallelize CPU-intensive JavaScript computations within a single process, share memory between threads, or process large datasets in parallel.

Use the **cluster module** when you want to scale HTTP servers across multiple CPU cores, need process isolation for stability, or want automatic restart of failed processes.

Worker threads share the same process and memory space, making them more efficient for computation but less isolated. Cluster creates separate processes, providing better fault isolation but higher memory overhead.

## Best Practices

Keep the number of workers close to `os.cpus().length` for CPU-bound tasks. Avoid creating workers dynamically for each task. Transfer large data using `SharedArrayBuffer` or transferable objects. Always handle worker errors and implement graceful shutdown.

Worker thread pools transform Node.js into a capable platform for CPU-intensive workloads while preserving its event-driven architecture for I/O operations.
