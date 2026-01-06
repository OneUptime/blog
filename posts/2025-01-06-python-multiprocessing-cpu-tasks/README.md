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

```python
# pool_basic.py
from multiprocessing import Pool, cpu_count
import time

def cpu_intensive_task(n):
    """Example CPU-intensive task"""
    total = 0
    for i in range(n):
        total += i ** 2
    return total

def main():
    numbers = [10_000_000] * 8  # 8 tasks

    # Sequential execution
    start = time.time()
    results_seq = [cpu_intensive_task(n) for n in numbers]
    print(f"Sequential: {time.time() - start:.2f}s")

    # Parallel execution
    start = time.time()
    with Pool(processes=cpu_count()) as pool:
        results_par = pool.map(cpu_intensive_task, numbers)
    print(f"Parallel: {time.time() - start:.2f}s")

if __name__ == '__main__':
    main()
```

---

## ProcessPoolExecutor (Recommended)

```python
# executor_basic.py
from concurrent.futures import ProcessPoolExecutor, as_completed
import time

def process_item(item_id: int) -> dict:
    """Process a single item"""
    # CPU-intensive processing
    result = heavy_computation(item_id)
    return {"id": item_id, "result": result}

def process_batch(items: list) -> list:
    """Process items in parallel"""
    results = []

    with ProcessPoolExecutor(max_workers=cpu_count()) as executor:
        # Submit all tasks
        futures = {
            executor.submit(process_item, item): item
            for item in items
        }

        # Collect results as they complete
        for future in as_completed(futures):
            item = futures[future]
            try:
                result = future.result()
                results.append(result)
            except Exception as e:
                print(f"Item {item} failed: {e}")
                results.append({"id": item, "error": str(e)})

    return results

# Usage
items = list(range(100))
results = process_batch(items)
```

### With Timeout

```python
from concurrent.futures import ProcessPoolExecutor, TimeoutError, as_completed

def process_with_timeout(items: list, timeout: float = 30.0) -> list:
    """Process with per-task timeout"""
    results = []

    with ProcessPoolExecutor(max_workers=cpu_count()) as executor:
        futures = {
            executor.submit(process_item, item): item
            for item in items
        }

        for future in as_completed(futures, timeout=timeout):
            item = futures[future]
            try:
                result = future.result(timeout=10)  # Per-task timeout
                results.append(result)
            except TimeoutError:
                print(f"Item {item} timed out")
                future.cancel()
            except Exception as e:
                print(f"Item {item} failed: {e}")

    return results
```

---

## Integration with FastAPI

### Non-Blocking CPU Work

```python
# fastapi_multiprocessing.py
from fastapi import FastAPI, BackgroundTasks
from concurrent.futures import ProcessPoolExecutor
import asyncio

app = FastAPI()

# Global executor (created once)
executor = ProcessPoolExecutor(max_workers=4)

def cpu_intensive_work(data: dict) -> dict:
    """CPU-intensive processing - runs in separate process"""
    # Heavy computation
    result = process_data(data)
    return result

@app.post("/process")
async def process_endpoint(data: dict):
    """Run CPU work without blocking the event loop"""
    loop = asyncio.get_event_loop()

    # Run in process pool
    result = await loop.run_in_executor(
        executor,
        cpu_intensive_work,
        data
    )

    return result

@app.on_event("shutdown")
def shutdown_event():
    """Clean up executor on shutdown"""
    executor.shutdown(wait=True)
```

### Batch Processing Endpoint

```python
from fastapi import FastAPI
from concurrent.futures import ProcessPoolExecutor, as_completed
import asyncio
from typing import List

app = FastAPI()
executor = ProcessPoolExecutor(max_workers=cpu_count())

def process_image(image_data: bytes) -> dict:
    """Process a single image"""
    # CPU-intensive image processing
    return {"processed": True, "size": len(image_data)}

@app.post("/batch-process")
async def batch_process(images: List[bytes]):
    """Process multiple images in parallel"""
    loop = asyncio.get_event_loop()

    # Submit all tasks
    futures = [
        loop.run_in_executor(executor, process_image, img)
        for img in images
    ]

    # Wait for all to complete
    results = await asyncio.gather(*futures, return_exceptions=True)

    return {
        "processed": len([r for r in results if not isinstance(r, Exception)]),
        "failed": len([r for r in results if isinstance(r, Exception)])
    }
```

---

## Shared Memory

### Using shared_memory (Python 3.8+)

