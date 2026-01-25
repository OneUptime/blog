# How to Fix "MemoryError" in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, MemoryError, Performance, Optimization, Debugging, Memory Management

Description: Learn how to diagnose and fix MemoryError in Python. This guide covers memory profiling, generators, chunked processing, and optimization techniques for handling large datasets.

---

> A MemoryError in Python occurs when your program runs out of available memory. This typically happens when processing large datasets, creating massive data structures, or accumulating data in memory over time.

This guide shows you how to identify memory issues, understand their causes, and implement solutions that let your Python programs handle large amounts of data efficiently.

---

## Understanding MemoryError

Python raises MemoryError when it cannot allocate more memory for an operation. This usually means:

1. You are trying to load more data into memory than available
2. You are creating very large data structures
3. You have memory leaks causing gradual memory exhaustion

```python
# This will cause MemoryError on most systems
# Do not run this!
huge_list = [0] * (10 ** 10)  # 10 billion integers
```

---

## Diagnosing Memory Issues

### Using memory_profiler

```bash
pip install memory_profiler
```

```python
# memory_profile_example.py
# Profile memory usage line by line
from memory_profiler import profile

@profile
def memory_hungry_function():
    """Function that uses a lot of memory."""
    # Each line shows memory usage
    data = []
    for i in range(1000000):
        data.append(i * 2)

    # Process data
    result = sum(data)
    return result

if __name__ == "__main__":
    memory_hungry_function()

# Run with: python -m memory_profiler memory_profile_example.py
```

### Tracking Memory Usage Programmatically

```python
# memory_tracking.py
# Track memory usage in your code
import sys
import tracemalloc

def get_size(obj, seen=None):
    """Recursively calculate the size of an object."""
    size = sys.getsizeof(obj)
    if seen is None:
        seen = set()

    obj_id = id(obj)
    if obj_id in seen:
        return 0

    seen.add(obj_id)

    if isinstance(obj, dict):
        size += sum([get_size(v, seen) for v in obj.values()])
        size += sum([get_size(k, seen) for k in obj.keys()])
    elif hasattr(obj, '__dict__'):
        size += get_size(obj.__dict__, seen)
    elif hasattr(obj, '__iter__') and not isinstance(obj, (str, bytes, bytearray)):
        size += sum([get_size(i, seen) for i in obj])

    return size

# Using tracemalloc for detailed tracking
def analyze_memory_usage():
    """Analyze memory allocations."""
    tracemalloc.start()

    # Your code here
    data = [i ** 2 for i in range(100000)]

    snapshot = tracemalloc.take_snapshot()
    top_stats = snapshot.statistics('lineno')

    print("Top 10 memory allocations:")
    for stat in top_stats[:10]:
        print(stat)

    tracemalloc.stop()

analyze_memory_usage()
```

---

## Solution 1: Use Generators Instead of Lists

Generators produce values one at a time, using constant memory regardless of data size.

```python
# generators_solution.py
# Replace lists with generators for memory efficiency

# BAD: Loads entire dataset into memory
def load_all_records():
    """Load all records - memory intensive."""
    records = []
    with open('huge_file.csv') as f:
        for line in f:
            records.append(process_line(line))
    return records  # All data in memory

# GOOD: Generate records one at a time
def stream_records():
    """Stream records - constant memory usage."""
    with open('huge_file.csv') as f:
        for line in f:
            yield process_line(line)  # One record at a time

# Usage
for record in stream_records():
    process(record)  # Memory for one record only


# Generator expressions instead of list comprehensions
# BAD: Creates list in memory
squares = [x ** 2 for x in range(10000000)]

# GOOD: Generator - lazy evaluation
squares = (x ** 2 for x in range(10000000))

# Sum without storing all values
total = sum(x ** 2 for x in range(10000000))
```

---

## Solution 2: Process Data in Chunks

When you need to process large files or datasets, do it in manageable chunks.

