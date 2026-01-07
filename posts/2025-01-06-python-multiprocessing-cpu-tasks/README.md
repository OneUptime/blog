# How to Use Python's multiprocessing for CPU-Intensive Tasks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Multiprocessing, Performance, CPU, Parallel Processing, Concurrency

Description: Learn how to use Python's multiprocessing module for CPU-intensive tasks. This guide covers process pools, shared memory, and patterns for parallel processing without blocking your main application.

---

> Python's Global Interpreter Lock (GIL) limits threading for CPU-bound work. The solution? Multiple processes. Each process has its own Python interpreter and GIL, enabling true parallel execution. This guide shows you how to use multiprocessing effectively.

For I/O-bound work, use asyncio. For CPU-bound work, use multiprocessing. Knowing when to use each is key to Python performance.

---

## When to Use Multiprocessing

| Use Case | Best Approach |
|----------|--------------|
| HTTP requests | asyncio |
| Database queries | asyncio |
| File I/O | asyncio or threading |
| Data processing | multiprocessing |
| Image manipulation | multiprocessing |
| ML inference | multiprocessing |
| Number crunching | multiprocessing |

---

## Basic Process Pool

The following example demonstrates how to parallelize a CPU-intensive computation using Python's built-in Pool. By distributing tasks across multiple CPU cores, you can achieve significant speedups compared to sequential execution.

```python
# pool_basic.py
from multiprocessing import Pool, cpu_count
import time

def cpu_intensive_task(n):
    """Example CPU-intensive task that squares numbers"""
    total = 0
    # Perform expensive computation - iterate n times
    for i in range(n):
        total += i ** 2  # Square each number and accumulate
    return total

def main():
    # Create 8 identical tasks, each processing 10 million iterations
    numbers = [10_000_000] * 8  # 8 tasks

    # Sequential execution - processes one task at a time
    start = time.time()
    results_seq = [cpu_intensive_task(n) for n in numbers]
    print(f"Sequential: {time.time() - start:.2f}s")

    # Parallel execution - distributes tasks across all CPU cores
    start = time.time()
    with Pool(processes=cpu_count()) as pool:  # Create pool with one process per CPU
        results_par = pool.map(cpu_intensive_task, numbers)  # Map function to all inputs
    print(f"Parallel: {time.time() - start:.2f}s")

if __name__ == '__main__':
    main()  # Required guard for multiprocessing on Windows
```

---

## ProcessPoolExecutor (Recommended)

The ProcessPoolExecutor from concurrent.futures provides a cleaner, more Pythonic API for parallel processing. It integrates well with async code and provides better error handling through the Future pattern.

```python
# executor_basic.py
from concurrent.futures import ProcessPoolExecutor, as_completed
import time

def process_item(item_id: int) -> dict:
    """Process a single item - runs in separate process"""
    # CPU-intensive processing happens here
    result = heavy_computation(item_id)
    return {"id": item_id, "result": result}

def process_batch(items: list) -> list:
    """Process items in parallel using ProcessPoolExecutor"""
    results = []

    # Context manager ensures proper cleanup of worker processes
    with ProcessPoolExecutor(max_workers=cpu_count()) as executor:
        # Submit all tasks at once - returns Future objects immediately
        futures = {
            executor.submit(process_item, item): item  # Map future to original item
            for item in items
        }

        # Collect results as they complete (not in submission order)
        for future in as_completed(futures):
            item = futures[future]  # Get original item for error context
            try:
                result = future.result()  # Block until this future completes
                results.append(result)
            except Exception as e:
                # Handle per-task errors without stopping other tasks
                print(f"Item {item} failed: {e}")
                results.append({"id": item, "error": str(e)})

    return results

# Usage
items = list(range(100))
results = process_batch(items)
```

### With Timeout

Adding timeouts prevents tasks from running indefinitely and allows you to handle slow or hung operations gracefully. This is essential for production systems where reliability matters.

