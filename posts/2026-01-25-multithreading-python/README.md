# How to Multithread in Python with threading Module

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Threading, Concurrency, Multithreading, Performance

Description: Learn how to use Python's threading module for concurrent programming. This guide covers thread creation, synchronization, thread pools, and best practices for I/O-bound tasks.

---

Python's `threading` module enables concurrent execution of code. While Python's Global Interpreter Lock (GIL) limits true parallelism for CPU-bound tasks, threading is excellent for I/O-bound operations like network requests, file operations, and database queries.

## Understanding Threading vs Multiprocessing

```python
# Threading: Good for I/O-bound tasks
# - Network requests
# - File operations
# - Database queries
# - Waiting for user input

# Multiprocessing: Good for CPU-bound tasks
# - Mathematical calculations
# - Image processing
# - Data transformation

# The GIL (Global Interpreter Lock) means only one thread
# executes Python bytecode at a time. But threads release
# the GIL during I/O operations, allowing concurrency.
```

## Basic Thread Creation

### Method 1: Using Thread with target function

```python
import threading
import time

def worker(name, delay):
    """Simulates work with a sleep."""
    print(f"Worker {name} starting")
    time.sleep(delay)
    print(f"Worker {name} finished")

# Create threads
thread1 = threading.Thread(target=worker, args=("A", 2))
thread2 = threading.Thread(target=worker, args=("B", 1))

# Start threads
thread1.start()
thread2.start()

# Wait for both to complete
thread1.join()
thread2.join()

print("All workers finished")
```

### Method 2: Subclassing Thread

```python
import threading
import time

class DownloadThread(threading.Thread):
    """Thread that simulates downloading a file."""

    def __init__(self, url, filename):
        super().__init__()
        self.url = url
        self.filename = filename
        self.result = None

    def run(self):
        """Called when thread starts."""
        print(f"Downloading {self.url}")
        time.sleep(2)  # Simulate download
        self.result = f"Content of {self.filename}"
        print(f"Finished downloading {self.filename}")

# Create and start threads
threads = [
    DownloadThread("http://example.com/file1", "file1.txt"),
    DownloadThread("http://example.com/file2", "file2.txt"),
]

for t in threads:
    t.start()

for t in threads:
    t.join()

# Access results
for t in threads:
    print(f"Result: {t.result}")
```

## Thread Pools with concurrent.futures

For managing multiple threads, use `ThreadPoolExecutor`:

```python
from concurrent.futures import ThreadPoolExecutor, as_completed
import time

def fetch_url(url):
    """Simulate fetching a URL."""
    print(f"Fetching {url}")
    time.sleep(1)  # Simulate network delay
    return f"Content from {url}"

urls = [
    "http://example.com/page1",
    "http://example.com/page2",
    "http://example.com/page3",
    "http://example.com/page4",
    "http://example.com/page5",
]

# Use thread pool
with ThreadPoolExecutor(max_workers=3) as executor:
    # Submit all tasks
    futures = {executor.submit(fetch_url, url): url for url in urls}

    # Process results as they complete
    for future in as_completed(futures):
        url = futures[future]
        try:
            result = future.result()
            print(f"Result for {url}: {result[:30]}...")
        except Exception as e:
            print(f"Error fetching {url}: {e}")

# Alternative: map() for simpler cases
with ThreadPoolExecutor(max_workers=3) as executor:
    results = list(executor.map(fetch_url, urls))
    for url, result in zip(urls, results):
        print(f"{url}: {result}")
```

## Thread Synchronization

### Lock for Mutual Exclusion

```python
import threading

class Counter:
    """Thread-safe counter using a lock."""

    def __init__(self):
        self.value = 0
        self.lock = threading.Lock()

    def increment(self):
        with self.lock:  # Acquire and release automatically
            self.value += 1

    def get(self):
        with self.lock:
            return self.value

# Without lock, this would have race conditions
counter = Counter()
threads = []

def worker():
    for _ in range(10000):
        counter.increment()

for _ in range(10):
    t = threading.Thread(target=worker)
    threads.append(t)
    t.start()

for t in threads:
    t.join()

print(f"Final count: {counter.get()}")  # Should be 100000
```

### RLock for Reentrant Locking

```python
import threading

class SafeDict:
    """Thread-safe dictionary with reentrant lock."""

    def __init__(self):
        self._data = {}
        self._lock = threading.RLock()  # Allows re-entry from same thread

    def get(self, key, default=None):
        with self._lock:
            return self._data.get(key, default)

    def set(self, key, value):
        with self._lock:
            self._data[key] = value

    def update_if_greater(self, key, value):
        with self._lock:
            # This method calls get() which also acquires lock
            # RLock allows this; regular Lock would deadlock
            current = self.get(key, 0)
            if value > current:
                self.set(key, value)
```

### Event for Signaling

```python
import threading
import time

# Event for signaling between threads
shutdown_event = threading.Event()

def worker():
    """Worker that runs until shutdown signal."""
    while not shutdown_event.is_set():
        print("Working...")
        # Wait with timeout to check shutdown periodically
        shutdown_event.wait(timeout=1.0)
    print("Worker shutting down")

thread = threading.Thread(target=worker)
thread.start()

time.sleep(3)  # Let worker run for 3 seconds

shutdown_event.set()  # Signal shutdown
thread.join()
print("Worker stopped")
```

### Semaphore for Limiting Concurrency

