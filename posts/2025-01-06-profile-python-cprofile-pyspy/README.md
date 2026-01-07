# How to Profile Python Applications with cProfile and py-spy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Profiling, Performance, cProfile, py-spy, Debugging, Optimization

Description: Learn how to identify CPU and memory bottlenecks in Python applications using cProfile, py-spy, and memory profilers. This guide covers both development-time and production profiling techniques.

---

> Performance problems hide in plain sight until you profile. A function that looks innocent might be your biggest bottleneck. This guide shows you how to use Python profiling tools to find and fix performance issues before they impact users.

Profiling is the art of measuring where your code spends its time. Without profiling, optimization is guesswork. With it, you can make targeted improvements that deliver measurable results.

---

## Understanding Profiling Types

Before diving into tools, understand what you're measuring:

| Profiling Type | What It Measures | Best For |
|----------------|------------------|----------|
| **CPU Profiling** | Time spent in functions | Finding slow code |
| **Memory Profiling** | Memory allocation patterns | Finding memory leaks |
| **Line Profiling** | Time per line of code | Micro-optimization |
| **Statistical Sampling** | Periodic stack snapshots | Production profiling |

---

## cProfile: Built-in CPU Profiling

cProfile is Python's built-in profiler. It's deterministic, meaning it traces every function call, giving you complete coverage.

### Basic Usage

This example demonstrates how to use cProfile programmatically to profile specific code sections. The profiler tracks all function calls and their execution times:

```python
# profile_example.py
import cProfile
import pstats
from io import StringIO

def slow_function():
    """Simulates a slow operation using explicit loop"""
    total = 0
    # Explicit loop - slower due to Python bytecode overhead
    for i in range(1000000):
        total += i ** 2
    return total

def fast_function():
    """Simulates a fast operation using generator expression"""
    # Generator with built-in sum() - faster due to C implementation
    return sum(i ** 2 for i in range(1000000))

def main():
    slow_function()
    fast_function()

# Profile the main function
if __name__ == "__main__":
    # Create profiler instance
    profiler = cProfile.Profile()

    # Start profiling - all function calls are now tracked
    profiler.enable()

    main()

    # Stop profiling
    profiler.disable()

    # Create statistics object and format output
    stats = pstats.Stats(profiler)
    # Sort by cumulative time (time in function + all subcalls)
    stats.sort_stats('cumulative')
    # Print top 10 functions by time spent
    stats.print_stats(10)
```

### Command Line Profiling

The fastest way to profile a script is using the command line interface. This approach requires no code changes:

```bash
# Profile a script and sort output by cumulative time
# -s cumtime sorts results to show slowest functions first
python -m cProfile -s cumtime my_script.py

# Save profile data to binary file for later analysis
# Useful for comparing profiles across different runs
python -m cProfile -o profile_output.prof my_script.py

# Analyze saved profile data with custom sorting and filtering
# Shows top 20 functions sorted by cumulative time
python -c "import pstats; p = pstats.Stats('profile_output.prof'); p.sort_stats('cumulative').print_stats(20)"
```

### Profiling Flask Applications

This middleware approach profiles each request individually, useful for identifying slow endpoints. Enable profiling via environment variable for development:

```python
# flask_profiler.py
from flask import Flask, g
import cProfile
import pstats
from io import StringIO
import os

app = Flask(__name__)

# Only enable in development - profiling adds overhead
PROFILING_ENABLED = os.getenv('FLASK_PROFILING', 'false').lower() == 'true'

@app.before_request
def before_request():
    """Start profiling before each request"""
    if PROFILING_ENABLED:
        # Create a new profiler for this request
        g.profiler = cProfile.Profile()
        g.profiler.enable()

@app.after_request
def after_request(response):
    """Stop profiling and log results after each request"""
    if PROFILING_ENABLED and hasattr(g, 'profiler'):
        g.profiler.disable()

        # Format stats to string for logging
        stream = StringIO()
        stats = pstats.Stats(g.profiler, stream=stream)
        stats.sort_stats('cumulative')
        stats.print_stats(20)  # Top 20 functions

        # Log the profile results
        print(stream.getvalue())

    return response

@app.route('/api/slow')
def slow_endpoint():
    # Some slow operation - profiler will show time spent here
    result = sum(i ** 2 for i in range(100000))
    return {'result': result}
```

### Profile Decorator

Create a reusable decorator to profile specific functions. This is useful when you want to profile specific code paths without instrumenting the entire application:

```python
# profiler_decorator.py
import cProfile
import pstats
from io import StringIO
from functools import wraps
import logging

logger = logging.getLogger(__name__)

def profile(output_file=None, sort_by='cumulative', limit=20):
    """Decorator to profile a function

    Args:
        output_file: Optional file path to save binary profile data
        sort_by: Sort key ('cumulative', 'tottime', 'calls')
        limit: Number of functions to display in output
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Create fresh profiler for each call
            profiler = cProfile.Profile()
            profiler.enable()

            try:
                result = func(*args, **kwargs)
                return result
            finally:
                profiler.disable()

                # Format profile output to string
                stream = StringIO()
                stats = pstats.Stats(profiler, stream=stream)
                stats.sort_stats(sort_by)
                stats.print_stats(limit)

                # Optionally save to file for external analysis tools
                if output_file:
                    profiler.dump_stats(output_file)

                # Log the profile results
                logger.info(f"Profile for {func.__name__}:\n{stream.getvalue()}")

        return wrapper
    return decorator

# Usage - decorate functions you want to profile
@profile(sort_by='tottime', limit=10)
def process_data(data):
    results = []
    for item in data:
        results.append(transform(item))
    return results
```

### Analyzing cProfile Output

Understanding the output columns:

```
   ncalls  tottime  percall  cumtime  percall filename:lineno(function)
     1000    0.500    0.001    2.500    0.003 app.py:45(process_item)
      500    1.200    0.002    1.200    0.002 db.py:23(query)
```

- **ncalls**: Number of calls
- **tottime**: Total time in function (excluding subcalls)
- **percall**: tottime / ncalls
- **cumtime**: Cumulative time (including subcalls)
- **percall**: cumtime / ncalls

---

## py-spy: Production-Safe Profiling

py-spy is a sampling profiler that can profile running Python processes without modifying code or impacting performance significantly. Unlike cProfile, it works externally and can attach to already-running processes.

### Installation

```bash
pip install py-spy
```

### Profile a Running Process

py-spy can attach to any running Python process. This is especially useful for debugging production issues without restarting the application:

```bash
# Find Python process ID
ps aux | grep python

# Live top-like view of function performance (requires root on Linux)
# Updates in real-time showing where time is being spent
sudo py-spy top --pid 12345

# Record profile data and generate a flamegraph SVG
# The --duration flag specifies how long to sample (in seconds)
sudo py-spy record -o profile.svg --pid 12345 --duration 30

# Include native C extension code in the profile
# Useful when profiling numpy, pandas, or other C-heavy libraries
sudo py-spy record -o profile.svg --pid 12345 --native
```

### Profile a Script

You can also launch a script directly under py-spy for profiling from the start:

```bash
# Run and profile a script, generating flamegraph SVG
# The double dash separates py-spy args from the command to run
py-spy record -o profile.svg -- python my_script.py

# Generate output in Speedscope format for web-based analysis
# Speedscope (https://speedscope.app) provides interactive visualization
py-spy record -o flamegraph.svg --format speedscope -- python my_script.py

# Profile the main process and all child processes
# Essential for multi-process applications (multiprocessing, subprocess)
py-spy record -o profile.svg --subprocesses -- python my_script.py
```

### Top-like Live View

```bash
# Live view of function performance
sudo py-spy top --pid 12345

# With native extensions
sudo py-spy top --pid 12345 --native

# Non-blocking check
py-spy dump --pid 12345
```

### Docker Profiling

```bash
# Profile Python in Docker
docker run --cap-add SYS_PTRACE my-python-app

# From host, profile container process
sudo py-spy record -o profile.svg --pid $(docker inspect --format '{{.State.Pid}}' container_name)
```

### Flamegraph Interpretation

Flamegraphs show:
- **Width**: Time spent (wider = more time)
- **Height**: Call stack depth
- **Color**: Usually arbitrary, but can indicate different categories

```
# Generate different formats
py-spy record -o profile.speedscope --format speedscope -- python app.py
py-spy record -o profile.svg --format flamegraph -- python app.py
```

---

## Memory Profiling

### memory_profiler for Line-by-Line Analysis

memory_profiler shows memory usage for each line of code, making it easy to identify memory-hungry operations:

```bash
pip install memory_profiler
```

The @profile decorator marks functions for memory analysis. Each line shows memory before and after execution:

```python
# memory_example.py
from memory_profiler import profile

@profile
def memory_hungry_function():
    # Creates a large list - allocates ~38MB for 1M integers
    data = [i ** 2 for i in range(1000000)]

    # Process data - no additional memory needed
    result = sum(data)

    # Clear data - frees the ~38MB
    del data

    return result

@profile
def memory_efficient_function():
    # Uses generator (lazy evaluation) - minimal memory footprint
    # Only one value in memory at a time
    return sum(i ** 2 for i in range(1000000))

if __name__ == "__main__":
    memory_hungry_function()
    memory_efficient_function()
```