```python
from concurrent.futures import ProcessPoolExecutor, TimeoutError, as_completed

def process_with_timeout(items: list, timeout: float = 30.0) -> list:
    """Process with per-task timeout to prevent indefinite hangs"""
    results = []

    with ProcessPoolExecutor(max_workers=cpu_count()) as executor:
        # Submit all tasks upfront
        futures = {
            executor.submit(process_item, item): item
            for item in items
        }

        # as_completed with timeout limits total wait time
        for future in as_completed(futures, timeout=timeout):
            item = futures[future]
            try:
                # Per-task timeout ensures no single task blocks too long
                result = future.result(timeout=10)  # Per-task timeout
                results.append(result)
            except TimeoutError:
                print(f"Item {item} timed out")
                future.cancel()  # Attempt to cancel the slow task
            except Exception as e:
                print(f"Item {item} failed: {e}")

    return results
```

---

## Integration with FastAPI

### Non-Blocking CPU Work

When building web APIs, CPU-intensive work can block the event loop and make your server unresponsive. This pattern offloads heavy computation to a process pool while keeping your API responsive to other requests.

```python
# fastapi_multiprocessing.py
from fastapi import FastAPI, BackgroundTasks
from concurrent.futures import ProcessPoolExecutor
import asyncio

app = FastAPI()

# Global executor (created once at startup, reused for all requests)
executor = ProcessPoolExecutor(max_workers=4)

def cpu_intensive_work(data: dict) -> dict:
    """CPU-intensive processing - runs in separate process, not event loop"""
    # Heavy computation that would block if run directly
    result = process_data(data)
    return result

@app.post("/process")
async def process_endpoint(data: dict):
    """Run CPU work without blocking the event loop"""
    loop = asyncio.get_event_loop()  # Get the current event loop

    # run_in_executor offloads blocking work to the process pool
    result = await loop.run_in_executor(
        executor,  # Which executor to use
        cpu_intensive_work,  # Function to run
        data  # Arguments to pass
    )

    return result

@app.on_event("shutdown")
def shutdown_event():
    """Clean up executor on shutdown to prevent resource leaks"""
    executor.shutdown(wait=True)  # Wait for pending tasks to complete
```

### Batch Processing Endpoint

For batch operations like image processing, you can submit multiple items to the pool simultaneously. Using asyncio.gather allows concurrent execution while properly handling failures.

```python
from fastapi import FastAPI
from concurrent.futures import ProcessPoolExecutor, as_completed
import asyncio
from typing import List

app = FastAPI()
executor = ProcessPoolExecutor(max_workers=cpu_count())

def process_image(image_data: bytes) -> dict:
    """Process a single image - runs in worker process"""
    # CPU-intensive image processing (resize, filter, etc.)
    return {"processed": True, "size": len(image_data)}

@app.post("/batch-process")
async def batch_process(images: List[bytes]):
    """Process multiple images in parallel without blocking"""
    loop = asyncio.get_event_loop()

    # Submit all image processing tasks to the pool
    futures = [
        loop.run_in_executor(executor, process_image, img)
        for img in images
    ]

    # Wait for all tasks, collecting both results and exceptions
    results = await asyncio.gather(*futures, return_exceptions=True)

    # Separate successful results from failures
    return {
        "processed": len([r for r in results if not isinstance(r, Exception)]),
        "failed": len([r for r in results if isinstance(r, Exception)])
    }
```

---

## Shared Memory

### Using shared_memory (Python 3.8+)

When processes need to share large arrays without copying, shared_memory provides direct memory access. This is especially useful for NumPy arrays in data processing and machine learning workloads.

