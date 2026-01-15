# How to Implement Web Workers in React for CPU-Intensive Tasks

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React, Web Workers, Performance, Multithreading, Optimization, Frontend

Description: Learn how to implement Web Workers in React applications to offload CPU-intensive tasks to background threads, keeping your UI responsive and improving user experience.

---

JavaScript runs on a single thread in the browser. CPU-intensive tasks like data processing, complex calculations, or image manipulation block the main thread, causing the UI to freeze. Web Workers provide a way to run JavaScript in background threads, enabling true parallelism while keeping your React application responsive.

## Understanding Web Workers

Web Workers are a browser API that spawns background threads. These threads run in isolation from the main thread and communicate through message passing. They cannot directly access the DOM but can perform any computation and return results.

### Key Characteristics

| Feature | Description |
|---------|-------------|
| **Separate Thread** | Runs independently of the main thread |
| **No DOM Access** | Cannot manipulate the DOM directly |
| **Message Passing** | Communicates via `postMessage` and `onmessage` |
| **Own Global Scope** | Uses `self` instead of `window` |
| **Memory Isolation** | Data must be serialized for transfer |

## When to Use Web Workers

| Use Case | Web Workers? | Reason |
|----------|--------------|--------|
| Parsing large JSON files | Yes | CPU-bound, blocks UI |
| Image processing/filtering | Yes | Heavy pixel manipulation |
| Data sorting/filtering | Yes | O(n log n) on large datasets |
| Cryptographic operations | Yes | Deliberately CPU-intensive |
| Complex calculations | Yes | Pure computation |
| API calls | No | I/O-bound, use fetch/async |
| DOM manipulation | No | Workers cannot access DOM |

## Basic Web Worker Setup

### Creating a Worker File

**src/workers/heavyCalculation.worker.ts:**

```typescript
// Worker global scope - runs in separate thread

interface WorkerMessage {
  type: 'CALCULATE';
  payload: { numbers: number[]; operation: string };
}

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { type, payload } = event.data;

  if (type === 'CALCULATE') {
    const result = performCalculation(payload);
    self.postMessage({ type: 'RESULT', payload: result });
  }
};

function fibonacci(n: number): number {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

function performCalculation(payload: { numbers: number[]; operation: string }): number[] {
  const { numbers, operation } = payload;
  if (operation === 'fibonacci') {
    return numbers.map(n => fibonacci(n));
  }
  return numbers;
}

export {};
```

### Using the Worker in React

**src/components/Calculator.tsx:**

```typescript
import React, { useState, useEffect, useRef, useCallback } from 'react';

function Calculator(): React.ReactElement {
  const [numbers, setNumbers] = useState<number[]>([35, 36, 37]);
  const [result, setResult] = useState<number[] | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // Create worker instance
    workerRef.current = new Worker(
      new URL('../workers/heavyCalculation.worker.ts', import.meta.url)
    );

    // Handle messages from worker
    workerRef.current.onmessage = (event) => {
      const { type, payload } = event.data;
      if (type === 'RESULT') {
        setResult(payload);
        setIsCalculating(false);
      }
    };

    workerRef.current.onerror = (error) => {
      console.error('Worker error:', error);
      setIsCalculating(false);
    };

    // Cleanup on unmount
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const calculate = useCallback(() => {
    if (!workerRef.current) return;
    setIsCalculating(true);
    workerRef.current.postMessage({
      type: 'CALCULATE',
      payload: { numbers, operation: 'fibonacci' },
    });
  }, [numbers]);

  return (
    <div>
      <button onClick={calculate} disabled={isCalculating}>
        {isCalculating ? 'Calculating...' : 'Calculate'}
      </button>
      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </div>
  );
}

export default Calculator;
```

## Custom useWorker Hook

Create a reusable hook for managing Web Worker lifecycle.

**src/hooks/useWorker.ts:**