Run with:
```bash
python -m memory_profiler memory_example.py
```

Output:
```
Line #    Mem usage    Increment  Occurrences   Line Contents
============================================================
     4     38.5 MiB     38.5 MiB           1   @profile
     5                                         def memory_hungry_function():
     6     76.8 MiB     38.3 MiB           1       data = [i ** 2 for i in range(1000000)]
     7     76.8 MiB      0.0 MiB           1       result = sum(data)
     8     38.5 MiB    -38.3 MiB           1       del data
     9     38.5 MiB      0.0 MiB           1       return result
```

### tracemalloc for Memory Allocation Tracking

```python
# tracemalloc_example.py
import tracemalloc

def analyze_memory():
    """Track memory allocations"""
    tracemalloc.start()

    # Code to analyze
    data = []
    for i in range(10000):
        data.append({'id': i, 'value': f'item_{i}' * 100})

    # Get current memory snapshot
    snapshot = tracemalloc.take_snapshot()

    # Top 10 memory allocations by size
    top_stats = snapshot.statistics('lineno')

    print("Top 10 memory allocations:")
    for stat in top_stats[:10]:
        print(stat)

    # Get memory usage
    current, peak = tracemalloc.get_traced_memory()
    print(f"\nCurrent memory: {current / 1024 / 1024:.2f} MB")
    print(f"Peak memory: {peak / 1024 / 1024:.2f} MB")

    tracemalloc.stop()

if __name__ == "__main__":
    analyze_memory()
```

### Comparing Memory Snapshots

```python
# memory_diff.py
import tracemalloc

def find_memory_leak():
    """Compare snapshots to find memory leaks"""
    tracemalloc.start()

    # Take initial snapshot
    snapshot1 = tracemalloc.take_snapshot()

    # Simulate operations that might leak
    leaked_data = []
    for i in range(1000):
        leaked_data.append(create_object(i))

    # Take second snapshot
    snapshot2 = tracemalloc.take_snapshot()

    # Compare snapshots
    top_stats = snapshot2.compare_to(snapshot1, 'lineno')

    print("Memory increase between snapshots:")
    for stat in top_stats[:10]:
        print(stat)

    tracemalloc.stop()

def create_object(i):
    return {'data': 'x' * 1000, 'id': i}
```

### objgraph for Object Reference Analysis

```bash
pip install objgraph
```

```python
# objgraph_example.py
import objgraph

class LeakyClass:
    instances = []  # Class variable holding references

    def __init__(self, data):
        self.data = data
        LeakyClass.instances.append(self)  # Memory leak!

def analyze_objects():
    """Analyze object references"""
    # Create some objects
    for i in range(100):
        LeakyClass(f"data_{i}")

    # Show most common object types
    print("Most common types:")
    objgraph.show_most_common_types(limit=10)

    # Show growth since last call
    print("\nObject growth:")
    objgraph.show_growth(limit=10)

    # Find objects of a specific type
    leaky_objects = objgraph.by_type('LeakyClass')
    print(f"\nLeakyClass instances: {len(leaky_objects)}")

    # Show backreferences (what's holding references)
    if leaky_objects:
        objgraph.show_backrefs(
            leaky_objects[0],
            max_depth=3,
            filename='backrefs.png'
        )

if __name__ == "__main__":
    analyze_objects()
```

---

## Line Profiling with line_profiler

```bash
pip install line_profiler
```

```python
# line_profile_example.py
from line_profiler import LineProfiler

def slow_function():
    result = []

    # Line 1: List comprehension
    squares = [i ** 2 for i in range(10000)]

    # Line 2: Filter operation
    filtered = [x for x in squares if x % 2 == 0]

    # Line 3: Sum operation
    total = sum(filtered)

    # Line 4: String formatting
    for i in range(1000):
        result.append(f"Value: {i}")

    return total, result

# Profile specific functions
profiler = LineProfiler()
profiler.add_function(slow_function)

profiler.enable_by_count()
slow_function()
profiler.disable_by_count()

profiler.print_stats()
```

Or use the decorator approach:

```python
# Using kernprof command line tool
# Add @profile decorator (no import needed when using kernprof)

@profile
def process_items(items):
    results = []
    for item in items:
        # This line might be slow
        processed = transform(item)
        results.append(processed)
    return results
```

Run with:
```bash
kernprof -l -v script.py
```

---

## Async Profiling