```python
from multiprocessing import shared_memory, Process
import numpy as np

def worker(shm_name: str, shape: tuple, dtype):
    """Worker process that accesses shared memory"""
    # Attach to existing shared memory
    existing_shm = shared_memory.SharedMemory(name=shm_name)
    array = np.ndarray(shape, dtype=dtype, buffer=existing_shm.buf)

    # Modify array in place
    array[:] = array * 2

    existing_shm.close()

def main():
    # Create array and shared memory
    original = np.array([1, 2, 3, 4, 5], dtype=np.float64)
    shm = shared_memory.SharedMemory(create=True, size=original.nbytes)

    # Copy data to shared memory
    shared_array = np.ndarray(original.shape, dtype=original.dtype, buffer=shm.buf)
    shared_array[:] = original[:]

    # Start worker process
    p = Process(target=worker, args=(shm.name, original.shape, original.dtype))
    p.start()
    p.join()

    print(f"Result: {shared_array}")  # [2, 4, 6, 8, 10]

    # Cleanup
    shm.close()
    shm.unlink()

if __name__ == '__main__':
    main()
```

### Using Manager for Shared Objects

```python
from multiprocessing import Manager, Pool

def worker(shared_dict, shared_list, key, value):
    """Worker with access to shared objects"""
    shared_dict[key] = value
    shared_list.append(f"processed_{key}")
    return key

def main():
    with Manager() as manager:
        # Create shared objects
        shared_dict = manager.dict()
        shared_list = manager.list()

        # Process in parallel
        with Pool(processes=4) as pool:
            results = [
                pool.apply_async(worker, (shared_dict, shared_list, i, i*2))
                for i in range(10)
            ]
            [r.get() for r in results]

        print(f"Dict: {dict(shared_dict)}")
        print(f"List: {list(shared_list)}")

if __name__ == '__main__':
    main()
```

---

## Queue-Based Pattern

```python
# queue_pattern.py
from multiprocessing import Process, Queue, cpu_count
import time

def worker(input_queue: Queue, output_queue: Queue, worker_id: int):
    """Worker process that reads from input queue"""
    while True:
        item = input_queue.get()

        if item is None:  # Poison pill
            break

        # Process item
        result = heavy_computation(item)
        output_queue.put((worker_id, item, result))

def process_with_workers(items: list, num_workers: int = None) -> list:
    """Process items using worker processes"""
    num_workers = num_workers or cpu_count()

    input_queue = Queue()
    output_queue = Queue()

    # Start workers
    workers = []
    for i in range(num_workers):
        p = Process(target=worker, args=(input_queue, output_queue, i))
        p.start()
        workers.append(p)

    # Add items to queue
    for item in items:
        input_queue.put(item)

    # Add poison pills
    for _ in range(num_workers):
        input_queue.put(None)

    # Collect results
    results = []
    for _ in range(len(items)):
        worker_id, item, result = output_queue.get()
        results.append(result)

    # Wait for workers
    for w in workers:
        w.join()

    return results
```

---

## Chunked Processing

```python
# chunked_processing.py
from concurrent.futures import ProcessPoolExecutor
from typing import List, Iterator
import math

def chunk_list(lst: list, chunk_size: int) -> Iterator[list]:
    """Split list into chunks"""
    for i in range(0, len(lst), chunk_size):
        yield lst[i:i + chunk_size]

def process_chunk(chunk: list) -> list:
    """Process a chunk of items"""
    return [process_item(item) for item in chunk]

def parallel_process(items: list, chunk_size: int = 100) -> list:
    """Process items in parallel chunks"""
    chunks = list(chunk_list(items, chunk_size))

    with ProcessPoolExecutor(max_workers=cpu_count()) as executor:
        results = list(executor.map(process_chunk, chunks))

    # Flatten results
    return [item for chunk in results for item in chunk]

# Usage
items = list(range(10000))
results = parallel_process(items, chunk_size=500)
```

---

## Error Handling

```python
from concurrent.futures import ProcessPoolExecutor, as_completed
from dataclasses import dataclass
from typing import List, Union

@dataclass
class ProcessResult:
    item_id: int
    success: bool
    result: any = None
    error: str = None

def safe_process(item_id: int) -> ProcessResult:
    """Process with error handling"""
    try:
        result = dangerous_computation(item_id)
        return ProcessResult(item_id=item_id, success=True, result=result)
    except Exception as e:
        return ProcessResult(item_id=item_id, success=False, error=str(e))

def process_all(item_ids: List[int]) -> List[ProcessResult]:
    """Process all items, capturing errors"""
    with ProcessPoolExecutor(max_workers=cpu_count()) as executor:
        futures = {
            executor.submit(safe_process, item_id): item_id
            for item_id in item_ids
        }

        results = []
        for future in as_completed(futures):
            try:
                result = future.result(timeout=30)
                results.append(result)
            except Exception as e:
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

```python
# memory_efficient.py
from concurrent.futures import ProcessPoolExecutor
import gc

def process_large_data(data_path: str) -> dict:
    """Process large data in separate process to avoid memory issues"""
    # Load data in worker process
    data = load_large_file(data_path)

    # Process
    result = analyze(data)

    # Explicitly free memory
    del data
    gc.collect()

    return result

def process_multiple_files(file_paths: list) -> list:
    """Process files in separate processes"""
    # Use maxtasksperchild to prevent memory buildup
    with ProcessPoolExecutor(
        max_workers=4,
        # Each worker handles 10 tasks then restarts
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