```typescript
import { useEffect, useRef, useState, useCallback } from 'react';

interface UseWorkerReturn<T, R> {
  postMessage: (message: T) => void;
  result: R | null;
  error: Error | null;
  isProcessing: boolean;
  terminate: () => void;
}

function useWorker<T = unknown, R = unknown>(
  workerFactory: () => Worker
): UseWorkerReturn<T, R> {
  const [result, setResult] = useState<R | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    workerRef.current = workerFactory();

    workerRef.current.onmessage = (event: MessageEvent) => {
      setResult(event.data as R);
      setIsProcessing(false);
    };

    workerRef.current.onerror = (err: ErrorEvent) => {
      setError(new Error(err.message));
      setIsProcessing(false);
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, [workerFactory]);

  const postMessage = useCallback((message: T) => {
    if (workerRef.current) {
      setIsProcessing(true);
      setError(null);
      workerRef.current.postMessage(message);
    }
  }, []);

  const terminate = useCallback(() => {
    workerRef.current?.terminate();
    setIsProcessing(false);
  }, []);

  return { postMessage, result, error, isProcessing, terminate };
}

export default useWorker;
```

**Usage:**

```typescript
import React, { useMemo } from 'react';
import useWorker from '../hooks/useWorker';

function FibonacciCalculator(): React.ReactElement {
  const workerFactory = useMemo(
    () => () => new Worker(
      new URL('../workers/heavyCalculation.worker.ts', import.meta.url)
    ),
    []
  );

  const { postMessage, result, isProcessing } = useWorker(workerFactory);

  return (
    <div>
      <button
        onClick={() => postMessage({ type: 'CALCULATE', payload: { numbers: [40, 41], operation: 'fibonacci' } })}
        disabled={isProcessing}
      >
        Calculate
      </button>
      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </div>
  );
}
```

## Progress Reporting Pattern

For long-running tasks, report progress to keep users informed.

**src/workers/streamProcessor.worker.ts:**

```typescript
interface ProcessMessage {
  type: 'PROCESS';
  payload: { data: number[]; batchSize: number };
}

self.onmessage = (event: MessageEvent<ProcessMessage>) => {
  const { data, batchSize } = event.data.payload;
  const results: number[] = [];
  const total = data.length;

  for (let i = 0; i < total; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    const batchResults = batch.map(item => heavyComputation(item));
    results.push(...batchResults);

    // Report progress
    self.postMessage({
      type: 'PROGRESS',
      payload: {
        processed: Math.min(i + batchSize, total),
        total,
        percentage: Math.round((Math.min(i + batchSize, total) / total) * 100),
      },
    });
  }

  self.postMessage({ type: 'COMPLETE', payload: { results } });
};

function heavyComputation(value: number): number {
  let result = value;
  for (let i = 0; i < 100000; i++) {
    result = Math.sqrt(result * result + i);
  }
  return result;
}

export {};
```

**React Component with Progress:**

```typescript
import React, { useState, useEffect, useRef } from 'react';

function StreamProcessor(): React.ReactElement {
  const [progress, setProgress] = useState<{ percentage: number } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../workers/streamProcessor.worker.ts', import.meta.url)
    );

    workerRef.current.onmessage = (event) => {
      const { type, payload } = event.data;
      if (type === 'PROGRESS') {
        setProgress(payload);
      } else if (type === 'COMPLETE') {
        setIsProcessing(false);
      }
    };

    return () => workerRef.current?.terminate();
  }, []);

  const startProcessing = () => {
    const data = Array.from({ length: 1000 }, (_, i) => i + 1);
    setIsProcessing(true);
    workerRef.current?.postMessage({ type: 'PROCESS', payload: { data, batchSize: 100 } });
  };

  return (
    <div>
      <button onClick={startProcessing} disabled={isProcessing}>
        {isProcessing ? `Processing... ${progress?.percentage || 0}%` : 'Start'}
      </button>
    </div>
  );
}
```

## Transferable Objects for Large Data

Use transferable objects to avoid expensive copying when passing large ArrayBuffers.

**Image Processing Worker:**

