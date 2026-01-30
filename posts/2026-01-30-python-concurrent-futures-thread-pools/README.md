# How to Create Thread Pools with concurrent.futures in Python

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Python, Concurrency, Threading, Performance

Description: Master Python's concurrent.futures module for parallel execution with ThreadPoolExecutor and ProcessPoolExecutor, including error handling and timeouts.

---

Python's `concurrent.futures` module provides a high-level interface for asynchronously executing callables using thread or process pools. Introduced in Python 3.2, it abstracts away the complexity of managing threads and processes manually, giving you a clean API for parallel execution.

In this guide, we'll cover everything you need to know about using thread pools effectively, from basic usage to advanced patterns like callbacks, timeouts, and exception handling.

## Why Use concurrent.futures?

Before diving into the code, let's understand when and why you'd want to use this module:

| Use Case | Recommended Executor | Reason |
|----------|---------------------|--------|
| I/O-bound tasks (HTTP requests, file operations) | ThreadPoolExecutor | Threads release the GIL during I/O waits |
| CPU-bound tasks (calculations, data processing) | ProcessPoolExecutor | Bypasses GIL by using separate processes |
| Simple parallel execution | Either | Clean API, easy to use |
| Fine-grained thread control | threading module | More control, but more complexity |

The `concurrent.futures` module shines when you need to run multiple independent tasks in parallel without getting into the weeds of thread synchronization.

## Getting Started with ThreadPoolExecutor

Let's start with a basic example. The `ThreadPoolExecutor` manages a pool of worker threads that execute tasks asynchronously.

### Basic Usage with Context Manager

Using a context manager ensures proper cleanup of threads when you're done.

```python
from concurrent.futures import ThreadPoolExecutor
import time

def fetch_data(url):
    """Simulate fetching data from a URL."""
    print(f"Starting fetch: {url}")
    time.sleep(2)  # Simulate network delay
    return f"Data from {url}"

# Create a thread pool with 3 worker threads
# The context manager handles thread cleanup automatically
with ThreadPoolExecutor(max_workers=3) as executor:
    # Submit a single task
    future = executor.submit(fetch_data, "https://api.example.com/users")

    # Get the result (blocks until complete)
    result = future.result()
    print(result)
```

Output:
```
Starting fetch: https://api.example.com/users
Data from https://api.example.com/users
```

### Choosing the Right Number of Workers

The `max_workers` parameter controls how many threads run simultaneously. Here are some guidelines:

```python
import os
from concurrent.futures import ThreadPoolExecutor

# For I/O-bound tasks, you can use more threads than CPU cores
# A common heuristic is (CPU cores * 5) for I/O-bound work
io_bound_workers = os.cpu_count() * 5

# For mixed workloads, start conservative
mixed_workers = os.cpu_count() * 2

# Default behavior (Python 3.8+): min(32, os.cpu_count() + 4)
with ThreadPoolExecutor() as executor:
    # Uses default worker count
    pass

# Explicitly set workers for I/O-heavy tasks
with ThreadPoolExecutor(max_workers=20) as executor:
    # Good for making many HTTP requests
    pass
```

## submit() vs map(): Two Ways to Execute Tasks

The executor provides two main methods for running tasks: `submit()` and `map()`. Each has its use cases.

### Using submit() for Fine-Grained Control

The `submit()` method returns a `Future` object immediately, giving you control over each task.

```python
from concurrent.futures import ThreadPoolExecutor
import time

def process_item(item_id):
    """Process a single item and return the result."""
    time.sleep(1)
    return {"id": item_id, "status": "processed", "value": item_id * 10}

items_to_process = [1, 2, 3, 4, 5]

with ThreadPoolExecutor(max_workers=3) as executor:
    # Submit all tasks and store the futures
    futures = []
    for item_id in items_to_process:
        future = executor.submit(process_item, item_id)
        futures.append((item_id, future))

    # Collect results as they complete
    for item_id, future in futures:
        result = future.result()
        print(f"Item {item_id}: {result}")
```

