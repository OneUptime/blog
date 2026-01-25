# How to Debug Memory Leaks in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Memory Leaks, Debugging, Performance, Memory Management

Description: Learn to identify and fix memory leaks in Python applications using tracemalloc, objgraph, and memory_profiler. Understand common causes and prevention strategies.

---

> Memory leaks in Python are often unexpected since Python has automatic garbage collection. However, they do happen, and when they do, your application slowly consumes more and more memory until it crashes or gets killed by the OS. This guide shows you how to find and fix them.

While Python's garbage collector handles most memory management automatically, memory leaks can still occur. Common causes include circular references with custom `__del__` methods, caches that grow unbounded, and references held in global state or closures.

---

## Understanding Python Memory Management

Python uses reference counting plus a garbage collector for cyclic references:

```python
import sys

# Reference counting in action
a = [1, 2, 3]
print(sys.getrefcount(a))  # 2 (a + temporary for getrefcount)

b = a  # Add another reference
print(sys.getrefcount(a))  # 3

del b  # Remove reference
print(sys.getrefcount(a))  # 2

# When refcount hits 0, memory is freed
del a  # List is garbage collected
```

Memory leaks happen when references are kept alive unintentionally.

---

## Detecting Memory Leaks

### Using tracemalloc (Standard Library)

The `tracemalloc` module tracks memory allocations:

```python
import tracemalloc

# Start tracing
tracemalloc.start()

# Your code here
data = []
for i in range(100000):
    data.append({'id': i, 'value': 'x' * 1000})

# Get memory snapshot
snapshot = tracemalloc.take_snapshot()
top_stats = snapshot.statistics('lineno')

print("Top 10 memory allocations:")
for stat in top_stats[:10]:
    print(stat)
```

### Comparing Snapshots

Find what allocations grew between two points:

```python
import tracemalloc

tracemalloc.start()

# First snapshot
snapshot1 = tracemalloc.take_snapshot()

# Code that might leak
leaked_data = []
for i in range(10000):
    leaked_data.append('x' * 1000)

# Second snapshot
snapshot2 = tracemalloc.take_snapshot()

# Compare snapshots
top_stats = snapshot2.compare_to(snapshot1, 'lineno')

print("Memory changes:")
for stat in top_stats[:10]:
    print(stat)
```

### Monitor Memory Over Time

```python
import tracemalloc
import time

def monitor_memory(interval=5, duration=60):
    """Monitor memory usage over time."""

    tracemalloc.start()
    start_time = time.time()

    snapshots = []

    while time.time() - start_time < duration:
        snapshot = tracemalloc.take_snapshot()
        current, peak = tracemalloc.get_traced_memory()

        print(f"Time: {time.time() - start_time:.1f}s")
        print(f"  Current memory: {current / 1024 / 1024:.2f} MB")
        print(f"  Peak memory: {peak / 1024 / 1024:.2f} MB")

        snapshots.append((time.time(), snapshot))
        time.sleep(interval)

    tracemalloc.stop()
    return snapshots
```

---

## Using memory_profiler

Install and use `memory_profiler` for line-by-line analysis:

```bash
pip install memory_profiler
```

```python
from memory_profiler import profile

@profile
def memory_hungry_function():
    # This decorator shows memory usage per line
    data = []

    for i in range(10000):
        data.append([0] * 1000)  # This line will show memory increase

    del data  # Memory should decrease here

    return "done"

if __name__ == '__main__':
    memory_hungry_function()
```

Run with:

```bash
python -m memory_profiler script.py
```

Output shows memory per line:

```
Line #    Mem usage    Increment   Line Contents
================================================
     4     15.4 MiB     15.4 MiB   @profile
     5                             def memory_hungry_function():
     6     15.4 MiB      0.0 MiB       data = []
     7     92.1 MiB     76.7 MiB       for i in range(10000):
     8                                     data.append([0] * 1000)
     9     15.4 MiB    -76.7 MiB       del data
    10     15.4 MiB      0.0 MiB       return "done"
```

