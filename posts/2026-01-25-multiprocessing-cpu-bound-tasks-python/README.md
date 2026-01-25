# How to Use multiprocessing for CPU-Bound Tasks in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Multiprocessing, Parallel Processing, Performance, CPU

Description: Learn how to use Python's multiprocessing module for CPU-bound tasks. This guide covers process creation, pools, shared state, and best practices for parallel computing.

---

Python's `multiprocessing` module enables true parallel execution by using separate processes instead of threads. Unlike threading, which is limited by the Global Interpreter Lock (GIL), multiprocessing can fully utilize multiple CPU cores for CPU-intensive tasks.

## When to Use multiprocessing

```python
# Use multiprocessing for CPU-bound tasks:
# - Mathematical calculations
# - Image/video processing
# - Data transformation
# - Machine learning training
# - Compression/encryption

# Use threading for I/O-bound tasks:
# - Network requests
# - File operations
# - Database queries
```

## Basic Process Creation

```python
import multiprocessing
import os

def worker(name):
    """Function that runs in a separate process."""
    print(f"Worker {name} running in process {os.getpid()}")
    # Do CPU-intensive work here
    result = sum(i * i for i in range(10_000_000))
    print(f"Worker {name} finished: {result}")
    return result

if __name__ == "__main__":
    # Important: Always use this guard for multiprocessing
    print(f"Main process: {os.getpid()}")

    # Create processes
    p1 = multiprocessing.Process(target=worker, args=("A",))
    p2 = multiprocessing.Process(target=worker, args=("B",))

    # Start processes
    p1.start()
    p2.start()

    # Wait for completion
    p1.join()
    p2.join()

    print("All processes finished")
```

## Using Pool for Parallel Processing

`Pool` manages a pool of worker processes:

```python
import multiprocessing
import time

def compute_square(n):
    """CPU-intensive computation."""
    time.sleep(0.1)  # Simulate work
    return n * n

if __name__ == "__main__":
    numbers = list(range(20))

    # Sequential (slow)
    start = time.time()
    results_seq = [compute_square(n) for n in numbers]
    print(f"Sequential: {time.time() - start:.2f}s")

    # Parallel with Pool
    start = time.time()
    with multiprocessing.Pool(processes=4) as pool:
        results_par = pool.map(compute_square, numbers)
    print(f"Parallel (4 processes): {time.time() - start:.2f}s")

    print(results_par)
```

### Pool Methods

```python
import multiprocessing

def process_item(x):
    return x * x

if __name__ == "__main__":
    with multiprocessing.Pool(4) as pool:
        # map - blocks until all complete, preserves order
        results = pool.map(process_item, range(10))

        # map with chunksize for large iterables
        results = pool.map(process_item, range(10000), chunksize=100)

        # imap - returns iterator, processes lazily
        for result in pool.imap(process_item, range(10)):
            print(result)

        # imap_unordered - faster but results may be out of order
        for result in pool.imap_unordered(process_item, range(10)):
            print(result)

        # apply - single function call
        result = pool.apply(process_item, (5,))

        # apply_async - non-blocking
        async_result = pool.apply_async(process_item, (5,))
        result = async_result.get(timeout=10)  # Get result with timeout

        # starmap - for functions with multiple arguments
        pairs = [(1, 2), (3, 4), (5, 6)]
        results = pool.starmap(lambda x, y: x + y, pairs)
```

## ProcessPoolExecutor (Modern API)

```python
from concurrent.futures import ProcessPoolExecutor, as_completed
import time

def heavy_computation(n):
    """Simulate heavy computation."""
    time.sleep(0.5)
    return n * n

if __name__ == "__main__":
    numbers = range(10)

    with ProcessPoolExecutor(max_workers=4) as executor:
        # Submit tasks
        futures = {executor.submit(heavy_computation, n): n for n in numbers}

        # Process results as they complete
        for future in as_completed(futures):
            n = futures[future]
            try:
                result = future.result()
                print(f"{n} -> {result}")
            except Exception as e:
                print(f"Error processing {n}: {e}")

        # Or use map for simpler cases
        results = list(executor.map(heavy_computation, numbers))
```