### Using map() for Simpler Iteration

The `map()` method is cleaner when you want to apply the same function to multiple inputs.

```python
from concurrent.futures import ThreadPoolExecutor
import time

def download_file(url):
    """Simulate downloading a file."""
    time.sleep(1)
    return f"Downloaded: {url}"

urls = [
    "https://example.com/file1.txt",
    "https://example.com/file2.txt",
    "https://example.com/file3.txt",
    "https://example.com/file4.txt",
]

with ThreadPoolExecutor(max_workers=4) as executor:
    # map() returns results in the same order as inputs
    # Results are yielded as they become available (while maintaining order)
    results = executor.map(download_file, urls)

    for url, result in zip(urls, results):
        print(result)
```

### Comparing submit() and map()

| Feature | submit() | map() |
|---------|----------|-------|
| Return type | Future object | Iterator of results |
| Order of results | Any order (use as_completed) | Same as input order |
| Exception handling | Per-future with result() | Raises on iteration |
| Multiple arguments | Easy with *args | Requires zip or itertools |
| Progress tracking | Easier with as_completed | Harder to track |
| Memory usage | All futures in memory | Lazy iteration possible |

### Using map() with Multiple Arguments

When your function takes multiple arguments, use `zip` or pass multiple iterables.

```python
from concurrent.futures import ThreadPoolExecutor

def process_order(order_id, customer_name, amount):
    """Process an order with multiple parameters."""
    return f"Order {order_id} for {customer_name}: ${amount}"

order_ids = [101, 102, 103]
customers = ["Alice", "Bob", "Charlie"]
amounts = [99.99, 149.50, 75.00]

with ThreadPoolExecutor(max_workers=3) as executor:
    # Pass multiple iterables to map()
    results = executor.map(process_order, order_ids, customers, amounts)

    for result in results:
        print(result)
```

Output:
```
Order 101 for Alice: $99.99
Order 102 for Bob: $149.50
Order 103 for Charlie: $75.00
```

## Working with Future Objects

The `Future` object represents the eventual result of an asynchronous operation. Understanding its API is essential for advanced usage.

### Future Methods and Properties

```python
from concurrent.futures import ThreadPoolExecutor
import time

def slow_task(n):
    time.sleep(2)
    return n * n

with ThreadPoolExecutor(max_workers=2) as executor:
    future = executor.submit(slow_task, 5)

    # Check if the task is still running
    print(f"Running: {future.running()}")

    # Check if the task completed (successfully or not)
    print(f"Done: {future.done()}")

    # Check if the task was cancelled
    print(f"Cancelled: {future.cancelled()}")

    # Wait for the result (blocks until complete)
    result = future.result()
    print(f"Result: {result}")

    # After completion
    print(f"Done now: {future.done()}")
```

### Cancelling Tasks

You can attempt to cancel tasks that haven't started yet.

```python
from concurrent.futures import ThreadPoolExecutor
import time

def long_running_task(task_id):
    print(f"Task {task_id} starting")
    time.sleep(5)
    print(f"Task {task_id} complete")
    return task_id

with ThreadPoolExecutor(max_workers=1) as executor:
    # Submit multiple tasks to a single-worker pool
    future1 = executor.submit(long_running_task, 1)
    future2 = executor.submit(long_running_task, 2)
    future3 = executor.submit(long_running_task, 3)

    time.sleep(0.5)  # Let the first task start

    # Try to cancel tasks that haven't started
    cancelled2 = future2.cancel()
    cancelled3 = future3.cancel()

    print(f"Future 2 cancelled: {cancelled2}")
    print(f"Future 3 cancelled: {cancelled3}")

    # Note: You cannot cancel a task that's already running
    cancelled1 = future1.cancel()
    print(f"Future 1 cancelled: {cancelled1}")  # False, already running
```

## Adding Callbacks to Futures

Callbacks let you execute code automatically when a future completes, without blocking.

