# How to Profile Python Code Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Profiling, Performance, Optimization, cProfile, line_profiler

Description: Learn to identify performance bottlenecks in Python code using cProfile, line_profiler, and timeit. Understand where your code spends time and how to optimize it.

---

> Before optimizing code, you need to measure it. Profiling shows you exactly where your program spends its time, helping you focus optimization efforts where they will have the most impact. This guide covers Python's profiling tools and how to use them effectively.

The first rule of optimization is: measure first. Guessing which code is slow often leads to optimizing the wrong thing. Python provides several profiling tools, from simple timing to detailed function-level analysis.

---

## Quick Timing with timeit

For quick benchmarks of small code snippets, use `timeit`:

```python
import timeit

# Time a simple expression
time_taken = timeit.timeit('sum(range(1000))', number=10000)
print(f"Time: {time_taken:.4f} seconds for 10000 iterations")

# Compare two approaches
list_comp_time = timeit.timeit(
    '[x**2 for x in range(1000)]',
    number=10000
)

map_time = timeit.timeit(
    'list(map(lambda x: x**2, range(1000)))',
    number=10000
)

print(f"List comprehension: {list_comp_time:.4f}s")
print(f"Map with lambda: {map_time:.4f}s")
```

### Timing Functions

```python
import timeit

def method_a():
    return [x**2 for x in range(1000)]

def method_b():
    result = []
    for x in range(1000):
        result.append(x**2)
    return result

# Time functions using globals()
time_a = timeit.timeit('method_a()', globals=globals(), number=10000)
time_b = timeit.timeit('method_b()', globals=globals(), number=10000)

print(f"Method A: {time_a:.4f}s")
print(f"Method B: {time_b:.4f}s")
```

### Using timeit in IPython/Jupyter

```python
# In IPython or Jupyter, use the magic command
%timeit sum(range(1000))

# Time multiple lines
%%timeit
data = list(range(1000))
result = sum(data)
```

---

## Function-Level Profiling with cProfile

`cProfile` shows which functions consume the most time:

```python
import cProfile
import pstats

def slow_function():
    total = 0
    for i in range(1000000):
        total += i
    return total

def fast_function():
    return sum(range(1000000))

def main():
    slow_function()
    fast_function()

# Profile the main function
cProfile.run('main()')
```

Output shows function call counts and time:

```
         1000005 function calls in 0.234 seconds

   Ordered by: standard name

   ncalls  tottime  percall  cumtime  percall filename:lineno(function)
        1    0.000    0.000    0.234    0.234 <string>:1(<module>)
        1    0.000    0.000    0.005    0.005 script.py:10(fast_function)
        1    0.000    0.000    0.234    0.234 script.py:13(main)
        1    0.229    0.229    0.229    0.229 script.py:4(slow_function)
```

### Saving and Analyzing Profile Data

```python
import cProfile
import pstats
from pstats import SortKey

# Save profile to file
cProfile.run('main()', 'output.prof')

# Load and analyze
stats = pstats.Stats('output.prof')

# Sort by cumulative time and show top 20
stats.sort_stats(SortKey.CUMULATIVE)
stats.print_stats(20)

# Sort by total time in function
stats.sort_stats(SortKey.TIME)
stats.print_stats(20)

# Show callers of a function
stats.print_callers('slow_function')

# Show what a function calls
stats.print_callees('main')
```

### Profiling from Command Line

```bash
# Run with profiling
python -m cProfile script.py

# Save to file
python -m cProfile -o output.prof script.py

# Sort by cumulative time
python -m cProfile -s cumtime script.py
```

---

## Line-by-Line Profiling with line_profiler

For detailed analysis, `line_profiler` shows time spent on each line:

```bash
pip install line_profiler
```

```python
# script.py
@profile  # Decorator for line_profiler
def process_data(data):
    # Which line is slow?
    result = []
    for item in data:
        processed = item ** 2
        result.append(processed)
    return result

@profile
def main():
    data = list(range(100000))
    result = process_data(data)
    return sum(result)

if __name__ == '__main__':
    main()
```

Run with kernprof:

```bash
kernprof -l -v script.py
```

Output shows time per line:

```
Line #      Hits         Time  Per Hit   % Time  Line Contents
==============================================================
     2                                           @profile
     3                                           def process_data(data):
     4         1          2.0      2.0      0.0      result = []
     5    100001      15234.0      0.2     15.0      for item in data:
     6    100000      42156.0      0.4     41.5          processed = item ** 2
     7    100000      44123.0      0.4     43.5          result.append(processed)
     8         1          1.0      1.0      0.0      return result
```

---

## Memory Profiling

Track memory usage alongside time:

```bash
pip install memory_profiler
```

```python
from memory_profiler import profile

@profile
def memory_hungry():
    # Create large list
    data = [i for i in range(1000000)]

    # Process it
    doubled = [x * 2 for x in data]

    # Clean up
    del data

    return doubled

if __name__ == '__main__':
    memory_hungry()
```

Run:

```bash
python -m memory_profiler script.py
```

---

## Visualizing Profiles with snakeviz

`snakeviz` provides interactive visualization of cProfile output:

```bash
pip install snakeviz

# Generate profile
python -m cProfile -o output.prof script.py

# Visualize in browser
snakeviz output.prof
```