## Sharing State Between Processes

### Using Value and Array

```python
import multiprocessing

def increment_counter(counter, lock):
    """Increment shared counter safely."""
    for _ in range(10000):
        with lock:
            counter.value += 1

if __name__ == "__main__":
    # Shared value (with type code 'i' for integer)
    counter = multiprocessing.Value('i', 0)
    lock = multiprocessing.Lock()

    processes = [
        multiprocessing.Process(target=increment_counter, args=(counter, lock))
        for _ in range(4)
    ]

    for p in processes:
        p.start()

    for p in processes:
        p.join()

    print(f"Final counter: {counter.value}")  # Should be 40000
```

### Using Manager for Complex Objects

```python
import multiprocessing

def worker(shared_dict, shared_list, key, value):
    """Modify shared data structures."""
    shared_dict[key] = value
    shared_list.append(value)

if __name__ == "__main__":
    with multiprocessing.Manager() as manager:
        # Manager provides shared dict and list
        shared_dict = manager.dict()
        shared_list = manager.list()

        processes = []
        for i in range(4):
            p = multiprocessing.Process(
                target=worker,
                args=(shared_dict, shared_list, f"key_{i}", i * 10)
            )
            processes.append(p)
            p.start()

        for p in processes:
            p.join()

        print(f"Dict: {dict(shared_dict)}")
        print(f"List: {list(shared_list)}")
```

## Queues for Process Communication

```python
import multiprocessing
import time

def producer(queue, count):
    """Produce items and put them in queue."""
    for i in range(count):
        item = f"item_{i}"
        queue.put(item)
        print(f"Produced: {item}")
        time.sleep(0.1)
    queue.put(None)  # Sentinel to signal completion

def consumer(queue, name):
    """Consume items from queue."""
    while True:
        item = queue.get()
        if item is None:
            queue.put(None)  # Pass sentinel to other consumers
            break
        print(f"Consumer {name} got: {item}")
        time.sleep(0.2)

if __name__ == "__main__":
    queue = multiprocessing.Queue()

    # Create producer and consumers
    prod = multiprocessing.Process(target=producer, args=(queue, 10))
    cons1 = multiprocessing.Process(target=consumer, args=(queue, "A"))
    cons2 = multiprocessing.Process(target=consumer, args=(queue, "B"))

    prod.start()
    cons1.start()
    cons2.start()

    prod.join()
    cons1.join()
    cons2.join()
```

## Pipes for Two-Way Communication

```python
import multiprocessing

def sender(conn, messages):
    """Send messages through pipe."""
    for msg in messages:
        conn.send(msg)
    conn.send(None)  # Signal done
    conn.close()

def receiver(conn):
    """Receive messages from pipe."""
    while True:
        msg = conn.recv()
        if msg is None:
            break
        print(f"Received: {msg}")
    conn.close()

if __name__ == "__main__":
    # Create pipe - returns two connection objects
    parent_conn, child_conn = multiprocessing.Pipe()

    p1 = multiprocessing.Process(
        target=sender,
        args=(parent_conn, ["Hello", "World", "!"])
    )
    p2 = multiprocessing.Process(target=receiver, args=(child_conn,))

    p1.start()
    p2.start()

    p1.join()
    p2.join()
```

## Handling Exceptions

```python
from concurrent.futures import ProcessPoolExecutor, as_completed

def risky_computation(x):
    """May raise an exception."""
    if x == 5:
        raise ValueError(f"Cannot process {x}")
    return x * x

if __name__ == "__main__":
    with ProcessPoolExecutor(max_workers=4) as executor:
        futures = {executor.submit(risky_computation, i): i for i in range(10)}

        for future in as_completed(futures):
            i = futures[future]
            try:
                result = future.result()
                print(f"{i} -> {result}")
            except Exception as e:
                print(f"Error for {i}: {type(e).__name__}: {e}")
```