```python
from multiprocessing import shared_memory, Process
import numpy as np

def worker(shm_name: str, shape: tuple, dtype):
    """Worker process that accesses shared memory created by parent"""
    # Attach to existing shared memory block by name
    existing_shm = shared_memory.SharedMemory(name=shm_name)
    # Create NumPy array backed by shared memory (no copy!)
    array = np.ndarray(shape, dtype=dtype, buffer=existing_shm.buf)

    # Modify array in place - changes visible to parent process
    array[:] = array * 2

    existing_shm.close()  # Close access but don't destroy the memory

def main():
    # Create the original array
    original = np.array([1, 2, 3, 4, 5], dtype=np.float64)
    # Create shared memory block sized to fit the array
    shm = shared_memory.SharedMemory(create=True, size=original.nbytes)

    # Create array view into shared memory and copy data
    shared_array = np.ndarray(original.shape, dtype=original.dtype, buffer=shm.buf)
    shared_array[:] = original[:]  # Copy data to shared memory

    # Start worker process with shared memory name (not the data itself)
    p = Process(target=worker, args=(shm.name, original.shape, original.dtype))
    p.start()
    p.join()  # Wait for worker to finish

    print(f"Result: {shared_array}")  # [2, 4, 6, 8, 10] - modified by worker

    # Cleanup - must close and unlink to free resources
    shm.close()  # Close this process's access
    shm.unlink()  # Delete the shared memory block

if __name__ == '__main__':
    main()
```

### Using Manager for Shared Objects

The Manager provides proxy objects that can be shared between processes. Unlike shared_memory, it works with Python objects like dicts and lists, but with some overhead due to serialization.

```python
from multiprocessing import Manager, Pool

def worker(shared_dict, shared_list, key, value):
    """Worker with access to shared objects via proxies"""
    shared_dict[key] = value  # Updates visible to all processes
    shared_list.append(f"processed_{key}")  # Safe concurrent append
    return key

def main():
    # Manager creates a server process that manages shared objects
    with Manager() as manager:
        # Create shared objects - these are actually proxies
        shared_dict = manager.dict()  # Thread/process-safe dictionary
        shared_list = manager.list()  # Thread/process-safe list

        # Process in parallel using the shared objects
        with Pool(processes=4) as pool:
            results = [
                pool.apply_async(worker, (shared_dict, shared_list, i, i*2))
                for i in range(10)
            ]
            [r.get() for r in results]  # Wait for all tasks to complete

        # Access final state of shared objects
        print(f"Dict: {dict(shared_dict)}")
        print(f"List: {list(shared_list)}")

if __name__ == '__main__':
    main()
```

---

## Queue-Based Pattern

The queue pattern provides fine-grained control over worker processes and is ideal for producer-consumer scenarios. Workers continuously pull from the input queue until they receive a poison pill (None) signaling shutdown.

```python
# queue_pattern.py
from multiprocessing import Process, Queue, cpu_count
import time

def worker(input_queue: Queue, output_queue: Queue, worker_id: int):
    """Worker process that reads from input queue until poison pill"""
    while True:
        item = input_queue.get()  # Block until item available

        if item is None:  # Poison pill signals shutdown
            break

        # Process item and send result to output queue
        result = heavy_computation(item)
        output_queue.put((worker_id, item, result))

def process_with_workers(items: list, num_workers: int = None) -> list:
    """Process items using persistent worker processes"""
    num_workers = num_workers or cpu_count()

    input_queue = Queue()   # Tasks go in here
    output_queue = Queue()  # Results come out here

    # Start worker processes
    workers = []
    for i in range(num_workers):
        p = Process(target=worker, args=(input_queue, output_queue, i))
        p.start()
        workers.append(p)

    # Add all items to the input queue
    for item in items:
        input_queue.put(item)

    # Add poison pills to signal workers to exit (one per worker)
    for _ in range(num_workers):
        input_queue.put(None)

    # Collect results from output queue
    results = []
    for _ in range(len(items)):
        worker_id, item, result = output_queue.get()
        results.append(result)

    # Wait for all workers to finish
    for w in workers:
        w.join()

    return results
```

---

## Chunked Processing

For large numbers of small tasks, chunking reduces the overhead of inter-process communication. Instead of sending each item individually, you send batches that each worker processes sequentially.

