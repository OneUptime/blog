# How to Split a List Into Chunks in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Lists, Data Processing, Batch Processing, Iteration

Description: Learn multiple ways to split Python lists into smaller chunks of a specified size for batch processing, pagination, and parallel operations.

---

Splitting a list into smaller chunks is useful for batch processing, API pagination, parallel execution, and memory management. Python provides several approaches, from simple slicing to generators for memory efficiency. This guide covers all the common methods and helps you choose the right one.

## The Problem

You have a list and need to process it in groups of a specific size.

```python
data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
# Goal: Split into chunks of 3
# Result: [[1, 2, 3], [4, 5, 6], [7, 8, 9], [10]]
```

## Method 1: List Comprehension with Slicing

The most straightforward approach uses a list comprehension with range and slicing.

```python
def chunk_list(lst, chunk_size):
    """Split a list into chunks of specified size.

    Args:
        lst: The list to split
        chunk_size: Maximum size of each chunk

    Returns:
        List of chunks (last chunk may be smaller)
    """
    return [lst[i:i + chunk_size] for i in range(0, len(lst), chunk_size)]

data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
chunks = chunk_list(data, 3)

print(chunks)
# [[1, 2, 3], [4, 5, 6], [7, 8, 9], [10]]
```

This creates all chunks at once in memory. The last chunk contains whatever remains, which may be smaller than the chunk size.

## Method 2: Generator for Memory Efficiency

For large lists, a generator yields one chunk at a time without loading everything into memory.

```python
def chunk_generator(lst, chunk_size):
    """Yield successive chunks from a list.

    Args:
        lst: The list to split
        chunk_size: Maximum size of each chunk

    Yields:
        Chunks of the list
    """
    for i in range(0, len(lst), chunk_size):
        yield lst[i:i + chunk_size]

data = list(range(1000000))  # Large list

# Process chunks one at a time
for chunk in chunk_generator(data, 10000):
    # Process this chunk
    total = sum(chunk)
    # Memory only holds one chunk at a time
```

## Method 3: itertools.islice

The `itertools.islice` function works with any iterable, not just lists.

```python
from itertools import islice

def chunk_iterable(iterable, chunk_size):
    """Split any iterable into chunks.

    Works with iterators that do not support indexing.
    """
    iterator = iter(iterable)
    while True:
        chunk = list(islice(iterator, chunk_size))
        if not chunk:
            break
        yield chunk

# Works with generators and iterators
def number_generator():
    for i in range(10):
        yield i

for chunk in chunk_iterable(number_generator(), 3):
    print(chunk)
# [0, 1, 2]
# [3, 4, 5]
# [6, 7, 8]
# [9]
```

## Method 4: Using itertools.batched (Python 3.12+)

Python 3.12 introduced `itertools.batched` specifically for this purpose.

```python
from itertools import batched

data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

# Returns tuples, not lists
for chunk in batched(data, 3):
    print(chunk)
# (1, 2, 3)
# (4, 5, 6)
# (7, 8, 9)
# (10,)

# Convert to lists if needed
chunks = [list(chunk) for chunk in batched(data, 3)]
```

## Method 5: NumPy for Numeric Data

For numeric data, NumPy's `array_split` handles uneven divisions cleanly.

```python
import numpy as np

data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
arr = np.array(data)

# Split into 4 chunks (handles uneven splits)
chunks = np.array_split(arr, 4)
for chunk in chunks:
    print(chunk.tolist())
# [1, 2, 3]
# [4, 5, 6]
# [7, 8]
# [9, 10]

# Split into chunks of size n
n = 3
num_chunks = len(data) // n + (1 if len(data) % n else 0)
chunks = np.array_split(arr, num_chunks)
```

## Splitting Into N Equal Parts

Sometimes you want a specific number of chunks rather than chunks of a specific size.

```python
def split_into_n_parts(lst, n):
    """Split list into n roughly equal parts.

    Args:
        lst: The list to split
        n: Number of parts to create

    Returns:
        List of n lists
    """
    k, m = divmod(len(lst), n)
    # First m chunks get k+1 items, rest get k items
    return [lst[i * k + min(i, m):(i + 1) * k + min(i + 1, m)] for i in range(n)]

data = list(range(10))
parts = split_into_n_parts(data, 3)
print(parts)
# [[0, 1, 2, 3], [4, 5, 6], [7, 8, 9]]

# Note: chunks differ by at most 1 in length
```

## Handling Edge Cases

### Empty Lists

```python
def chunk_list(lst, chunk_size):
    if not lst:
        return []
    return [lst[i:i + chunk_size] for i in range(0, len(lst), chunk_size)]

empty = []
chunks = chunk_list(empty, 3)
print(chunks)  # []
```

### Chunk Size Larger Than List

```python
data = [1, 2, 3]
chunks = chunk_list(data, 10)
print(chunks)  # [[1, 2, 3]]  - single chunk with all items
```