```python
from concurrent.futures import ThreadPoolExecutor
import time

def fetch_user_data(user_id):
    """Fetch user data from an API."""
    time.sleep(1)
    return {"user_id": user_id, "name": f"User {user_id}", "email": f"user{user_id}@example.com"}

def on_user_fetched(future):
    """Callback function executed when fetch completes."""
    try:
        user_data = future.result()
        print(f"Callback received: {user_data['name']} ({user_data['email']})")
    except Exception as e:
        print(f"Callback caught error: {e}")

with ThreadPoolExecutor(max_workers=3) as executor:
    user_ids = [1, 2, 3, 4, 5]

    for user_id in user_ids:
        future = executor.submit(fetch_user_data, user_id)
        # Add callback that runs when this future completes
        future.add_done_callback(on_user_fetched)

    print("All tasks submitted, callbacks will fire as they complete")
    # The context manager waits for all tasks to finish
```

### Chaining Multiple Callbacks

You can add multiple callbacks to a single future.

```python
from concurrent.futures import ThreadPoolExecutor
import time

def compute_value(x):
    time.sleep(1)
    return x * 2

def log_result(future):
    print(f"[LOG] Result: {future.result()}")

def update_database(future):
    result = future.result()
    print(f"[DB] Storing value: {result}")

def notify_user(future):
    result = future.result()
    print(f"[NOTIFY] Computation complete: {result}")

with ThreadPoolExecutor(max_workers=2) as executor:
    future = executor.submit(compute_value, 21)

    # Callbacks execute in the order they were added
    future.add_done_callback(log_result)
    future.add_done_callback(update_database)
    future.add_done_callback(notify_user)
```

## Using as_completed() for Progress Tracking

The `as_completed()` function yields futures as they complete, regardless of submission order.

```python
from concurrent.futures import ThreadPoolExecutor, as_completed
import time
import random

def process_task(task_id):
    """Simulate a task with variable completion time."""
    duration = random.uniform(0.5, 3.0)
    time.sleep(duration)
    return {"task_id": task_id, "duration": round(duration, 2)}

tasks = list(range(1, 8))

with ThreadPoolExecutor(max_workers=3) as executor:
    # Create a mapping of future to task_id for reference
    future_to_task = {
        executor.submit(process_task, task_id): task_id
        for task_id in tasks
    }

    completed_count = 0
    total_tasks = len(tasks)

    # Process results as they complete
    for future in as_completed(future_to_task):
        task_id = future_to_task[future]
        completed_count += 1

        try:
            result = future.result()
            print(f"[{completed_count}/{total_tasks}] Task {task_id} completed in {result['duration']}s")
        except Exception as e:
            print(f"[{completed_count}/{total_tasks}] Task {task_id} failed: {e}")
```

Sample output (order varies due to random timing):
```
[1/7] Task 3 completed in 0.52s
[2/7] Task 1 completed in 0.89s
[3/7] Task 5 completed in 1.23s
[4/7] Task 2 completed in 1.45s
[5/7] Task 4 completed in 2.01s
[6/7] Task 6 completed in 2.34s
[7/7] Task 7 completed in 2.87s
```

## Handling Exceptions

Proper exception handling is important when working with concurrent code. Exceptions in threads don't automatically propagate to the main thread.

### Catching Exceptions with result()

```python
from concurrent.futures import ThreadPoolExecutor
import random

def risky_operation(item_id):
    """A function that might fail."""
    if random.random() < 0.3:
        raise ValueError(f"Random failure for item {item_id}")
    return f"Success: item {item_id}"

with ThreadPoolExecutor(max_workers=3) as executor:
    futures = {
        executor.submit(risky_operation, i): i
        for i in range(10)
    }

    for future in futures:
        item_id = futures[future]
        try:
            # Exceptions are raised when you call result()
            result = future.result()
            print(result)
        except ValueError as e:
            print(f"Caught error for item {item_id}: {e}")
        except Exception as e:
            print(f"Unexpected error for item {item_id}: {type(e).__name__}: {e}")
```

### Using exception() Method

