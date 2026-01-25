# How to Use the yield Keyword and Generators in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Generators, yield, Iteration, Memory Efficiency

Description: Master Python generators and the yield keyword to write memory-efficient code that processes large datasets without loading everything into memory.

---

Generators are one of Python's most powerful features for handling large datasets and creating memory-efficient iterators. The `yield` keyword transforms a regular function into a generator that produces values on demand. This guide explains how generators work and when to use them.

## Understanding yield

A function with `yield` becomes a generator function. Instead of returning a single value and exiting, it yields values one at a time, pausing between each.

```python
def count_up_to(max):
    """Generator that counts from 1 to max."""
    count = 1
    while count <= max:
        yield count  # Pause here, return count, resume on next call
        count += 1

# Create a generator object
counter = count_up_to(5)

# Get values one at a time
print(next(counter))  # 1
print(next(counter))  # 2
print(next(counter))  # 3

# Or iterate through all remaining values
for num in counter:
    print(num)  # 4, 5
```

## How Generators Differ from Regular Functions

```python
# Regular function - creates entire list in memory
def get_squares_list(n):
    result = []
    for i in range(n):
        result.append(i ** 2)
    return result

# Generator function - yields one value at a time
def get_squares_generator(n):
    for i in range(n):
        yield i ** 2

# Both work the same for iteration
for square in get_squares_list(5):
    print(square)

for square in get_squares_generator(5):
    print(square)
```

The key difference is memory usage:

```python
import sys

# List stores all values in memory
squares_list = get_squares_list(1000000)
print(f"List size: {sys.getsizeof(squares_list)} bytes")  # ~8MB

# Generator stores almost nothing
squares_gen = get_squares_generator(1000000)
print(f"Generator size: {sys.getsizeof(squares_gen)} bytes")  # ~128 bytes
```

## Generator Execution Flow

Understanding the pause-and-resume behavior is key to using generators effectively.

```python
def simple_generator():
    print("Starting")
    yield 1
    print("After first yield")
    yield 2
    print("After second yield")
    yield 3
    print("Generator finished")

gen = simple_generator()
# Nothing printed yet - generator not started

print(next(gen))
# Prints: Starting
# Prints: 1

print(next(gen))
# Prints: After first yield
# Prints: 2

print(next(gen))
# Prints: After second yield
# Prints: 3

# print(next(gen))
# Prints: Generator finished
# Raises: StopIteration
```

## Common Generator Patterns

### Reading Large Files

```python
def read_large_file(file_path):
    """Read a file line by line without loading it all into memory."""
    with open(file_path, 'r') as file:
        for line in file:
            yield line.strip()

# Process a huge log file without memory issues
for line in read_large_file('huge_log.txt'):
    if 'ERROR' in line:
        print(line)
```

### Chunked Processing

```python
def chunked(iterable, size):
    """Yield chunks of specified size."""
    chunk = []
    for item in iterable:
        chunk.append(item)
        if len(chunk) == size:
            yield chunk
            chunk = []
    # Yield remaining items
    if chunk:
        yield chunk

# Process data in batches
data = range(100)
for batch in chunked(data, 10):
    print(f"Processing batch of {len(batch)} items")
```

### Infinite Sequences

```python
def infinite_counter(start=0):
    """Count forever."""
    n = start
    while True:
        yield n
        n += 1

# Use with caution - needs a break condition
counter = infinite_counter(1)
for num in counter:
    print(num)
    if num >= 5:
        break
# Prints: 1, 2, 3, 4, 5
```

### Fibonacci Sequence

```python
def fibonacci():
    """Generate Fibonacci numbers infinitely."""
    a, b = 0, 1
    while True:
        yield a
        a, b = b, a + b

# Get first 10 Fibonacci numbers
from itertools import islice

fib = fibonacci()
first_10 = list(islice(fib, 10))
print(first_10)  # [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]
```

## Generator Expressions

Like list comprehensions, but with parentheses instead of brackets.

```python
# List comprehension - creates list immediately
squares_list = [x ** 2 for x in range(10)]

# Generator expression - creates generator
squares_gen = (x ** 2 for x in range(10))

# Both iterate the same way
for s in squares_gen:
    print(s)

# Generator expressions are memory efficient
sum_of_squares = sum(x ** 2 for x in range(1000000))
# No intermediate list created!
```

## yield from - Delegating to Sub-generators

Python 3.3+ supports `yield from` to delegate to another iterator.