### Validation

```python
def chunk_list(lst, chunk_size):
    """Split a list into chunks with validation.

    Args:
        lst: The list to split
        chunk_size: Size of each chunk (must be positive)

    Returns:
        List of chunks

    Raises:
        ValueError: If chunk_size is not positive
    """
    if chunk_size < 1:
        raise ValueError(f"chunk_size must be positive, got {chunk_size}")

    return [lst[i:i + chunk_size] for i in range(0, len(lst), chunk_size)]

# This raises ValueError
# chunk_list([1, 2, 3], 0)
```

## Practical Applications

### Batch Database Inserts

```python
def chunk_generator(lst, chunk_size):
    for i in range(0, len(lst), chunk_size):
        yield lst[i:i + chunk_size]

def batch_insert(records, batch_size=1000):
    """Insert records in batches to avoid memory issues.

    Many databases have limits on query size or perform better
    with batched inserts.
    """
    for batch in chunk_generator(records, batch_size):
        # Execute batch insert
        # db.execute("INSERT INTO table VALUES ...", batch)
        print(f"Inserted batch of {len(batch)} records")

records = [{'id': i, 'name': f'item_{i}'} for i in range(5000)]
batch_insert(records, batch_size=1000)
# Inserted batch of 1000 records
# Inserted batch of 1000 records
# Inserted batch of 1000 records
# Inserted batch of 1000 records
# Inserted batch of 1000 records
```

### API Pagination

```python
def paginate_results(items, page_size=20):
    """Create pagination data for API responses."""
    chunks = list(chunk_list(items, page_size))
    total_pages = len(chunks)

    pages = []
    for i, chunk in enumerate(chunks, 1):
        pages.append({
            'page': i,
            'total_pages': total_pages,
            'items': chunk,
            'has_next': i < total_pages,
            'has_prev': i > 1
        })

    return pages

items = list(range(55))
pages = paginate_results(items, page_size=20)
print(f"Total pages: {len(pages)}")
print(f"Page 1 items: {len(pages[0]['items'])}")  # 20
print(f"Page 3 items: {len(pages[2]['items'])}")  # 15
```

### Parallel Processing

```python
from concurrent.futures import ProcessPoolExecutor

def chunk_generator(lst, chunk_size):
    for i in range(0, len(lst), chunk_size):
        yield lst[i:i + chunk_size]

def process_chunk(chunk):
    """Process a single chunk of data."""
    return sum(x ** 2 for x in chunk)

def parallel_process(data, chunk_size=1000, workers=4):
    """Process data in parallel using chunking."""
    chunks = list(chunk_generator(data, chunk_size))

    with ProcessPoolExecutor(max_workers=workers) as executor:
        results = list(executor.map(process_chunk, chunks))

    return sum(results)

data = list(range(100000))
total = parallel_process(data, chunk_size=10000)
print(f"Sum of squares: {total}")
```

### Rate-Limited API Calls

```python
import time

def chunk_generator(lst, chunk_size):
    for i in range(0, len(lst), chunk_size):
        yield lst[i:i + chunk_size]

def rate_limited_requests(urls, batch_size=10, delay=1.0):
    """Make requests in batches with rate limiting.

    Args:
        urls: List of URLs to fetch
        batch_size: Number of requests per batch
        delay: Seconds to wait between batches
    """
    results = []

    for batch in chunk_generator(urls, batch_size):
        # Process batch
        for url in batch:
            # response = requests.get(url)
            # results.append(response)
            print(f"Fetching: {url}")

        # Rate limit between batches
        time.sleep(delay)

    return results
```

## Performance Comparison

```python
import timeit

data = list(range(100000))
chunk_size = 1000

# List comprehension - creates all chunks in memory
def method_comprehension():
    return [data[i:i + chunk_size] for i in range(0, len(data), chunk_size)]

# Generator - yields one chunk at a time
def method_generator():
    for i in range(0, len(data), chunk_size):
        yield data[i:i + chunk_size]

# Consuming the generator
def method_generator_consumed():
    return list(chunk_generator(data, chunk_size))

# Results (relative, lower is better):
# List comprehension: 1.0x
# Generator consumed: 1.1x (small overhead)
# Generator iteration: Memory efficient for processing
```

The generator approach uses constant memory regardless of list size, while the list comprehension uses memory proportional to the number of chunks.

## Summary

| Method | Best For | Returns |
|--------|----------|---------|
| List comprehension | Simple cases, small lists | List of lists |
| Generator | Large lists, memory efficiency | Iterator |
| `itertools.islice` | Non-indexable iterables | Iterator |
| `itertools.batched` | Python 3.12+ | Iterator of tuples |
| NumPy `array_split` | Numeric data | List of arrays |

For most cases, the list comprehension is clear and sufficient. Switch to a generator when working with large datasets or when memory is constrained. Use `itertools.batched` if you are on Python 3.12 or later for a clean standard library solution.