---

## Using objgraph

`objgraph` helps visualize object references:

```bash
pip install objgraph
```

```python
import objgraph

# Show most common types
objgraph.show_most_common_types(limit=10)

# Show growth in object counts
objgraph.show_growth(limit=10)

# After some operations
process_data()

# Show what grew
objgraph.show_growth(limit=10)  # Shows new object counts
```

### Find Leaked Objects

```python
import objgraph

# Find objects keeping something alive
class LeakyClass:
    pass

# Create and "leak" an instance
leaked = LeakyClass()
some_cache = {'leaked': leaked}

# Find what references LeakyClass instances
objgraph.show_backrefs(
    objgraph.by_type('LeakyClass')[0],
    filename='leak_refs.png'  # Generates a graph image
)
```

---

## Common Memory Leak Patterns

### 1. Unbounded Caches

```python
# LEAKY: Cache grows forever
cache = {}

def get_data(key):
    if key not in cache:
        cache[key] = expensive_computation(key)
    return cache[key]

# Every unique key adds to memory permanently
```

**Fix: Use bounded cache**

```python
from functools import lru_cache

# LRU cache with maximum size
@lru_cache(maxsize=1000)
def get_data(key):
    return expensive_computation(key)

# Or use cachetools for more options
from cachetools import TTLCache

# Cache with time-to-live and max size
cache = TTLCache(maxsize=1000, ttl=3600)
```

### 2. Event Handlers Not Removed

```python
# LEAKY: Handlers accumulate
class Publisher:
    def __init__(self):
        self.handlers = []

    def subscribe(self, handler):
        self.handlers.append(handler)

    # Missing unsubscribe method!

publisher = Publisher()

class Subscriber:
    def __init__(self):
        publisher.subscribe(self.handle)  # Reference kept forever

    def handle(self, event):
        pass
```

**Fix: Use weak references or explicit cleanup**

```python
import weakref

class Publisher:
    def __init__(self):
        self.handlers = []

    def subscribe(self, handler):
        # Store weak reference
        self.handlers.append(weakref.ref(handler))

    def unsubscribe(self, handler):
        self.handlers = [h for h in self.handlers if h() is not handler]

    def notify(self, event):
        # Clean up dead references during notification
        live_handlers = []
        for handler_ref in self.handlers:
            handler = handler_ref()
            if handler is not None:
                handler(event)
                live_handlers.append(handler_ref)
        self.handlers = live_handlers
```

### 3. Circular References with __del__

```python
# LEAKY: Circular reference with __del__
class Node:
    def __init__(self):
        self.parent = None
        self.children = []

    def add_child(self, child):
        child.parent = self  # Circular reference
        self.children.append(child)

    def __del__(self):
        # Having __del__ can prevent garbage collection of cycles
        print(f"Deleting {self}")
```

**Fix: Use weakref for back-references**

```python
import weakref

class Node:
    def __init__(self):
        self._parent = None
        self.children = []

    @property
    def parent(self):
        return self._parent() if self._parent else None

    @parent.setter
    def parent(self, value):
        self._parent = weakref.ref(value) if value else None

    def add_child(self, child):
        child.parent = self  # Now a weak reference
        self.children.append(child)
```

### 4. Closures Capturing References

```python
# LEAKY: Lambda captures entire scope
def create_handlers(data_list):
    handlers = []
    for item in data_list:
        # This lambda captures the loop variable
        handlers.append(lambda: process(item))
    return handlers
```

**Fix: Explicitly bind the variable**

```python
def create_handlers(data_list):
    handlers = []
    for item in data_list:
        # Bind item as default argument
        handlers.append(lambda x=item: process(x))
    return handlers
```

### 5. Global State Accumulation

```python
# LEAKY: Global list grows forever
results = []

def process_request(request):
    result = compute(request)
    results.append(result)  # Never cleaned up
    return result
```