### Profiling asyncio Applications

```python
# async_profiling.py
import asyncio
import cProfile
import pstats
from io import StringIO

async def slow_async_operation():
    await asyncio.sleep(0.1)
    return sum(i ** 2 for i in range(10000))

async def fast_async_operation():
    await asyncio.sleep(0.01)
    return 42

async def main():
    tasks = [
        slow_async_operation(),
        fast_async_operation(),
        slow_async_operation(),
    ]
    results = await asyncio.gather(*tasks)
    return results

def profile_async():
    """Profile async code"""
    profiler = cProfile.Profile()
    profiler.enable()

    asyncio.run(main())

    profiler.disable()

    stream = StringIO()
    stats = pstats.Stats(profiler, stream=stream)
    stats.sort_stats('cumulative')
    stats.print_stats(20)
    print(stream.getvalue())

if __name__ == "__main__":
    profile_async()
```

### Using yappi for Async/Threading

```bash
pip install yappi
```

```python
# yappi_example.py
import yappi
import asyncio
import threading

async def async_work():
    await asyncio.sleep(0.1)
    return sum(range(10000))

def thread_work():
    import time
    time.sleep(0.1)
    return sum(range(10000))

async def main():
    # Start profiling with wall clock time
    yappi.set_clock_type("wall")
    yappi.start()

    # Run async tasks
    await asyncio.gather(
        async_work(),
        async_work(),
    )

    # Run threaded tasks
    threads = [
        threading.Thread(target=thread_work),
        threading.Thread(target=thread_work),
    ]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    yappi.stop()

    # Get stats
    print("Function stats:")
    yappi.get_func_stats().print_all()

    print("\nThread stats:")
    yappi.get_thread_stats().print_all()

if __name__ == "__main__":
    asyncio.run(main())
```

---

## Continuous Profiling in Production

### Sampling Profiler Integration

```python
# continuous_profiler.py
import signal
import traceback
import threading
import time
from collections import defaultdict

class ContinuousProfiler:
    """Lightweight sampling profiler for production"""

    def __init__(self, interval=0.01):  # 10ms default
        self.interval = interval
        self.samples = defaultdict(int)
        self._running = False
        self._thread = None

    def start(self):
        """Start profiling"""
        self._running = True
        self._thread = threading.Thread(target=self._sample_loop, daemon=True)
        self._thread.start()

    def stop(self):
        """Stop profiling and return results"""
        self._running = False
        if self._thread:
            self._thread.join()

        # Convert to sorted list
        results = sorted(
            self.samples.items(),
            key=lambda x: x[1],
            reverse=True
        )
        return results

    def _sample_loop(self):
        """Continuously sample stack traces"""
        while self._running:
            self._capture_sample()
            time.sleep(self.interval)

    def _capture_sample(self):
        """Capture current stack trace"""
        for thread_id, frame in sys._current_frames().items():
            # Skip profiler's own thread
            if thread_id == threading.current_thread().ident:
                continue

            # Extract stack trace
            stack = []
            while frame:
                stack.append(f"{frame.f_code.co_filename}:{frame.f_lineno}:{frame.f_code.co_name}")
                frame = frame.f_back

            # Store as tuple for hashing
            self.samples[tuple(stack)] += 1

# Usage
import sys

profiler = ContinuousProfiler(interval=0.001)  # 1ms sampling
profiler.start()

# Run your application
run_application()

results = profiler.stop()

# Print top stacks
for stack, count in results[:10]:
    print(f"Count: {count}")
    for frame in stack[:5]:  # Top 5 frames
        print(f"  {frame}")
    print()
```

### Profiling with OpenTelemetry

```python
# otel_profiling.py
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
import cProfile
import pstats
from io import StringIO
from functools import wraps

tracer = trace.get_tracer(__name__)

def profile_span(func):
    """Decorator that profiles and adds results to span"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        with tracer.start_as_current_span(func.__name__) as span:
            profiler = cProfile.Profile()
            profiler.enable()

            try:
                result = func(*args, **kwargs)
                return result
            finally:
                profiler.disable()

                # Get stats
                stream = StringIO()
                stats = pstats.Stats(profiler, stream=stream)
                stats.sort_stats('cumulative')
                stats.print_stats(5)

                # Add profile to span
                span.set_attribute("profile.summary", stream.getvalue())
                span.set_attribute("profile.total_calls", stats.total_calls)

    return wrapper

@profile_span
def expensive_operation():
    return sum(i ** 2 for i in range(100000))
```

---

## Optimization Patterns

### Common Bottlenecks and Fixes