This opens an interactive sunburst diagram showing function call hierarchy and time distribution.

---

## Profiling Context Manager

Create a reusable profiling context manager:

```python
import cProfile
import pstats
from io import StringIO
from contextlib import contextmanager

@contextmanager
def profile_block(sort_by='cumulative', lines=20):
    """Profile a block of code."""

    profiler = cProfile.Profile()
    profiler.enable()

    try:
        yield profiler
    finally:
        profiler.disable()

        # Print results
        stream = StringIO()
        stats = pstats.Stats(profiler, stream=stream)
        stats.sort_stats(sort_by)
        stats.print_stats(lines)
        print(stream.getvalue())

# Usage
with profile_block():
    # Code to profile
    result = expensive_operation()
```

---

## Profiling Real Applications

### Flask Application Profiling

```python
from flask import Flask
from werkzeug.middleware.profiler import ProfilerMiddleware

app = Flask(__name__)

# Enable profiling middleware
app.config['PROFILE'] = True
app.wsgi_app = ProfilerMiddleware(
    app.wsgi_app,
    restrictions=[30],  # Show top 30 functions
    profile_dir='./profiles'  # Save profiles to directory
)

@app.route('/')
def index():
    return slow_operation()
```

### Django Profiling

```python
# settings.py
MIDDLEWARE = [
    'django_cprofile_middleware.middleware.ProfilerMiddleware',
    # ... other middleware
]

# Now add ?prof to any URL to see profile
# http://localhost:8000/myview/?prof
```

### Async Code Profiling

```python
import asyncio
import cProfile
import pstats

async def async_operation():
    await asyncio.sleep(0.1)
    return sum(range(10000))

async def main():
    tasks = [async_operation() for _ in range(10)]
    return await asyncio.gather(*tasks)

# Profile async code
profiler = cProfile.Profile()
profiler.enable()

asyncio.run(main())

profiler.disable()
stats = pstats.Stats(profiler)
stats.sort_stats('cumulative')
stats.print_stats(20)
```

---

## Statistical Profiling with py-spy

For production profiling without code modification:

```bash
pip install py-spy

# Profile a running process
py-spy top --pid 12345

# Record and generate flamegraph
py-spy record -o profile.svg --pid 12345

# Profile a script
py-spy record -o profile.svg -- python script.py
```

Flamegraphs make it easy to visualize where time is spent in the call stack.

---

## Benchmarking Best Practices

### Isolate What You Measure

```python
import timeit

def setup_code():
    """Expensive setup, do not include in timing."""
    return list(range(100000))

def code_to_benchmark(data):
    """Only time this."""
    return sum(x**2 for x in data)

# Time only the operation, not setup
data = setup_code()
time = timeit.timeit(lambda: code_to_benchmark(data), number=100)
print(f"Time: {time:.4f}s")
```

### Use Representative Data

```python
# Bad: Profiling with tiny data
small_data = [1, 2, 3]
profile_function(small_data)  # May hide O(n^2) behavior

# Good: Use realistic data sizes
realistic_data = list(range(100000))
profile_function(realistic_data)
```

### Multiple Runs for Consistency

```python
import statistics

def benchmark(func, iterations=10):
    """Run multiple benchmarks and report statistics."""
    times = []

    for _ in range(iterations):
        start = time.perf_counter()
        func()
        elapsed = time.perf_counter() - start
        times.append(elapsed)

    return {
        'mean': statistics.mean(times),
        'median': statistics.median(times),
        'stdev': statistics.stdev(times) if len(times) > 1 else 0,
        'min': min(times),
        'max': max(times)
    }

results = benchmark(my_function)
print(f"Mean: {results['mean']:.4f}s (+/- {results['stdev']:.4f}s)")
```

---

## Common Optimization Patterns

After profiling, here are common optimizations:

### Move Work Outside Loops

```python
# Slow: Repeated attribute lookup
for item in items:
    result.append(math.sqrt(item))

# Fast: Cache the function
sqrt = math.sqrt
for item in items:
    result.append(sqrt(item))
```

### Use Built-in Functions

```python
# Slow: Manual implementation
total = 0
for x in data:
    total += x

# Fast: Built-in sum
total = sum(data)
```

### Avoid Repeated Computations

```python
# Slow: Recomputes len(data) each iteration
for i in range(len(data)):
    process(data[i], len(data))

# Fast: Compute once
data_len = len(data)
for i in range(data_len):
    process(data[i], data_len)
```

### Use Appropriate Data Structures

```python
# Slow: O(n) lookup
if item in list_of_items:  # Scans entire list

# Fast: O(1) lookup
if item in set_of_items:  # Hash lookup
```

---

## Summary

Python profiling workflow:

1. **Measure first**: Do not guess where code is slow
2. **Start with cProfile**: Get function-level overview
3. **Drill down with line_profiler**: Find slow lines
4. **Visualize with snakeviz**: Understand call hierarchy
5. **Monitor memory**: Ensure you are not trading speed for memory

Key tools:
- `timeit`: Quick benchmarks
- `cProfile`: Function-level profiling
- `line_profiler`: Line-by-line analysis
- `memory_profiler`: Memory usage
- `py-spy`: Production profiling
- `snakeviz`: Visualization

Remember: Premature optimization is the root of all evil. Profile first, then optimize the parts that matter.