You can check for exceptions without triggering them using the `exception()` method.

```python
from concurrent.futures import ThreadPoolExecutor, as_completed

def divide(a, b):
    return a / b

with ThreadPoolExecutor(max_workers=2) as executor:
    futures = [
        executor.submit(divide, 10, 2),
        executor.submit(divide, 10, 0),  # Will raise ZeroDivisionError
        executor.submit(divide, 20, 4),
    ]

    for future in as_completed(futures):
        # Check if an exception occurred without raising it
        exc = future.exception()

        if exc is not None:
            print(f"Task failed with: {type(exc).__name__}: {exc}")
        else:
            print(f"Task succeeded with result: {future.result()}")
```

### Handling Exceptions in map()

With `map()`, exceptions are raised when you iterate over the results.

```python
from concurrent.futures import ThreadPoolExecutor

def parse_number(value):
    """Parse a string to integer, might fail."""
    return int(value)

values = ["10", "20", "invalid", "40", "50"]

with ThreadPoolExecutor(max_workers=3) as executor:
    results = executor.map(parse_number, values)

    # Wrap iteration in try-except
    parsed = []
    results_iter = iter(results)

    for value in values:
        try:
            result = next(results_iter)
            parsed.append(result)
            print(f"Parsed '{value}' -> {result}")
        except ValueError as e:
            print(f"Failed to parse '{value}': {e}")
            parsed.append(None)
        except StopIteration:
            break

print(f"Final results: {parsed}")
```

## Setting Timeouts

Timeouts prevent your code from hanging indefinitely when tasks take too long.

### Timeout with result()

```python
from concurrent.futures import ThreadPoolExecutor, TimeoutError
import time

def slow_api_call(endpoint):
    """Simulate a slow API that might timeout."""
    time.sleep(5)
    return f"Response from {endpoint}"

with ThreadPoolExecutor(max_workers=2) as executor:
    future = executor.submit(slow_api_call, "/api/data")

    try:
        # Wait for at most 2 seconds
        result = future.result(timeout=2)
        print(result)
    except TimeoutError:
        print("API call timed out after 2 seconds")
        # The task keeps running in the background
        # You might want to track it or ignore the result
```

### Timeout with as_completed()

```python
from concurrent.futures import ThreadPoolExecutor, as_completed, TimeoutError
import time

def variable_task(task_id, duration):
    time.sleep(duration)
    return f"Task {task_id} completed after {duration}s"

tasks = [
    (1, 1),   # 1 second
    (2, 3),   # 3 seconds
    (3, 10),  # 10 seconds
]

with ThreadPoolExecutor(max_workers=3) as executor:
    futures = {
        executor.submit(variable_task, task_id, duration): task_id
        for task_id, duration in tasks
    }

    try:
        # Wait for all tasks to complete, but only for 5 seconds total
        for future in as_completed(futures, timeout=5):
            task_id = futures[future]
            result = future.result()
            print(result)
    except TimeoutError:
        print("Some tasks did not complete within 5 seconds")

        # Check which tasks are still running
        for future, task_id in futures.items():
            if not future.done():
                print(f"Task {task_id} is still running")
```

### Implementing Per-Task Timeouts

For individual task timeouts, you need a different approach.

```python
from concurrent.futures import ThreadPoolExecutor, as_completed, TimeoutError
import time

def fetch_with_timeout(url):
    """Simulate fetching a URL."""
    time.sleep(2)
    return f"Content from {url}"

urls = [
    "https://fast-api.example.com",
    "https://slow-api.example.com",
    "https://medium-api.example.com",
]

with ThreadPoolExecutor(max_workers=3) as executor:
    futures = {executor.submit(fetch_with_timeout, url): url for url in urls}

    results = {}

    for future in as_completed(futures):
        url = futures[future]
        try:
            # Each result() call has its own timeout
            result = future.result(timeout=3)
            results[url] = result
        except TimeoutError:
            results[url] = "TIMEOUT"
        except Exception as e:
            results[url] = f"ERROR: {e}"

    for url, result in results.items():
        print(f"{url}: {result}")
```