```python
# optimization_examples.py

# 1. String Concatenation
# Bad: O(n^2) complexity
def bad_string_concat(items):
    result = ""
    for item in items:
        result += str(item)  # Creates new string each time
    return result

# Good: O(n) complexity
def good_string_concat(items):
    return "".join(str(item) for item in items)


# 2. List Operations
# Bad: Linear search in loop
def bad_lookup(items, targets):
    results = []
    for target in targets:
        if target in items:  # O(n) each time
            results.append(target)
    return results

# Good: Set for O(1) lookup
def good_lookup(items, targets):
    item_set = set(items)  # O(n) once
    return [t for t in targets if t in item_set]  # O(1) each


# 3. Function Calls in Loops
# Bad: Repeated attribute lookup
def bad_loop(data):
    result = []
    for item in data:
        result.append(item.upper())  # Method lookup each iteration
    return result

# Good: Cache the method
def good_loop(data):
    result = []
    append = result.append
    upper = str.upper
    for item in data:
        append(upper(item))
    return result


# 4. Generator vs List
# Bad: Creates full list in memory
def bad_filter(items):
    return [x for x in items if x > 0]

# Good: Lazy evaluation
def good_filter(items):
    return (x for x in items if x > 0)


# 5. Dictionary Comprehension
# Bad: Multiple dict operations
def bad_dict_build(keys, values):
    result = {}
    for k, v in zip(keys, values):
        result[k] = v
    return result

# Good: Single comprehension
def good_dict_build(keys, values):
    return dict(zip(keys, values))
```

### Profiling-Driven Optimization Example

```python
# optimization_workflow.py
import cProfile
import pstats
from io import StringIO

def process_orders(orders):
    """Original slow implementation"""
    results = []
    for order in orders:
        # Slow: Multiple passes through items
        total = 0
        for item in order['items']:
            total += item['price'] * item['quantity']

        # Slow: String formatting in loop
        summary = ""
        for item in order['items']:
            summary += f"{item['name']}: ${item['price']}\n"

        results.append({
            'order_id': order['id'],
            'total': total,
            'summary': summary
        })
    return results

def process_orders_optimized(orders):
    """Optimized implementation"""
    results = []
    for order in orders:
        items = order['items']

        # Single pass with generator
        total = sum(item['price'] * item['quantity'] for item in items)

        # Efficient string building
        summary = '\n'.join(f"{item['name']}: ${item['price']}" for item in items)

        results.append({
            'order_id': order['id'],
            'total': total,
            'summary': summary
        })
    return results

def benchmark(func, data, iterations=100):
    """Profile a function"""
    profiler = cProfile.Profile()
    profiler.enable()

    for _ in range(iterations):
        func(data)

    profiler.disable()

    stream = StringIO()
    stats = pstats.Stats(profiler, stream=stream)
    stats.sort_stats('tottime')
    stats.print_stats(10)

    return stream.getvalue()

# Run benchmark
sample_orders = [
    {'id': i, 'items': [{'name': f'Item{j}', 'price': 10.0, 'quantity': j}
                        for j in range(10)]}
    for i in range(100)
]

print("Original implementation:")
print(benchmark(process_orders, sample_orders))

print("\nOptimized implementation:")
print(benchmark(process_orders_optimized, sample_orders))
```

---

## Best Practices

1. **Profile before optimizing** - Never optimize without data
2. **Use appropriate tools** - cProfile for dev, py-spy for production
3. **Focus on hotspots** - The top 20% of code usually causes 80% of slowdown
4. **Measure impact** - Always benchmark before and after changes
5. **Profile realistic workloads** - Synthetic tests may not reflect reality
6. **Monitor in production** - Continuous profiling catches regressions

---

## Conclusion

Profiling transforms optimization from guesswork to science. Key takeaways:

- **cProfile**: Complete coverage, best for development
- **py-spy**: Production-safe, no code changes needed
- **memory_profiler**: Line-by-line memory tracking
- **tracemalloc**: Built-in memory allocation tracking
- **line_profiler**: Per-line timing analysis

Start with high-level profiling to find hotspots, then drill down with line profiling for micro-optimization.

---

*Want to continuously monitor your Python application's performance? [OneUptime](https://oneuptime.com) provides APM with distributed tracing, helping you identify performance bottlenecks across your entire stack.*

**Related Reading:**
- [Basics of Profiling](https://oneuptime.com/blog/post/2025-09-09-basics-of-profiling/view)
- [P50 vs P95 vs P99 Latency Percentiles](https://oneuptime.com/blog/post/2025-09-15-p50-vs-p95-vs-p99-latency-percentiles/view)