```typescript
interface ProcessImageMessage {
  type: 'PROCESS_IMAGE';
  payload: {
    imageData: ArrayBuffer;
    width: number;
    height: number;
    filter: 'grayscale' | 'invert';
  };
}

self.onmessage = (event: MessageEvent<ProcessImageMessage>) => {
  const { imageData, width, height, filter } = event.data.payload;
  const pixels = new Uint8ClampedArray(imageData);
  const output = new Uint8ClampedArray(pixels.length);

  for (let i = 0; i < pixels.length; i += 4) {
    if (filter === 'grayscale') {
      const gray = pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114;
      output[i] = output[i + 1] = output[i + 2] = gray;
    } else {
      output[i] = 255 - pixels[i];
      output[i + 1] = 255 - pixels[i + 1];
      output[i + 2] = 255 - pixels[i + 2];
    }
    output[i + 3] = pixels[i + 3];
  }

  // Transfer buffer back (zero-copy)
  self.postMessage(
    { type: 'PROCESSED', payload: { imageData: output.buffer, width, height } },
    [output.buffer]
  );
};

export {};
```

**Using Transferables in React:**

```typescript
const applyFilter = useCallback((filter: 'grayscale' | 'invert') => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  // ... draw image to canvas

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // Transfer the buffer (zero-copy) instead of copying
  workerRef.current!.postMessage(
    {
      type: 'PROCESS_IMAGE',
      payload: {
        imageData: imageData.data.buffer,
        width: canvas.width,
        height: canvas.height,
        filter,
      },
    },
    [imageData.data.buffer] // Transfer list
  );
}, []);
```

## Worker Pool Implementation

For processing many tasks concurrently, implement a worker pool.

**src/utils/WorkerPool.ts:**

```typescript
interface Task<T, R> {
  data: T;
  resolve: (result: R) => void;
  reject: (error: Error) => void;
}

class WorkerPool<T = unknown, R = unknown> {
  private workers: Worker[] = [];
  private freeWorkers: Worker[] = [];
  private taskQueue: Task<T, R>[] = [];

  constructor(workerFactory: () => Worker, poolSize: number = navigator.hardwareConcurrency || 4) {
    for (let i = 0; i < poolSize; i++) {
      const worker = workerFactory();

      worker.onmessage = (event) => {
        const task = (worker as any).currentTask;
        if (task) {
          (worker as any).currentTask = null;
          this.freeWorkers.push(worker);
          this.processQueue();
          task.resolve(event.data);
        }
      };

      worker.onerror = (error) => {
        const task = (worker as any).currentTask;
        if (task) {
          task.reject(new Error(error.message));
        }
      };

      this.workers.push(worker);
      this.freeWorkers.push(worker);
    }
  }

  private processQueue(): void {
    while (this.taskQueue.length > 0 && this.freeWorkers.length > 0) {
      const task = this.taskQueue.shift()!;
      const worker = this.freeWorkers.pop()!;
      (worker as any).currentTask = task;
      worker.postMessage(task.data);
    }
  }

  exec(data: T): Promise<R> {
    return new Promise((resolve, reject) => {
      const task = { data, resolve, reject };
      if (this.freeWorkers.length > 0) {
        const worker = this.freeWorkers.pop()!;
        (worker as any).currentTask = task;
        worker.postMessage(data);
      } else {
        this.taskQueue.push(task);
      }
    });
  }

  async execBatch(dataArray: T[]): Promise<R[]> {
    return Promise.all(dataArray.map(data => this.exec(data)));
  }

  terminate(): void {
    this.workers.forEach(w => w.terminate());
  }
}

export default WorkerPool;
```

**Usage with React:**

```typescript
import React, { useState, useEffect, useRef } from 'react';
import WorkerPool from '../utils/WorkerPool';

function ParallelProcessor(): React.ReactElement {
  const [results, setResults] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const poolRef = useRef<WorkerPool | null>(null);

  useEffect(() => {
    poolRef.current = new WorkerPool(
      () => new Worker(new URL('../workers/heavyCalculation.worker.ts', import.meta.url)),
      4
    );
    return () => poolRef.current?.terminate();
  }, []);

  const processItems = async () => {
    setIsProcessing(true);
    const tasks = Array.from({ length: 20 }, (_, i) => ({ id: i, value: 35 + (i % 5) }));
    const results = await poolRef.current!.execBatch(tasks);
    setResults(results);
    setIsProcessing(false);
  };

  return (
    <div>
      <button onClick={processItems} disabled={isProcessing}>
        Process 20 Items in Parallel
      </button>
    </div>
  );
}
```

## Request-Response with Message IDs

For concurrent requests, use message IDs to correlate responses.