## ProcessPoolExecutor for CPU-Bound Tasks

For CPU-intensive work, `ProcessPoolExecutor` bypasses Python's GIL by using separate processes.

### When to Use ProcessPoolExecutor

| Scenario | Use ThreadPoolExecutor | Use ProcessPoolExecutor |
|----------|----------------------|------------------------|
| HTTP requests | Yes | No |
| File I/O | Yes | No |
| Database queries | Yes | No |
| Image processing | No | Yes |
| Mathematical computation | No | Yes |
| Data parsing | Maybe | Maybe |
| Compression | No | Yes |

### Basic ProcessPoolExecutor Example

```python
from concurrent.futures import ProcessPoolExecutor
import math

def compute_factorial(n):
    """CPU-intensive factorial calculation."""
    result = math.factorial(n)
    return f"factorial({n}) has {len(str(result))} digits"

# Note: ProcessPoolExecutor code must be protected by if __name__ == "__main__"
# on Windows to avoid spawning issues
if __name__ == "__main__":
    numbers = [10000, 20000, 30000, 40000, 50000]

    with ProcessPoolExecutor(max_workers=4) as executor:
        results = executor.map(compute_factorial, numbers)

        for result in results:
            print(result)
```

### Important Considerations for ProcessPoolExecutor

```python
from concurrent.futures import ProcessPoolExecutor
import os

def get_process_info(x):
    """Show that each task runs in a different process."""
    return f"Value {x} processed by PID {os.getpid()}"

# Functions must be defined at module level (not inside other functions)
# Arguments and return values must be picklable

if __name__ == "__main__":
    print(f"Main process PID: {os.getpid()}")

    with ProcessPoolExecutor(max_workers=3) as executor:
        results = executor.map(get_process_info, range(6))

        for result in results:
            print(result)
```

Sample output:
```
Main process PID: 12345
Value 0 processed by PID 12346
Value 1 processed by PID 12347
Value 2 processed by PID 12348
Value 3 processed by PID 12346
Value 4 processed by PID 12347
Value 5 processed by PID 12348
```

### Sharing Data Between Processes

Since processes have separate memory spaces, sharing data requires special handling.

```python
from concurrent.futures import ProcessPoolExecutor
from multiprocessing import Manager

def process_with_shared_state(args):
    """Worker function that updates shared state."""
    item, shared_dict_proxy = args
    result = item * 2
    # This works because Manager creates a proxy object
    shared_dict_proxy[item] = result
    return result

if __name__ == "__main__":
    # Use Manager for shared state across processes
    with Manager() as manager:
        shared_results = manager.dict()

        items = [1, 2, 3, 4, 5]
        args_list = [(item, shared_results) for item in items]

        with ProcessPoolExecutor(max_workers=3) as executor:
            list(executor.map(process_with_shared_state, args_list))

        print(f"Shared results: {dict(shared_results)}")
```

## Practical Examples

Let's look at some real-world use cases.

### Parallel HTTP Requests

```python
from concurrent.futures import ThreadPoolExecutor, as_completed
import urllib.request
import time

def fetch_url(url):
    """Fetch a URL and return status information."""
    start_time = time.time()
    try:
        with urllib.request.urlopen(url, timeout=10) as response:
            content_length = len(response.read())
            elapsed = time.time() - start_time
            return {
                "url": url,
                "status": response.status,
                "size": content_length,
                "time": round(elapsed, 2)
            }
    except Exception as e:
        elapsed = time.time() - start_time
        return {
            "url": url,
            "status": "error",
            "error": str(e),
            "time": round(elapsed, 2)
        }

urls = [
    "https://httpbin.org/delay/1",
    "https://httpbin.org/delay/2",
    "https://httpbin.org/status/200",
    "https://httpbin.org/status/404",
    "https://httpbin.org/get",
]

print("Fetching URLs in parallel...")
start = time.time()

with ThreadPoolExecutor(max_workers=5) as executor:
    future_to_url = {executor.submit(fetch_url, url): url for url in urls}

    for future in as_completed(future_to_url):
        result = future.result()
        if result["status"] == "error":
            print(f"FAIL: {result['url']} - {result['error']}")
        else:
            print(f"OK: {result['url']} - {result['status']} ({result['size']} bytes, {result['time']}s)")

total_time = time.time() - start
print(f"\nTotal time: {total_time:.2f}s (sequential would be ~{sum(r['time'] for r in [fetch_url(u) for u in urls[:1]])*len(urls):.0f}s)")
```