```python
# chunked_processing.py
# Process large files in chunks
import pandas as pd

# BAD: Load entire file
# df = pd.read_csv('huge_file.csv')  # MemoryError for large files

# GOOD: Process in chunks
def process_large_csv(filepath, chunk_size=10000):
    """Process a large CSV file in chunks."""
    results = []

    # Read file in chunks
    for chunk in pd.read_csv(filepath, chunksize=chunk_size):
        # Process each chunk
        chunk_result = chunk.groupby('category').sum()
        results.append(chunk_result)

    # Combine results
    final_result = pd.concat(results).groupby(level=0).sum()
    return final_result


# Chunked file reading without pandas
def read_file_in_chunks(filepath, chunk_size=8192):
    """Read a file in binary chunks."""
    with open(filepath, 'rb') as f:
        while True:
            chunk = f.read(chunk_size)
            if not chunk:
                break
            yield chunk

# Process a large text file
def count_words_in_large_file(filepath):
    """Count words without loading entire file."""
    word_count = 0
    buffer = ""

    with open(filepath, 'r') as f:
        for chunk in iter(lambda: f.read(8192), ''):
            # Handle words split across chunks
            buffer += chunk
            words = buffer.split()

            # Keep last partial word in buffer
            if not chunk.endswith((' ', '\n', '\t')):
                buffer = words[-1] if words else ""
                words = words[:-1]
            else:
                buffer = ""

            word_count += len(words)

    return word_count
```

---

## Solution 3: Use Memory-Efficient Data Structures

```python
# efficient_structures.py
# Use memory-efficient data structures
import array
import numpy as np
from collections import deque

# For numeric data, use array instead of list
# List stores Python objects - inefficient for numbers
numbers_list = [1.0] * 1000000  # ~80 MB

# Array stores raw values - much smaller
numbers_array = array.array('d', [1.0] * 1000000)  # ~8 MB

# NumPy arrays are even more efficient
numbers_numpy = np.ones(1000000)  # ~8 MB, plus fast operations


# Use __slots__ to reduce memory for many objects
class PointWithoutSlots:
    def __init__(self, x, y):
        self.x = x
        self.y = y

class PointWithSlots:
    __slots__ = ['x', 'y']

    def __init__(self, x, y):
        self.x = x
        self.y = y

# PointWithSlots uses ~50% less memory per instance


# Use deque with maxlen for sliding windows
# Automatically discards old items
recent_events = deque(maxlen=1000)
for event in stream_events():
    recent_events.append(event)  # Never exceeds 1000 items
```

---

## Solution 4: Clear References and Use Garbage Collection

```python
# garbage_collection.py
# Manage memory by clearing references
import gc

def process_batch(batch_data):
    """Process a batch and free memory."""
    # Process the data
    results = expensive_computation(batch_data)

    # Explicitly delete large objects when done
    del batch_data

    # Force garbage collection
    gc.collect()

    return results


# Circular references can prevent garbage collection
class Node:
    def __init__(self, value):
        self.value = value
        self.next = None

# This creates a circular reference
a = Node(1)
b = Node(2)
a.next = b
b.next = a  # Circular reference

# Break the cycle before deletion
a.next = None
b.next = None
del a, b
gc.collect()


# Use weakref to avoid circular references
import weakref

class CacheEntry:
    def __init__(self, data, cache):
        self.data = data
        # Use weak reference to avoid keeping cache alive
        self._cache = weakref.ref(cache)

    @property
    def cache(self):
        return self._cache()
```

---

## Solution 5: Use External Storage

For truly large datasets, process data externally.