```typescript
import { useEffect, useRef, useCallback } from 'react';

function useWorkerWithIds<T, R>(workerFactory: () => Worker) {
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef<Map<string, { resolve: (v: R) => void; reject: (e: Error) => void }>>(new Map());
  const idRef = useRef(0);

  useEffect(() => {
    workerRef.current = workerFactory();

    workerRef.current.onmessage = (event) => {
      const { id, payload, error } = event.data;
      const pending = pendingRef.current.get(id);
      if (pending) {
        pendingRef.current.delete(id);
        error ? pending.reject(new Error(error)) : pending.resolve(payload);
      }
    };

    return () => {
      pendingRef.current.forEach(p => p.reject(new Error('Worker terminated')));
      workerRef.current?.terminate();
    };
  }, [workerFactory]);

  const sendRequest = useCallback((payload: T, timeout = 30000): Promise<R> => {
    return new Promise((resolve, reject) => {
      const id = `msg_${idRef.current++}`;
      const timeoutId = setTimeout(() => {
        pendingRef.current.delete(id);
        reject(new Error('Request timed out'));
      }, timeout);

      pendingRef.current.set(id, {
        resolve: (v) => { clearTimeout(timeoutId); resolve(v); },
        reject: (e) => { clearTimeout(timeoutId); reject(e); },
      });

      workerRef.current?.postMessage({ id, payload });
    });
  }, []);

  return { sendRequest };
}
```

## Best Practices

### Worker Initialization

```typescript
// DO: Initialize in useEffect with cleanup
useEffect(() => {
  const worker = new Worker(new URL('../workers/myWorker.ts', import.meta.url));
  workerRef.current = worker;
  return () => worker.terminate();
}, []);

// DON'T: Create workers on every render
function BadComponent() {
  const worker = new Worker('./worker.js'); // Memory leak!
}
```

### Data Transfer

```typescript
// DO: Use transferable objects for large data
const buffer = new ArrayBuffer(1000000);
worker.postMessage({ data: buffer }, [buffer]);

// DON'T: Copy large data (expensive serialization)
worker.postMessage({ data: largeArray });
```

### Error Handling

```typescript
// DO: Handle all error cases
worker.onmessage = handleMessage;
worker.onerror = handleError;
worker.onmessageerror = handleMessageError;
```

## Common Pitfalls

| Pitfall | Problem | Solution |
|---------|---------|----------|
| **Creating workers on render** | Memory leaks | Use useEffect with cleanup |
| **Not terminating workers** | Resource leaks | Always call terminate() |
| **Large data copies** | Slow message passing | Use transferable objects |
| **No error handling** | Silent failures | Handle onerror events |
| **Too many workers** | Memory exhaustion | Use worker pools |
| **No timeouts** | Stuck tasks | Implement task timeouts |

## Summary Table

| Aspect | Recommendation |
|--------|----------------|
| **Worker Initialization** | Use `useEffect` with cleanup function |
| **Worker Factory** | Use `new URL()` with `import.meta.url` |
| **Message Format** | Use typed interfaces for type safety |
| **Large Data** | Use transferable objects (ArrayBuffer) |
| **Multiple Tasks** | Implement worker pool with task queue |
| **Progress Reporting** | Send periodic updates from worker |
| **Error Handling** | Handle `onerror` and `onmessageerror` |
| **Timeouts** | Implement task-level timeouts |
| **Resource Cleanup** | Always terminate workers on unmount |
| **Pool Size** | Use `navigator.hardwareConcurrency` as baseline |

## Performance Considerations

| Scenario | Approach |
|----------|----------|
| **Single heavy task** | Single dedicated worker |
| **Many small tasks** | Worker pool with queue |
| **Large data processing** | Transferable objects + chunking |
| **Real-time updates** | Streaming with progress callbacks |
| **Task cancellation** | Track task IDs, ignore stale responses |

Web Workers are a powerful tool for keeping React applications responsive during CPU-intensive operations. By offloading heavy computation to background threads, you can process large datasets, perform complex calculations, and manipulate images without blocking the UI. The key is to properly manage worker lifecycle, handle errors gracefully, and use efficient data transfer patterns for optimal performance.