### Parallel File Processing

```python
from concurrent.futures import ThreadPoolExecutor, as_completed
import os
import hashlib

def calculate_file_hash(filepath):
    """Calculate MD5 hash of a file."""
    hash_md5 = hashlib.md5()
    try:
        with open(filepath, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_md5.update(chunk)
        return {
            "file": filepath,
            "hash": hash_md5.hexdigest(),
            "size": os.path.getsize(filepath)
        }
    except Exception as e:
        return {
            "file": filepath,
            "error": str(e)
        }

def find_files(directory, extension=None):
    """Find all files in a directory, optionally filtered by extension."""
    files = []
    for root, dirs, filenames in os.walk(directory):
        for filename in filenames:
            if extension is None or filename.endswith(extension):
                files.append(os.path.join(root, filename))
    return files

# Example usage
directory = "/path/to/your/files"
files = find_files(directory, ".py")

print(f"Found {len(files)} Python files")

with ThreadPoolExecutor(max_workers=8) as executor:
    futures = {executor.submit(calculate_file_hash, f): f for f in files}

    for future in as_completed(futures):
        result = future.result()
        if "error" in result:
            print(f"Error: {result['file']} - {result['error']}")
        else:
            print(f"{result['hash']}  {result['file']} ({result['size']} bytes)")
```

### Rate-Limited API Client

```python
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading
import time

class RateLimitedExecutor:
    """Execute tasks with rate limiting."""

    def __init__(self, max_workers=5, calls_per_second=10):
        self.executor = ThreadPoolExecutor(max_workers=max_workers)
        self.calls_per_second = calls_per_second
        self.lock = threading.Lock()
        self.last_call_time = 0

    def _rate_limited_call(self, fn, *args, **kwargs):
        """Wrap function call with rate limiting."""
        with self.lock:
            current_time = time.time()
            time_since_last = current_time - self.last_call_time
            min_interval = 1.0 / self.calls_per_second

            if time_since_last < min_interval:
                time.sleep(min_interval - time_since_last)

            self.last_call_time = time.time()

        return fn(*args, **kwargs)

    def submit(self, fn, *args, **kwargs):
        """Submit a rate-limited task."""
        return self.executor.submit(self._rate_limited_call, fn, *args, **kwargs)

    def shutdown(self, wait=True):
        self.executor.shutdown(wait=wait)

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.shutdown(wait=True)
        return False

def api_call(endpoint):
    """Simulate an API call."""
    print(f"[{time.strftime('%H:%M:%S')}] Calling {endpoint}")
    time.sleep(0.1)
    return f"Response from {endpoint}"

# Execute with rate limiting (5 calls per second)
with RateLimitedExecutor(max_workers=10, calls_per_second=5) as executor:
    endpoints = [f"/api/resource/{i}" for i in range(15)]
    futures = [executor.submit(api_call, ep) for ep in endpoints]

    for future in as_completed(futures):
        result = future.result()
```

### Progress Bar Integration