```python
# chunked_processing.py
from concurrent.futures import ProcessPoolExecutor
from typing import List, Iterator
import math

def chunk_list(lst: list, chunk_size: int) -> Iterator[list]:
    """Split list into chunks of specified size"""
    for i in range(0, len(lst), chunk_size):
        yield lst[i:i + chunk_size]  # Yield chunks without copying

def process_chunk(chunk: list) -> list:
    """Process a chunk of items - one function call per chunk"""
    return [process_item(item) for item in chunk]

def parallel_process(items: list, chunk_size: int = 100) -> list:
    """Process items in parallel chunks to reduce IPC overhead"""
    # Convert to list of chunks
    chunks = list(chunk_list(items, chunk_size))

    # Each worker processes one chunk (many items)
    with ProcessPoolExecutor(max_workers=cpu_count()) as executor:
        results = list(executor.map(process_chunk, chunks))

    # Flatten results back into single list
    return [item for chunk in results for item in chunk]

# Usage - 10000 items processed in chunks of 500
items = list(range(10000))
results = parallel_process(items, chunk_size=500)
```

---

## Error Handling

Robust error handling ensures that one failing task doesn't crash your entire batch operation. By wrapping each task in try/except and returning a structured result, you can identify and handle failures gracefully.

```python
from concurrent.futures import ProcessPoolExecutor, as_completed
from dataclasses import dataclass
from typing import List, Union

@dataclass
class ProcessResult:
    """Structured result that captures success or failure"""
    item_id: int
    success: bool
    result: any = None  # Present on success
    error: str = None   # Present on failure

def safe_process(item_id: int) -> ProcessResult:
    """Process with error handling - never raises, always returns result"""
    try:
        result = dangerous_computation(item_id)
        return ProcessResult(item_id=item_id, success=True, result=result)
    except Exception as e:
        # Capture error and return structured failure
        return ProcessResult(item_id=item_id, success=False, error=str(e))

def process_all(item_ids: List[int]) -> List[ProcessResult]:
    """Process all items, capturing errors without stopping"""
    with ProcessPoolExecutor(max_workers=cpu_count()) as executor:
        # Submit all tasks
        futures = {
            executor.submit(safe_process, item_id): item_id
            for item_id in item_ids
        }

        results = []
        for future in as_completed(futures):
            try:
                # Get result with timeout
                result = future.result(timeout=30)
                results.append(result)
            except Exception as e:
                # Handle executor-level failures (timeout, etc.)
                item_id = futures[future]
                results.append(ProcessResult(
                    item_id=item_id,
                    success=False,
                    error=str(e)
                ))

    return results
```

---

## Memory Considerations

Processing large files in separate processes isolates memory usage and prevents memory leaks from accumulating. Explicit garbage collection helps free memory immediately after processing.

```python
# memory_efficient.py
from concurrent.futures import ProcessPoolExecutor
import gc

def process_large_data(data_path: str) -> dict:
    """Process large data in separate process to avoid memory issues"""
    # Load data in worker process (memory isolated from main process)
    data = load_large_file(data_path)

    # Process the data
    result = analyze(data)

    # Explicitly free memory before returning
    del data
    gc.collect()  # Force garbage collection

    return result

def process_multiple_files(file_paths: list) -> list:
    """Process files in separate processes to isolate memory usage"""
    # Use maxtasksperchild to prevent memory buildup in long-running workers
    with ProcessPoolExecutor(
        max_workers=4,
        # Each worker handles 10 tasks then restarts (clears accumulated memory)
    ) as executor:
        results = list(executor.map(process_large_data, file_paths))

    return results
```

---

## Best Practices

1. **Use ProcessPoolExecutor** over raw multiprocessing
2. **Avoid pickling large objects** - pass file paths instead
3. **Use chunking** for large numbers of small tasks
4. **Handle errors** in worker functions
5. **Clean up resources** with context managers
6. **Monitor memory** usage per worker

---

## Conclusion

Python's multiprocessing enables true parallel CPU execution. Key takeaways:

- **ProcessPoolExecutor** is the recommended approach
- **Shared memory** avoids copying large data
- **Chunking** improves efficiency for many small tasks
- **Error handling** is essential for reliability

---

*Need to monitor CPU-intensive Python workloads? [OneUptime](https://oneuptime.com) provides infrastructure monitoring with CPU and memory tracking.*