**Fix: Use bounded collections or explicit cleanup**

```python
from collections import deque

# Fixed-size collection
results = deque(maxlen=1000)

def process_request(request):
    result = compute(request)
    results.append(result)  # Old items automatically removed
    return result
```

---

## Memory Leak Detection Script

A comprehensive script to detect leaks:

```python
import gc
import sys
import tracemalloc
from collections import defaultdict

class MemoryLeakDetector:
    """Detect memory leaks by tracking object counts."""

    def __init__(self):
        self.baseline = None

    def snapshot(self):
        """Take snapshot of object counts by type."""
        gc.collect()  # Force garbage collection first

        counts = defaultdict(int)
        for obj in gc.get_objects():
            counts[type(obj).__name__] += 1

        return dict(counts)

    def set_baseline(self):
        """Set baseline for comparison."""
        self.baseline = self.snapshot()
        print("Baseline set")

    def compare(self, threshold=100):
        """Compare current state to baseline."""
        if not self.baseline:
            print("No baseline set. Call set_baseline() first.")
            return

        current = self.snapshot()

        print("\nObject count changes:")
        print("-" * 50)

        changes = []
        for type_name, count in current.items():
            baseline_count = self.baseline.get(type_name, 0)
            diff = count - baseline_count

            if abs(diff) >= threshold:
                changes.append((type_name, baseline_count, count, diff))

        changes.sort(key=lambda x: abs(x[3]), reverse=True)

        for type_name, old, new, diff in changes:
            sign = '+' if diff > 0 else ''
            print(f"{type_name}: {old} -> {new} ({sign}{diff})")

    def find_leaking_objects(self, type_name):
        """Find all objects of a specific type."""
        gc.collect()
        return [obj for obj in gc.get_objects()
                if type(obj).__name__ == type_name]


# Usage
detector = MemoryLeakDetector()
detector.set_baseline()

# Run your code here
# ...

detector.compare()
```

---

## Fixing Memory Leaks in Long-Running Applications

### Periodic Cleanup

```python
import gc
import threading
import time

def periodic_gc(interval=300):
    """Run garbage collection periodically."""
    while True:
        time.sleep(interval)
        collected = gc.collect()
        print(f"GC collected {collected} objects")

# Start cleanup thread
cleanup_thread = threading.Thread(target=periodic_gc, daemon=True)
cleanup_thread.start()
```

### Connection Pool Management

```python
from contextlib import contextmanager
from queue import Queue

class ConnectionPool:
    """Connection pool with proper cleanup."""

    def __init__(self, create_connection, max_size=10):
        self.create_connection = create_connection
        self.pool = Queue(maxsize=max_size)
        self.active = 0
        self.max_size = max_size

    @contextmanager
    def connection(self):
        conn = self._get_connection()
        try:
            yield conn
        finally:
            self._return_connection(conn)

    def _get_connection(self):
        if not self.pool.empty():
            return self.pool.get()
        if self.active < self.max_size:
            self.active += 1
            return self.create_connection()
        return self.pool.get()  # Block until available

    def _return_connection(self, conn):
        self.pool.put(conn)

# Usage
pool = ConnectionPool(create_database_connection)

with pool.connection() as conn:
    # Use connection
    pass
# Connection automatically returned to pool
```

---

## Summary

To debug memory leaks in Python:

1. **Detect** with `tracemalloc` for allocation tracking
2. **Profile** with `memory_profiler` for line-by-line analysis
3. **Visualize** with `objgraph` for reference graphs
4. **Compare** snapshots to see what grows over time

Common causes and fixes:
- Unbounded caches: Use `lru_cache` or TTL caches
- Event handlers: Use weak references or explicit cleanup
- Circular references: Use `weakref` for back-references
- Closures: Be careful what variables are captured
- Global state: Use bounded collections

Regular monitoring in production helps catch leaks before they cause outages.