```python
import threading
import time

# Semaphore limits concurrent access
max_connections = threading.Semaphore(3)

def access_database(connection_id):
    """Simulate database access with limited connections."""
    with max_connections:
        print(f"Connection {connection_id} acquired")
        time.sleep(2)  # Simulate query
        print(f"Connection {connection_id} released")

threads = []
for i in range(10):
    t = threading.Thread(target=access_database, args=(i,))
    threads.append(t)
    t.start()

for t in threads:
    t.join()
```

### Condition for Complex Synchronization

```python
import threading
import time
from collections import deque

class ThreadSafeQueue:
    """Queue with wait/notify for producer/consumer pattern."""

    def __init__(self, maxsize=10):
        self.queue = deque()
        self.maxsize = maxsize
        self.condition = threading.Condition()

    def put(self, item):
        with self.condition:
            while len(self.queue) >= self.maxsize:
                self.condition.wait()  # Wait for space
            self.queue.append(item)
            self.condition.notify_all()  # Notify consumers

    def get(self):
        with self.condition:
            while len(self.queue) == 0:
                self.condition.wait()  # Wait for items
            item = self.queue.popleft()
            self.condition.notify_all()  # Notify producers
            return item

# Producer/Consumer example
queue = ThreadSafeQueue(maxsize=5)

def producer():
    for i in range(10):
        queue.put(i)
        print(f"Produced {i}")
        time.sleep(0.1)

def consumer(name):
    for _ in range(5):
        item = queue.get()
        print(f"Consumer {name} got {item}")
        time.sleep(0.2)

threads = [
    threading.Thread(target=producer),
    threading.Thread(target=consumer, args=("A",)),
    threading.Thread(target=consumer, args=("B",)),
]

for t in threads:
    t.start()

for t in threads:
    t.join()
```

## Daemon Threads

Daemon threads are killed when the main program exits:

```python
import threading
import time

def background_task():
    """Long-running background task."""
    while True:
        print("Background task running...")
        time.sleep(1)

# Daemon thread - will be killed when main exits
thread = threading.Thread(target=background_task, daemon=True)
thread.start()

print("Main program running")
time.sleep(3)
print("Main program exiting")
# Daemon thread is automatically killed here
```

## Thread-Local Data

```python
import threading

# Thread-local storage
thread_local = threading.local()

def process_request(request_id):
    """Each thread has its own copy of thread_local data."""
    thread_local.request_id = request_id
    thread_local.user = f"user_{request_id}"

    # Functions can access thread-local data
    do_work()

def do_work():
    """Access thread-local data."""
    print(f"Processing request {thread_local.request_id} for {thread_local.user}")

threads = []
for i in range(3):
    t = threading.Thread(target=process_request, args=(i,))
    threads.append(t)
    t.start()

for t in threads:
    t.join()
```

## Real World Example: Parallel HTTP Requests

```python
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
import time
from dataclasses import dataclass

@dataclass
class Response:
    url: str
    status: int
    body: str
    elapsed: float

def fetch(url):
    """Simulate HTTP request."""
    start = time.time()
    # Simulate variable response times
    time.sleep(0.5 + (hash(url) % 10) / 10)
    elapsed = time.time() - start

    return Response(
        url=url,
        status=200,
        body=f"Content from {url}",
        elapsed=elapsed
    )

def fetch_all(urls, max_workers=10, timeout=30):
    """Fetch multiple URLs concurrently."""
    results = []
    errors = []

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_url = {
            executor.submit(fetch, url): url
            for url in urls
        }

        for future in as_completed(future_to_url, timeout=timeout):
            url = future_to_url[future]
            try:
                response = future.result()
                results.append(response)
            except Exception as e:
                errors.append((url, str(e)))

    return results, errors

# Usage
urls = [f"https://api.example.com/item/{i}" for i in range(20)]

start = time.time()
results, errors = fetch_all(urls, max_workers=5)
elapsed = time.time() - start

print(f"Fetched {len(results)} URLs in {elapsed:.2f}s")
print(f"Errors: {len(errors)}")

# Sequential would take much longer
# 20 URLs * ~0.5-1s each = 10-20 seconds
# Concurrent with 5 workers = ~4-5 seconds
```

## Best Practices

### 1. Use Context Managers for Locks

```python
# Good
with lock:
    # Critical section
    pass

# Bad - might forget to release
lock.acquire()
# Critical section
lock.release()
```

### 2. Avoid Deadlocks

```python
# Deadlock: Thread A holds lock1, waits for lock2
#           Thread B holds lock2, waits for lock1

# Solution: Always acquire locks in the same order
lock1 = threading.Lock()
lock2 = threading.Lock()

def safe_operation():
    with lock1:
        with lock2:
            # Always lock1 then lock2
            pass
```

### 3. Prefer Thread Pools

```python
# Good: Reuses threads
with ThreadPoolExecutor(max_workers=10) as executor:
    executor.map(process, items)

# Bad: Creates many threads
threads = [threading.Thread(target=process, args=(item,)) for item in items]
```

### 4. Set Timeouts

```python
# Avoid hanging forever
thread.join(timeout=30)
if thread.is_alive():
    print("Thread did not finish in time")
```

## Summary

| Concept | Use Case |
|---------|----------|
| `Thread` | Basic thread creation |
| `ThreadPoolExecutor` | Managing multiple threads |
| `Lock` | Mutual exclusion |
| `RLock` | Reentrant locking |
| `Event` | Thread signaling |
| `Semaphore` | Limit concurrency |
| `Condition` | Complex synchronization |
| `daemon=True` | Background tasks |
| `threading.local()` | Thread-local storage |

Threading is perfect for I/O-bound tasks in Python. For CPU-bound work, use `multiprocessing` instead. Always protect shared state with locks and prefer high-level abstractions like `ThreadPoolExecutor`.