```python
# external_storage.py
# Use external storage for large datasets
import sqlite3
import tempfile

def process_with_sqlite(data_generator):
    """Use SQLite as temporary storage for large datasets."""
    # Create temporary database
    with tempfile.NamedTemporaryFile(suffix='.db', delete=True) as tmp:
        conn = sqlite3.connect(tmp.name)
        cursor = conn.cursor()

        # Create table
        cursor.execute('''
            CREATE TABLE data (
                id INTEGER PRIMARY KEY,
                value REAL,
                category TEXT
            )
        ''')

        # Insert data in batches
        batch = []
        for item in data_generator:
            batch.append(item)
            if len(batch) >= 10000:
                cursor.executemany(
                    'INSERT INTO data (value, category) VALUES (?, ?)',
                    batch
                )
                conn.commit()
                batch = []

        # Insert remaining items
        if batch:
            cursor.executemany(
                'INSERT INTO data (value, category) VALUES (?, ?)',
                batch
            )
            conn.commit()

        # Now query without loading all data into memory
        cursor.execute('''
            SELECT category, AVG(value), COUNT(*)
            FROM data
            GROUP BY category
        ''')

        results = cursor.fetchall()
        conn.close()

        return results
```

---

## Solution 6: Use Memory-Mapped Files

```python
# memory_mapped.py
# Use memory-mapped files for large binary data
import mmap
import numpy as np

def read_large_binary_file(filepath):
    """Read a large binary file using memory mapping."""
    with open(filepath, 'rb') as f:
        # Memory-map the file
        # The OS handles paging data in/out of memory
        with mmap.mmap(f.fileno(), 0, access=mmap.ACCESS_READ) as mm:
            # Access data like a bytes object
            # Only loaded into memory when accessed
            header = mm[:100]  # Read first 100 bytes

            # Search without loading entire file
            position = mm.find(b'PATTERN')

            return header, position


# NumPy memory-mapped arrays
def process_large_array(filepath, shape, dtype='float64'):
    """Process a large array using memory mapping."""
    # Create or open a memory-mapped array
    arr = np.memmap(filepath, dtype=dtype, mode='r+', shape=shape)

    # Operations work on disk, not memory
    # Only accessed portions are loaded
    mean = arr.mean()
    arr[arr < 0] = 0  # Modify on disk

    # Flush changes to disk
    arr.flush()

    return mean
```

---

## Preventing Memory Issues

### Monitor Memory in Production

```python
# memory_monitor.py
# Monitor memory usage in your application
import psutil
import os

def get_memory_usage():
    """Get current memory usage of this process."""
    process = psutil.Process(os.getpid())
    memory_info = process.memory_info()

    return {
        'rss': memory_info.rss / 1024 / 1024,  # MB
        'vms': memory_info.vms / 1024 / 1024,  # MB
        'percent': process.memory_percent()
    }

def check_memory_threshold(threshold_mb=1000):
    """Raise warning if memory exceeds threshold."""
    usage = get_memory_usage()
    if usage['rss'] > threshold_mb:
        print(f"WARNING: Memory usage ({usage['rss']:.2f} MB) exceeds threshold")
        return True
    return False

# Use as a decorator
def memory_limit(max_mb):
    """Decorator to enforce memory limit."""
    def decorator(func):
        def wrapper(*args, **kwargs):
            if get_memory_usage()['rss'] > max_mb:
                raise MemoryError(f"Memory limit of {max_mb} MB exceeded")
            return func(*args, **kwargs)
        return wrapper
    return decorator
```

---

## Quick Reference

| Problem | Solution |
|---------|----------|
| Loading large files | Use generators or chunked reading |
| Large lists of numbers | Use array or numpy arrays |
| Many small objects | Use `__slots__` |
| Circular references | Use weakref or break cycles |
| Large intermediate results | Use generators, process in chunks |
| Need random access to large data | Use memory-mapped files or database |

---

## Conclusion

MemoryError in Python can be resolved by:

1. Using generators instead of lists for iteration
2. Processing data in chunks rather than all at once
3. Choosing memory-efficient data structures
4. Clearing references and triggering garbage collection
5. Using external storage for truly large datasets
6. Using memory-mapped files for large binary data

The key principle is to avoid loading more data into memory than necessary. Process data in streams or chunks whenever possible.

---

*Building data-intensive Python applications? [OneUptime](https://oneuptime.com) helps you monitor memory usage, track resource consumption, and get alerted before issues affect users.*