## Real World Example: Parallel Image Processing

```python
import multiprocessing
from concurrent.futures import ProcessPoolExecutor
import time
from pathlib import Path

def process_image(image_path):
    """Simulate CPU-intensive image processing."""
    # In real code, this would do actual image processing
    # using PIL, OpenCV, etc.
    time.sleep(0.5)  # Simulate processing time

    return {
        "path": str(image_path),
        "status": "processed",
        "size": 1024  # Placeholder
    }

def process_images_parallel(image_paths, max_workers=None):
    """Process multiple images in parallel."""
    if max_workers is None:
        max_workers = multiprocessing.cpu_count()

    results = []
    errors = []

    with ProcessPoolExecutor(max_workers=max_workers) as executor:
        future_to_path = {
            executor.submit(process_image, path): path
            for path in image_paths
        }

        for future in future_to_path:
            path = future_to_path[future]
            try:
                result = future.result(timeout=30)
                results.append(result)
            except Exception as e:
                errors.append({"path": str(path), "error": str(e)})

    return results, errors

if __name__ == "__main__":
    # Simulate 20 images
    image_paths = [Path(f"image_{i}.jpg") for i in range(20)]

    # Sequential processing
    start = time.time()
    for path in image_paths:
        process_image(path)
    print(f"Sequential: {time.time() - start:.2f}s")

    # Parallel processing
    start = time.time()
    results, errors = process_images_parallel(image_paths, max_workers=4)
    print(f"Parallel (4 workers): {time.time() - start:.2f}s")
    print(f"Processed: {len(results)}, Errors: {len(errors)}")
```

## Best Practices

### 1. Always Use the if __name__ == "__main__" Guard

```python
# Required on Windows and macOS with spawn start method
if __name__ == "__main__":
    pool = multiprocessing.Pool(4)
    # ...
```

### 2. Avoid Sharing Too Much State

```python
# Bad: Passing large objects to processes
def process(huge_data):
    return analyze(huge_data)

# Good: Pass minimal data, load in process
def process(data_path):
    huge_data = load_data(data_path)
    return analyze(huge_data)
```

### 3. Use Appropriate Chunk Sizes

```python
# For many small items, use larger chunks
pool.map(func, items, chunksize=100)

# For few large items, use smaller chunks
pool.map(func, items, chunksize=1)
```

### 4. Clean Up Resources

```python
# Use context manager
with multiprocessing.Pool(4) as pool:
    results = pool.map(func, items)
# Pool is automatically closed and joined
```

### 5. Handle SIGINT Gracefully

```python
import signal
import multiprocessing

def init_worker():
    """Ignore SIGINT in worker processes."""
    signal.signal(signal.SIGINT, signal.SIG_IGN)

if __name__ == "__main__":
    pool = multiprocessing.Pool(4, initializer=init_worker)
    try:
        results = pool.map(func, items)
    except KeyboardInterrupt:
        print("Interrupted, terminating workers")
        pool.terminate()
    finally:
        pool.close()
        pool.join()
```

## Summary

| Feature | Use Case |
|---------|----------|
| `Process` | Single background process |
| `Pool` | Parallel processing with worker pool |
| `ProcessPoolExecutor` | Modern async-friendly API |
| `Queue` | Multi-producer/multi-consumer |
| `Pipe` | Two-way communication |
| `Value/Array` | Simple shared state |
| `Manager` | Complex shared objects |
| `Lock` | Synchronization |

Multiprocessing is essential for CPU-bound work in Python. It bypasses the GIL by using separate processes, enabling true parallelism across CPU cores. Always protect shared state and prefer the context manager pattern for clean resource management.