```python
from concurrent.futures import ThreadPoolExecutor, as_completed
import time

def process_item(item):
    """Process a single item."""
    time.sleep(0.5)  # Simulate work
    return item * 2

def print_progress_bar(current, total, bar_length=40):
    """Print a simple progress bar."""
    percent = current / total
    filled = int(bar_length * percent)
    bar = "=" * filled + "-" * (bar_length - filled)
    print(f"\r[{bar}] {current}/{total} ({percent*100:.1f}%)", end="", flush=True)

items = list(range(50))
results = []

with ThreadPoolExecutor(max_workers=10) as executor:
    futures = {executor.submit(process_item, item): item for item in items}
    completed = 0

    print_progress_bar(0, len(items))

    for future in as_completed(futures):
        result = future.result()
        results.append(result)
        completed += 1
        print_progress_bar(completed, len(items))

print()  # New line after progress bar
print(f"Processed {len(results)} items")
```

## Best Practices and Common Pitfalls

### Do: Use Context Managers

```python
# Good: Resources are properly cleaned up
with ThreadPoolExecutor(max_workers=4) as executor:
    results = executor.map(process, items)

# Avoid: Manual management can lead to resource leaks
executor = ThreadPoolExecutor(max_workers=4)
try:
    results = executor.map(process, items)
finally:
    executor.shutdown(wait=True)
```

### Do: Handle Exceptions Properly

```python
# Good: Each task's exception is handled
with ThreadPoolExecutor(max_workers=4) as executor:
    futures = [executor.submit(risky_task, i) for i in range(10)]

    for future in as_completed(futures):
        try:
            result = future.result()
        except Exception as e:
            logger.error(f"Task failed: {e}")
```

### Avoid: Sharing Mutable State Without Locks

```python
import threading

# Bad: Race condition
results = []
def bad_append(value):
    results.append(value)  # Not thread-safe

# Good: Use locks for shared mutable state
results = []
results_lock = threading.Lock()

def safe_append(value):
    with results_lock:
        results.append(value)

# Better: Collect results from futures instead
with ThreadPoolExecutor(max_workers=4) as executor:
    futures = [executor.submit(process, i) for i in range(10)]
    results = [f.result() for f in as_completed(futures)]
```

### Avoid: Blocking in the Main Thread Unnecessarily

```python
# Bad: Submitting one at a time and waiting
with ThreadPoolExecutor(max_workers=4) as executor:
    for item in items:
        future = executor.submit(process, item)
        result = future.result()  # Blocks, defeating parallelism

# Good: Submit all, then collect results
with ThreadPoolExecutor(max_workers=4) as executor:
    futures = [executor.submit(process, item) for item in items]
    results = [f.result() for f in futures]
```

### Thread-Safe Patterns

```python
from concurrent.futures import ThreadPoolExecutor
from queue import Queue
import threading

# Pattern: Thread-safe counter
class ThreadSafeCounter:
    def __init__(self):
        self._count = 0
        self._lock = threading.Lock()

    def increment(self):
        with self._lock:
            self._count += 1
            return self._count

    @property
    def value(self):
        with self._lock:
            return self._count

# Pattern: Thread-safe result collection
def collect_results_safely(executor, tasks):
    result_queue = Queue()

    def task_wrapper(task_fn, *args):
        result = task_fn(*args)
        result_queue.put(result)
        return result

    futures = [
        executor.submit(task_wrapper, task, *args)
        for task, args in tasks
    ]

    # Wait for all to complete
    for future in futures:
        future.result()

    # Collect from queue
    results = []
    while not result_queue.empty():
        results.append(result_queue.get())

    return results
```

## Summary

The `concurrent.futures` module provides a powerful yet simple interface for parallel execution in Python:

- Use `ThreadPoolExecutor` for I/O-bound tasks like HTTP requests, file operations, and database queries
- Use `ProcessPoolExecutor` for CPU-bound tasks like image processing, mathematical computation, and data transformation
- Use `submit()` for fine-grained control over individual tasks and their futures
- Use `map()` for simpler parallel iteration when you need results in order
- Use `as_completed()` to process results as soon as they're available
- Always handle exceptions properly since they don't propagate automatically
- Use context managers to ensure proper resource cleanup
- Be mindful of shared state and use appropriate synchronization primitives

The module strikes a good balance between simplicity and power. For most parallel execution needs, it's the right tool for the job.