```python
def flatten(nested):
    """Flatten a nested list of any depth."""
    for item in nested:
        if isinstance(item, list):
            yield from flatten(item)  # Delegate to recursive call
        else:
            yield item

nested = [1, [2, 3, [4, 5]], 6, [7, 8]]
flat = list(flatten(nested))
print(flat)  # [1, 2, 3, 4, 5, 6, 7, 8]
```

### Without yield from (More Verbose)

```python
def flatten_verbose(nested):
    """Same result without yield from."""
    for item in nested:
        if isinstance(item, list):
            for sub_item in flatten_verbose(item):
                yield sub_item
        else:
            yield item
```

## Sending Values to Generators

Generators can receive values with `.send()`.

```python
def accumulator():
    """Generator that accumulates values sent to it."""
    total = 0
    while True:
        value = yield total
        if value is not None:
            total += value

acc = accumulator()
next(acc)  # Start the generator, returns 0

print(acc.send(10))  # Send 10, returns 10
print(acc.send(5))   # Send 5, returns 15
print(acc.send(3))   # Send 3, returns 18
```

## Generator Methods

```python
def controlled_generator():
    """Generator demonstrating all control methods."""
    try:
        while True:
            value = yield
            print(f"Received: {value}")
    except GeneratorExit:
        print("Generator closed")
    finally:
        print("Cleanup")

gen = controlled_generator()
next(gen)           # Start generator

gen.send("Hello")   # Send value
gen.send("World")

gen.close()         # Close generator
# Prints: Generator closed
# Prints: Cleanup
```

## Practical Examples

### Data Pipeline

```python
def read_data(source):
    """Stage 1: Read data."""
    for item in source:
        yield item

def validate(data):
    """Stage 2: Filter valid items."""
    for item in data:
        if item > 0:
            yield item

def transform(data):
    """Stage 3: Transform items."""
    for item in data:
        yield item * 2

def process(data):
    """Stage 4: Process items."""
    for item in data:
        print(f"Processing: {item}")

# Chain generators into a pipeline
raw_data = [-1, 2, 3, -4, 5, 6]
pipeline = transform(validate(read_data(raw_data)))

# Nothing happens until we consume the pipeline
process(pipeline)
# Processing: 4
# Processing: 6
# Processing: 10
# Processing: 12
```

### Coroutine-Style Processing

```python
def grep(pattern):
    """Generator that filters lines matching a pattern."""
    print(f"Looking for: {pattern}")
    while True:
        line = yield
        if pattern in line:
            print(f"Found: {line}")

# Create and prime the generator
searcher = grep("ERROR")
next(searcher)  # Prime it (advance to first yield)

# Send lines to search
searcher.send("INFO: System started")
searcher.send("ERROR: Connection failed")  # Found: ERROR: Connection failed
searcher.send("WARNING: Low memory")
searcher.send("ERROR: Timeout")  # Found: ERROR: Timeout
```

### Database Query Pagination

```python
def paginated_query(query_func, page_size=100):
    """Fetch database records in pages."""
    offset = 0
    while True:
        # Fetch one page of results
        page = query_func(offset=offset, limit=page_size)

        if not page:
            break  # No more results

        for record in page:
            yield record

        offset += page_size

# Usage (with a mock query function)
def mock_query(offset, limit):
    if offset >= 350:
        return []
    return [{'id': i} for i in range(offset, min(offset + limit, 350))]

# Iterate through all records without loading everything
for record in paginated_query(mock_query, page_size=100):
    # Process one record at a time
    pass
```

## When to Use Generators

Use generators when:

1. **Large datasets**: Data does not fit in memory
2. **Lazy evaluation**: You might not need all values
3. **Pipelines**: Chaining transformations
4. **Infinite sequences**: Streams, counters, etc.
5. **Single iteration**: Data only needs to be traversed once

Use lists when:

1. **Random access**: Need to index into results
2. **Multiple iterations**: Need to traverse data multiple times
3. **Small datasets**: Memory is not a concern
4. **Need length**: Must know size upfront

## Summary

| Feature | List | Generator |
|---------|------|-----------|
| Memory | Stores all values | Stores current state only |
| Access | Random access by index | Sequential only |
| Iterations | Multiple | Single |
| Creation | Immediate | Lazy (on demand) |
| Syntax | `[x for x in ...]` | `(x for x in ...)` |

Generators are essential for writing efficient Python code. The `yield` keyword transforms functions into pausable state machines that produce values on demand. Master generators to handle large datasets, build processing pipelines, and write memory-efficient programs.
