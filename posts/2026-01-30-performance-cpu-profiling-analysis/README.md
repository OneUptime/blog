# How to Implement CPU Profiling Analysis

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Performance, Profiling, CPU, Optimization

Description: Analyze CPU profiles to identify hot functions, optimize algorithms, and reduce CPU usage in production applications.

---

CPU profiling is the process of measuring where your application spends its processing time. Unlike memory profiling or I/O analysis, CPU profiling focuses specifically on computational bottlenecks. This guide walks through practical techniques for implementing CPU profiling in your applications, from development through production.

## Understanding Profiling Methods

There are two fundamental approaches to CPU profiling: sampling and instrumentation. Each has distinct trade-offs that affect when you should use them.

### Sampling Profilers

Sampling profilers periodically interrupt the program and record the current call stack. They work by taking snapshots at regular intervals (typically every 1-10 milliseconds) and building a statistical picture of where time is spent.

Here is a basic example of how sampling works conceptually in Python:

```python
import signal
import sys
import collections
import time

class SimpleSamplingProfiler:
    """
    A minimal sampling profiler that demonstrates the core concept.
    In production, use cProfile or py-spy instead.
    """

    def __init__(self, interval=0.001):
        self.interval = interval  # Sample every 1ms
        self.samples = collections.defaultdict(int)
        self.running = False

    def _sample_handler(self, signum, frame):
        """
        Signal handler that captures the current stack frame.
        Called periodically by the OS timer.
        """
        if frame is None:
            return

        # Walk up the call stack and record each function
        stack = []
        while frame:
            code = frame.f_code
            stack.append(f"{code.co_filename}:{code.co_name}:{frame.f_lineno}")
            frame = frame.f_back

        # Store the full stack trace as a single sample
        stack_key = tuple(reversed(stack))
        self.samples[stack_key] += 1

    def start(self):
        """Begin sampling by setting up a timer signal."""
        self.running = True
        signal.signal(signal.SIGPROF, self._sample_handler)
        # Set interval timer for profiling signal
        signal.setitimer(signal.ITIMER_PROF, self.interval, self.interval)

    def stop(self):
        """Stop sampling and disable the timer."""
        self.running = False
        signal.setitimer(signal.ITIMER_PROF, 0, 0)

    def get_top_functions(self, limit=10):
        """Return the most frequently sampled functions."""
        func_counts = collections.defaultdict(int)
        for stack, count in self.samples.items():
            # The last item in the stack is the function being executed
            if stack:
                func_counts[stack[-1]] += count

        return sorted(func_counts.items(), key=lambda x: x[1], reverse=True)[:limit]
```

### Instrumentation Profilers

Instrumentation profilers wrap every function call to measure exact timings. They provide precise measurements but add overhead to every function invocation.

This example shows how instrumentation profiling works under the hood:

```python
import functools
import time
from typing import Callable, Dict, Any

class InstrumentationProfiler:
    """
    Demonstrates instrumentation-based profiling by wrapping functions.
    The trace approach records entry/exit for every function call.
    """

    def __init__(self):
        self.call_counts: Dict[str, int] = {}
        self.total_times: Dict[str, float] = {}
        self.self_times: Dict[str, float] = {}
        self.call_stack: list = []

    def profile(self, func: Callable) -> Callable:
        """
        Decorator that instruments a function to record timing data.
        Tracks both total time (including callees) and self time.
        """
        func_name = f"{func.__module__}.{func.__qualname__}"

        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Record call count
            self.call_counts[func_name] = self.call_counts.get(func_name, 0) + 1

            # Track nesting for self-time calculation
            start_time = time.perf_counter()
            self.call_stack.append((func_name, start_time, 0.0))

            try:
                result = func(*args, **kwargs)
                return result
            finally:
                end_time = time.perf_counter()
                elapsed = end_time - start_time

                # Pop our entry from the stack
                _, _, child_time = self.call_stack.pop()

                # Total time includes everything
                self.total_times[func_name] = (
                    self.total_times.get(func_name, 0.0) + elapsed
                )

                # Self time excludes time spent in child functions
                self_time = elapsed - child_time
                self.self_times[func_name] = (
                    self.self_times.get(func_name, 0.0) + self_time
                )

                # Update parent's child time accumulator
                if self.call_stack:
                    parent_name, parent_start, parent_child_time = self.call_stack[-1]
                    self.call_stack[-1] = (
                        parent_name,
                        parent_start,
                        parent_child_time + elapsed
                    )

        return wrapper

    def report(self) -> str:
        """Generate a formatted profiling report."""
        lines = ["Function Profile Report", "=" * 60]
        lines.append(f"{'Function':<40} {'Calls':>8} {'Total':>10} {'Self':>10}")
        lines.append("-" * 60)

        # Sort by self time descending
        sorted_funcs = sorted(
            self.self_times.keys(),
            key=lambda f: self.self_times[f],
            reverse=True
        )

        for func_name in sorted_funcs:
            short_name = func_name[-40:] if len(func_name) > 40 else func_name
            lines.append(
                f"{short_name:<40} "
                f"{self.call_counts[func_name]:>8} "
                f"{self.total_times[func_name]:>10.4f} "
                f"{self.self_times[func_name]:>10.4f}"
            )

        return "\n".join(lines)
```

### Comparison of Profiling Approaches

| Aspect | Sampling | Instrumentation |
|--------|----------|-----------------|
| Overhead | Low (1-5%) | High (10-100%+) |
| Accuracy | Statistical | Exact |
| Call counts | Estimated | Precise |
| Production safe | Yes | Rarely |
| Setup complexity | Simple | Requires code changes |
| Missing short functions | Possible | No |
| Stack depth impact | None | Significant |

## Profiling Tools by Language

Different languages have different profiling ecosystems. Here are the recommended tools for common languages.

### Python Profiling

Python offers several profiling options. The built-in cProfile module works well for development.

Using cProfile from the command line:

```bash
# Profile a script and save results to a file
python -m cProfile -o profile_output.prof my_script.py

# View the results sorted by cumulative time
python -c "
import pstats
p = pstats.Stats('profile_output.prof')
p.sort_stats('cumulative')
p.print_stats(20)
"
```

For programmatic profiling in Python:

```python
import cProfile
import pstats
import io
from contextlib import contextmanager

@contextmanager
def profile_block(sort_by='cumulative', lines=20):
    """
    Context manager for profiling a specific code block.

    Usage:
        with profile_block() as stats:
            expensive_operation()
        # Stats are printed automatically
    """
    profiler = cProfile.Profile()
    profiler.enable()

    try:
        yield profiler
    finally:
        profiler.disable()

        # Create a stream for output
        stream = io.StringIO()
        stats = pstats.Stats(profiler, stream=stream)
        stats.sort_stats(sort_by)
        stats.print_stats(lines)

        print(stream.getvalue())


# Example usage
def compute_heavy():
    """Simulated CPU-intensive function."""
    total = 0
    for i in range(1000000):
        total += i * i
    return total


if __name__ == "__main__":
    with profile_block(sort_by='tottime', lines=10):
        result = compute_heavy()
        print(f"Result: {result}")
```

For production Python profiling, py-spy is the standard choice:

```bash
# Install py-spy
pip install py-spy

# Profile a running process by PID
py-spy record -o profile.svg --pid 12345

# Profile a script directly
py-spy record -o profile.svg -- python my_script.py

# Top-like live view of a running process
py-spy top --pid 12345

# Dump current stack traces without continuous profiling
py-spy dump --pid 12345
```

### Node.js Profiling

Node.js has built-in V8 profiler support. Here is how to use it:

```javascript
// profile_example.js
// Enable the V8 profiler programmatically

const v8Profiler = require('v8-profiler-next');
const fs = require('fs');

// Set a unique title for this profiling session
const profileTitle = `cpu-profile-${Date.now()}`;

/**
 * Start CPU profiling and return a function to stop and save.
 * The profile will be saved in Chrome DevTools format.
 */
function startProfiling() {
    v8Profiler.startProfiling(profileTitle, true);

    return function stopAndSave(outputPath) {
        const profile = v8Profiler.stopProfiling(profileTitle);

        return new Promise((resolve, reject) => {
            profile.export((error, result) => {
                if (error) {
                    reject(error);
                    return;
                }

                fs.writeFileSync(outputPath, result);
                profile.delete();
                resolve(outputPath);
            });
        });
    };
}

// Example: Profile an async operation
async function profileAsyncWork() {
    const stopProfiling = startProfiling();

    // Simulate CPU-intensive work
    function fibonacci(n) {
        if (n <= 1) return n;
        return fibonacci(n - 1) + fibonacci(n - 2);
    }

    // Run the workload
    for (let i = 0; i < 10; i++) {
        fibonacci(35);
    }

    // Save the profile
    const outputPath = await stopProfiling('./cpu-profile.cpuprofile');
    console.log(`Profile saved to ${outputPath}`);
    console.log('Open in Chrome DevTools: chrome://inspect -> Open dedicated DevTools');
}

profileAsyncWork().catch(console.error);
```

Using the built-in Node.js inspector for profiling:

```bash
# Start Node with inspector and generate a CPU profile
node --prof app.js

# Process the generated isolate log file
node --prof-process isolate-0x*.log > processed-profile.txt

# Alternative: Use the inspector protocol directly
node --inspect app.js
# Then connect Chrome DevTools and use the Profiler tab
```

### Go Profiling

Go has excellent built-in profiling through pprof:

```go
package main

import (
    "fmt"
    "log"
    "net/http"
    _ "net/http/pprof"  // Import for side effects - registers handlers
    "runtime"
    "runtime/pprof"
    "os"
    "time"
)

// CPUProfiler wraps pprof functionality for easier use
type CPUProfiler struct {
    file *os.File
}

// Start begins CPU profiling and writes to the specified file
func (p *CPUProfiler) Start(filename string) error {
    f, err := os.Create(filename)
    if err != nil {
        return fmt.Errorf("failed to create profile file: %w", err)
    }

    p.file = f

    // Start CPU profiling
    if err := pprof.StartCPUProfile(f); err != nil {
        f.Close()
        return fmt.Errorf("failed to start CPU profile: %w", err)
    }

    return nil
}

// Stop ends CPU profiling and closes the file
func (p *CPUProfiler) Stop() error {
    pprof.StopCPUProfile()

    if p.file != nil {
        return p.file.Close()
    }
    return nil
}

// simulateCPUWork performs CPU-intensive operations for demonstration
func simulateCPUWork(iterations int) int64 {
    var total int64
    for i := 0; i < iterations; i++ {
        // Intentionally inefficient to show up in profiles
        for j := 0; j < 1000; j++ {
            total += int64(i * j)
        }
    }
    return total
}

func main() {
    // Option 1: Profile a specific code section
    profiler := &CPUProfiler{}

    if err := profiler.Start("cpu.prof"); err != nil {
        log.Fatal(err)
    }

    // Run the workload
    result := simulateCPUWork(10000)
    fmt.Printf("Computation result: %d\n", result)

    if err := profiler.Stop(); err != nil {
        log.Fatal(err)
    }

    // Option 2: Enable HTTP endpoint for on-demand profiling
    // This is preferred for long-running services
    go func() {
        // Access profiles at:
        // - http://localhost:6060/debug/pprof/profile?seconds=30 (CPU)
        // - http://localhost:6060/debug/pprof/heap (memory)
        // - http://localhost:6060/debug/pprof/goroutine (goroutines)
        log.Println(http.ListenAndServe("localhost:6060", nil))
    }()

    // Keep the server running
    select {}
}
```

Analyzing Go profiles with pprof:

```bash
# Generate a CPU profile from a running service
curl -o cpu.prof "http://localhost:6060/debug/pprof/profile?seconds=30"

# Analyze with the interactive pprof tool
go tool pprof cpu.prof

# Common pprof commands:
# (pprof) top10          - Show top 10 functions by CPU time
# (pprof) list funcName  - Show source with CPU time annotations
# (pprof) web            - Generate SVG visualization (requires graphviz)
# (pprof) png            - Generate PNG visualization

# Generate a flame graph directly
go tool pprof -http=:8080 cpu.prof
```

### Java Profiling

Java has several profiling options. Here is an example using async-profiler, which is production-safe:

```java
// ProfilerWrapper.java
// Wrapper for programmatic async-profiler control

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

public class ProfilerWrapper {

    // Path to async-profiler library (platform-specific)
    private static final String PROFILER_LIB = "/opt/async-profiler/lib/libasyncProfiler.so";

    /**
     * Start CPU profiling with the specified output format.
     * Supported formats: html, jfr, collapsed, flamegraph
     */
    public static void startProfiling(String outputFile, String format) {
        try {
            // async-profiler can be controlled via command strings
            String command = String.format(
                "start,file=%s,event=cpu,%s",
                outputFile,
                format.equals("html") ? "flamegraph" : format
            );

            // In production, use the profiler's Java API
            System.out.println("Starting profiler: " + command);

        } catch (Exception e) {
            System.err.println("Failed to start profiler: " + e.getMessage());
        }
    }

    /**
     * Stop profiling and write results to the output file.
     */
    public static void stopProfiling() {
        System.out.println("Stopping profiler");
    }

    // Example workload for profiling
    public static long computeIntensive(int iterations) {
        long result = 0;
        for (int i = 0; i < iterations; i++) {
            // Deliberately inefficient string operations
            String temp = "";
            for (int j = 0; j < 100; j++) {
                temp += String.valueOf(j);  // Bad practice - shows up in profiles
            }
            result += temp.length();
        }
        return result;
    }

    public static void main(String[] args) {
        System.out.println("Starting profiled execution");

        long start = System.currentTimeMillis();
        long result = computeIntensive(1000);
        long elapsed = System.currentTimeMillis() - start;

        System.out.printf("Result: %d, Time: %dms%n", result, elapsed);
    }
}
```

Using async-profiler from the command line:

```bash
# Profile a running Java process
./profiler.sh -d 30 -f profile.html <pid>

# Profile with specific events
./profiler.sh -e cpu -d 30 -f cpu.html <pid>

# Generate different output formats
./profiler.sh -d 30 -f profile.jfr <pid>      # Java Flight Recorder format
./profiler.sh -d 30 -f collapsed.txt <pid>     # For flame graph generation
./profiler.sh -d 30 -o flamegraph <pid>        # Direct flame graph output

# Start profiling on application launch
java -agentpath:/path/to/libasyncProfiler.so=start,file=profile.html MyApp
```

## Understanding Wall Time vs CPU Time

A critical distinction in profiling is between wall time and CPU time. Confusing these leads to incorrect optimization decisions.

### Wall Time

Wall time (also called elapsed time or real time) measures the actual duration from start to finish, including time spent waiting for I/O, locks, or other processes.

### CPU Time

CPU time measures only the time the CPU spent executing your code. It excludes time spent waiting.

Here is an example demonstrating the difference:

```python
import time
import threading
import os

def demonstrate_time_difference():
    """
    Shows how wall time and CPU time differ significantly
    when I/O or waiting is involved.
    """

    # Get initial times
    wall_start = time.time()
    cpu_start = time.process_time()  # CPU time only

    # Operation 1: Pure CPU work
    total = 0
    for i in range(5_000_000):
        total += i * i

    cpu_after_compute = time.process_time()
    wall_after_compute = time.time()

    # Operation 2: I/O wait (simulated with sleep)
    time.sleep(2.0)  # 2 seconds of waiting

    # Final times
    wall_end = time.time()
    cpu_end = time.process_time()

    print("Time Analysis:")
    print("-" * 50)
    print(f"CPU computation phase:")
    print(f"  Wall time: {wall_after_compute - wall_start:.4f}s")
    print(f"  CPU time:  {cpu_after_compute - cpu_start:.4f}s")
    print()
    print(f"I/O wait phase:")
    print(f"  Wall time: {wall_end - wall_after_compute:.4f}s")
    print(f"  CPU time:  {cpu_end - cpu_after_compute:.4f}s")
    print()
    print(f"Total:")
    print(f"  Wall time: {wall_end - wall_start:.4f}s")
    print(f"  CPU time:  {cpu_end - cpu_start:.4f}s")
    print()
    print("Notice: CPU time during I/O wait is nearly zero!")


def multi_threaded_cpu_time():
    """
    Demonstrates that process_time() aggregates CPU time
    across all threads in Python.
    """

    def cpu_bound_work():
        total = 0
        for i in range(10_000_000):
            total += i
        return total

    wall_start = time.time()
    cpu_start = time.process_time()

    # Run CPU work in multiple threads
    threads = []
    for _ in range(4):
        t = threading.Thread(target=cpu_bound_work)
        threads.append(t)
        t.start()

    for t in threads:
        t.join()

    wall_end = time.time()
    cpu_end = time.process_time()

    print("\nMulti-threaded Analysis:")
    print("-" * 50)
    print(f"Wall time: {wall_end - wall_start:.4f}s")
    print(f"CPU time:  {cpu_end - cpu_start:.4f}s")
    print("Note: Due to Python's GIL, CPU time may not scale with threads")


if __name__ == "__main__":
    demonstrate_time_difference()
    multi_threaded_cpu_time()
```

### When to Use Each

| Scenario | Use Wall Time | Use CPU Time |
|----------|--------------|--------------|
| User-facing latency | Yes | No |
| Algorithm efficiency | No | Yes |
| I/O-bound services | Yes | Secondary |
| CPU-bound computation | Both | Primary |
| Multi-process systems | Yes | Per-process |
| Billing/resource allocation | Both | Yes |

## Identifying Hot Paths

Hot paths are code sections that consume the most CPU time. Identifying them is the primary goal of profiling.

### Reading Flame Graphs

Flame graphs are the standard visualization for CPU profiles. Here is how to interpret them:

```python
"""
Flame Graph Interpretation Guide

A flame graph stacks function calls vertically:
- The x-axis represents the proportion of samples (NOT time order)
- The y-axis shows stack depth (callers below, callees above)
- Width indicates the percentage of total samples

Example flame graph structure:

    |-------- function_c (15%) --------|
    |--------------- function_b (40%) -----------------|
    |----------------------- function_a (100%) -------------------------|
    |-------------------------- main (100%) ----------------------------|

Reading tips:
1. Look for wide bars - these are your hot functions
2. Look for "plateaus" - flat tops indicate leaf functions doing real work
3. Narrow towers indicate deep call stacks with little time at each level
"""

def generate_collapsed_stacks(samples):
    """
    Convert profiling samples to collapsed stack format.
    This format can be fed into flame graph generators.

    Format: "func1;func2;func3 count"
    """
    collapsed = {}

    for stack, count in samples.items():
        # Join stack frames with semicolons
        stack_str = ";".join(stack)
        collapsed[stack_str] = collapsed.get(stack_str, 0) + count

    # Output in collapsed format
    lines = []
    for stack_str, count in sorted(collapsed.items()):
        lines.append(f"{stack_str} {count}")

    return "\n".join(lines)


def find_hot_paths(samples, threshold_pct=5.0):
    """
    Identify hot paths that exceed a percentage threshold.
    Returns functions sorted by their contribution to total samples.
    """
    total_samples = sum(samples.values())

    # Aggregate by function (leaf of each stack)
    function_samples = {}
    for stack, count in samples.items():
        if stack:
            leaf_func = stack[-1]
            function_samples[leaf_func] = function_samples.get(leaf_func, 0) + count

    # Filter by threshold and sort
    hot_functions = []
    for func, count in function_samples.items():
        pct = (count / total_samples) * 100
        if pct >= threshold_pct:
            hot_functions.append({
                'function': func,
                'samples': count,
                'percentage': pct
            })

    return sorted(hot_functions, key=lambda x: x['samples'], reverse=True)


# Example usage with mock data
mock_samples = {
    ('main', 'process_request', 'parse_json'): 150,
    ('main', 'process_request', 'validate_input'): 50,
    ('main', 'process_request', 'execute_query', 'serialize'): 300,
    ('main', 'process_request', 'execute_query', 'db_fetch'): 200,
    ('main', 'log_request'): 30,
}

if __name__ == "__main__":
    print("Collapsed stacks format:")
    print(generate_collapsed_stacks(mock_samples))
    print()
    print("Hot paths (>5% threshold):")
    for path in find_hot_paths(mock_samples):
        print(f"  {path['function']}: {path['percentage']:.1f}%")
```

### Common Hot Path Patterns

Here are patterns that frequently appear as hot paths:

```python
"""
Pattern 1: String concatenation in loops
Bad: O(n^2) due to string immutability
"""
def bad_string_concat(items):
    result = ""
    for item in items:
        result += str(item)  # Creates new string each iteration
    return result

def good_string_concat(items):
    return "".join(str(item) for item in items)  # O(n)


"""
Pattern 2: Repeated container lookups
Bad: Dictionary lookup in tight loop
"""
def bad_repeated_lookup(data, keys):
    results = []
    for key in keys:
        if key in data:  # Lookup 1
            results.append(data[key])  # Lookup 2
    return results

def good_repeated_lookup(data, keys):
    results = []
    for key in keys:
        value = data.get(key)  # Single lookup
        if value is not None:
            results.append(value)
    return results


"""
Pattern 3: Unnecessary object creation
Bad: Creating objects in hot loop
"""
import re

def bad_regex_usage(texts, pattern):
    results = []
    for text in texts:
        match = re.search(pattern, text)  # Compiles regex each time
        if match:
            results.append(match.group())
    return results

def good_regex_usage(texts, pattern):
    compiled = re.compile(pattern)  # Compile once
    results = []
    for text in texts:
        match = compiled.search(text)
        if match:
            results.append(match.group())
    return results


"""
Pattern 4: Algorithm complexity issues
Bad: O(n^2) nested loops
"""
def bad_duplicate_check(items):
    duplicates = []
    for i, item1 in enumerate(items):
        for item2 in items[i+1:]:
            if item1 == item2:
                duplicates.append(item1)
    return duplicates

def good_duplicate_check(items):
    seen = set()
    duplicates = []
    for item in items:
        if item in seen:
            duplicates.append(item)
        seen.add(item)
    return duplicates  # O(n) average case
```

## Low-Overhead Production Profiling

Production profiling requires minimal performance impact. Here are strategies for safe production profiling.

### Continuous Profiling Architecture

```python
"""
Continuous profiling collects samples over time and aggregates them.
This approach provides always-on visibility with minimal overhead.
"""

import threading
import time
import signal
import collections
from dataclasses import dataclass, field
from typing import Dict, List, Optional
import json


@dataclass
class ProfileWindow:
    """Represents a time window of profiling data."""
    start_time: float
    end_time: float
    samples: Dict[tuple, int] = field(default_factory=dict)
    total_samples: int = 0


class ContinuousProfiler:
    """
    Production-safe continuous profiler that:
    - Samples at low frequency (10-100 Hz)
    - Aggregates into time windows
    - Exports periodically for analysis
    """

    def __init__(
        self,
        sample_rate_hz: float = 100,
        window_seconds: int = 60,
        export_callback=None
    ):
        self.sample_interval = 1.0 / sample_rate_hz
        self.window_seconds = window_seconds
        self.export_callback = export_callback

        self.current_window: Optional[ProfileWindow] = None
        self.lock = threading.Lock()
        self.running = False

    def _create_new_window(self) -> ProfileWindow:
        """Create a fresh profiling window."""
        now = time.time()
        return ProfileWindow(
            start_time=now,
            end_time=now + self.window_seconds,
            samples={},
            total_samples=0
        )

    def _sample_handler(self, signum, frame):
        """
        Signal handler for collecting stack samples.
        Designed to be as fast as possible to minimize overhead.
        """
        if frame is None or not self.running:
            return

        # Build stack trace quickly
        stack = []
        current = frame
        depth = 0
        max_depth = 50  # Limit stack depth for performance

        while current and depth < max_depth:
            code = current.f_code
            # Use interned strings for memory efficiency
            stack.append((code.co_filename, code.co_name, current.f_lineno))
            current = current.f_back
            depth += 1

        stack_key = tuple(reversed(stack))

        # Quick lock acquisition for thread safety
        with self.lock:
            if self.current_window is None:
                self.current_window = self._create_new_window()

            # Check if window has expired
            now = time.time()
            if now >= self.current_window.end_time:
                self._rotate_window()

            # Record the sample
            self.current_window.samples[stack_key] = (
                self.current_window.samples.get(stack_key, 0) + 1
            )
            self.current_window.total_samples += 1

    def _rotate_window(self):
        """Export current window and start a new one."""
        if self.current_window and self.export_callback:
            # Export in background to avoid blocking
            old_window = self.current_window
            threading.Thread(
                target=self.export_callback,
                args=(old_window,),
                daemon=True
            ).start()

        self.current_window = self._create_new_window()

    def start(self):
        """Begin continuous profiling."""
        self.running = True
        self.current_window = self._create_new_window()

        signal.signal(signal.SIGPROF, self._sample_handler)
        signal.setitimer(
            signal.ITIMER_PROF,
            self.sample_interval,
            self.sample_interval
        )

    def stop(self):
        """Stop profiling and export final window."""
        self.running = False
        signal.setitimer(signal.ITIMER_PROF, 0, 0)

        with self.lock:
            if self.current_window and self.export_callback:
                self.export_callback(self.current_window)
            self.current_window = None


def export_to_pprof_format(window: ProfileWindow, output_path: str):
    """
    Export profiling data in a format compatible with pprof.
    In production, use the official pprof protobuf format.
    """
    export_data = {
        'start_time': window.start_time,
        'end_time': window.end_time,
        'total_samples': window.total_samples,
        'sample_rate': 100,  # Hz
        'stacks': [
            {
                'frames': [
                    {'file': f[0], 'function': f[1], 'line': f[2]}
                    for f in stack
                ],
                'count': count
            }
            for stack, count in window.samples.items()
        ]
    }

    with open(output_path, 'w') as f:
        json.dump(export_data, f, indent=2)

    print(f"Exported {window.total_samples} samples to {output_path}")
```

### Sampling Rate Guidelines

| Environment | Recommended Rate | Overhead | Use Case |
|-------------|-----------------|----------|----------|
| Development | 1000 Hz | 5-10% | Detailed analysis |
| Staging | 100-500 Hz | 1-5% | Pre-production validation |
| Production (low traffic) | 100 Hz | 1-2% | Continuous monitoring |
| Production (high traffic) | 10-50 Hz | <1% | Always-on profiling |
| Production (sampling) | 1-10 Hz | <0.1% | Long-term trends |

### Request-Scoped Profiling

For web services, profile individual requests rather than the entire process:

```python
import contextvars
import time
import functools
from typing import Dict, List, Any
import uuid

# Context variable for request-scoped profiling
request_profile = contextvars.ContextVar('request_profile', default=None)


class RequestProfiler:
    """
    Lightweight profiler for individual request tracing.
    Lower overhead than full CPU profiling, suitable for production.
    """

    def __init__(self, request_id: str = None):
        self.request_id = request_id or str(uuid.uuid4())[:8]
        self.spans: List[Dict[str, Any]] = []
        self.start_time = time.perf_counter()

    def span(self, name: str):
        """
        Context manager for timing a code section.
        Captures wall time for the span.
        """
        return ProfileSpan(self, name)

    def add_span(self, name: str, start: float, end: float, metadata: dict = None):
        """Record a completed span."""
        self.spans.append({
            'name': name,
            'start_offset_ms': (start - self.start_time) * 1000,
            'duration_ms': (end - start) * 1000,
            'metadata': metadata or {}
        })

    def get_summary(self) -> Dict[str, Any]:
        """Generate a summary of the request profile."""
        total_time = (time.perf_counter() - self.start_time) * 1000

        # Aggregate by span name
        by_name = {}
        for span in self.spans:
            name = span['name']
            if name not in by_name:
                by_name[name] = {'count': 0, 'total_ms': 0}
            by_name[name]['count'] += 1
            by_name[name]['total_ms'] += span['duration_ms']

        return {
            'request_id': self.request_id,
            'total_ms': total_time,
            'span_count': len(self.spans),
            'by_operation': by_name,
            'spans': self.spans
        }


class ProfileSpan:
    """Context manager for timing individual operations."""

    def __init__(self, profiler: RequestProfiler, name: str):
        self.profiler = profiler
        self.name = name
        self.start_time = None
        self.metadata = {}

    def __enter__(self):
        self.start_time = time.perf_counter()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        end_time = time.perf_counter()
        if exc_type:
            self.metadata['error'] = str(exc_type.__name__)
        self.profiler.add_span(
            self.name,
            self.start_time,
            end_time,
            self.metadata
        )
        return False


def profile_request(func):
    """Decorator to automatically profile a request handler."""

    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        profiler = RequestProfiler()
        token = request_profile.set(profiler)

        try:
            with profiler.span('total'):
                result = func(*args, **kwargs)
            return result
        finally:
            request_profile.reset(token)
            summary = profiler.get_summary()
            # In production, send to monitoring system
            if summary['total_ms'] > 100:  # Log slow requests
                print(f"Slow request {summary['request_id']}: {summary['total_ms']:.1f}ms")

    return wrapper


# Example usage
@profile_request
def handle_request(user_id: int) -> dict:
    profiler = request_profile.get()

    with profiler.span('auth'):
        time.sleep(0.01)  # Simulate auth check

    with profiler.span('database'):
        time.sleep(0.05)  # Simulate DB query

    with profiler.span('serialize'):
        result = {'user_id': user_id, 'status': 'ok'}

    return result


if __name__ == "__main__":
    result = handle_request(123)
    profiler = request_profile.get()
    if profiler:
        import json
        print(json.dumps(profiler.get_summary(), indent=2))
```

## Interpreting Profiles

Raw profile data needs interpretation to drive optimization decisions. Here are techniques for extracting actionable insights.

### Profile Analysis Script

```python
"""
Script for analyzing CPU profile data and generating recommendations.
Works with common profile formats (pprof, collapsed stacks).
"""

import json
from dataclasses import dataclass
from typing import List, Dict, Tuple
import re


@dataclass
class ProfileAnalysis:
    """Results of profile analysis."""
    total_samples: int
    hot_functions: List[Dict]
    call_patterns: List[Dict]
    recommendations: List[str]


def parse_collapsed_stacks(content: str) -> Dict[Tuple[str, ...], int]:
    """Parse collapsed stack format into a samples dictionary."""
    samples = {}
    for line in content.strip().split('\n'):
        if not line:
            continue
        parts = line.rsplit(' ', 1)
        if len(parts) != 2:
            continue
        stack_str, count_str = parts
        stack = tuple(stack_str.split(';'))
        samples[stack] = int(count_str)
    return samples


def analyze_profile(samples: Dict[Tuple[str, ...], int]) -> ProfileAnalysis:
    """
    Perform comprehensive analysis of CPU profile samples.
    Returns actionable insights about performance bottlenecks.
    """
    total_samples = sum(samples.values())

    # Aggregate samples by function (self time only)
    function_self_samples = {}
    function_total_samples = {}

    for stack, count in samples.items():
        # Self time: function at top of stack
        if stack:
            leaf = stack[-1]
            function_self_samples[leaf] = function_self_samples.get(leaf, 0) + count

        # Total time: all functions in stack
        for func in stack:
            function_total_samples[func] = function_total_samples.get(func, 0) + count

    # Find hot functions (high self time)
    hot_functions = []
    for func, self_count in sorted(
        function_self_samples.items(),
        key=lambda x: x[1],
        reverse=True
    )[:20]:
        total_count = function_total_samples.get(func, self_count)
        hot_functions.append({
            'function': func,
            'self_samples': self_count,
            'self_pct': (self_count / total_samples) * 100,
            'total_samples': total_count,
            'total_pct': (total_count / total_samples) * 100
        })

    # Identify call patterns (parent-child relationships)
    call_edges = {}
    for stack, count in samples.items():
        for i in range(len(stack) - 1):
            caller = stack[i]
            callee = stack[i + 1]
            edge = (caller, callee)
            call_edges[edge] = call_edges.get(edge, 0) + count

    call_patterns = [
        {
            'caller': edge[0],
            'callee': edge[1],
            'samples': count,
            'pct': (count / total_samples) * 100
        }
        for edge, count in sorted(
            call_edges.items(),
            key=lambda x: x[1],
            reverse=True
        )[:10]
    ]

    # Generate recommendations
    recommendations = generate_recommendations(
        hot_functions,
        call_patterns,
        total_samples
    )

    return ProfileAnalysis(
        total_samples=total_samples,
        hot_functions=hot_functions,
        call_patterns=call_patterns,
        recommendations=recommendations
    )


def generate_recommendations(
    hot_functions: List[Dict],
    call_patterns: List[Dict],
    total_samples: int
) -> List[str]:
    """
    Generate optimization recommendations based on profile analysis.
    """
    recommendations = []

    # Check for dominant functions
    if hot_functions and hot_functions[0]['self_pct'] > 30:
        func = hot_functions[0]
        recommendations.append(
            f"Function '{func['function']}' consumes {func['self_pct']:.1f}% of CPU. "
            f"This is a primary optimization target."
        )

    # Check for JSON/serialization overhead
    json_funcs = [f for f in hot_functions if 'json' in f['function'].lower()]
    if json_funcs:
        total_json_pct = sum(f['self_pct'] for f in json_funcs)
        if total_json_pct > 10:
            recommendations.append(
                f"JSON operations consume {total_json_pct:.1f}% of CPU. "
                f"Consider using a faster JSON library (orjson, ujson) or reducing serialization."
            )

    # Check for regex overhead
    regex_funcs = [f for f in hot_functions if 're.' in f['function'] or 'regex' in f['function'].lower()]
    if regex_funcs:
        total_regex_pct = sum(f['self_pct'] for f in regex_funcs)
        if total_regex_pct > 5:
            recommendations.append(
                f"Regex operations consume {total_regex_pct:.1f}% of CPU. "
                f"Consider pre-compiling patterns or using string methods."
            )

    # Check for memory allocation patterns
    alloc_keywords = ['malloc', 'alloc', 'new', 'copy', 'clone']
    alloc_funcs = [
        f for f in hot_functions
        if any(kw in f['function'].lower() for kw in alloc_keywords)
    ]
    if alloc_funcs:
        total_alloc_pct = sum(f['self_pct'] for f in alloc_funcs)
        if total_alloc_pct > 15:
            recommendations.append(
                f"Memory allocation consumes {total_alloc_pct:.1f}% of CPU. "
                f"Consider object pooling or reducing allocations in hot paths."
            )

    # Check for lock contention
    lock_funcs = [f for f in hot_functions if 'lock' in f['function'].lower() or 'mutex' in f['function'].lower()]
    if lock_funcs:
        recommendations.append(
            "Lock-related functions appear in hot paths. "
            "Consider reducing critical section size or using lock-free data structures."
        )

    if not recommendations:
        recommendations.append(
            "No obvious optimization targets identified. "
            "Consider algorithmic improvements or caching strategies."
        )

    return recommendations


def print_analysis_report(analysis: ProfileAnalysis):
    """Print a formatted analysis report."""
    print("=" * 70)
    print("CPU PROFILE ANALYSIS REPORT")
    print("=" * 70)
    print(f"\nTotal samples: {analysis.total_samples:,}")

    print("\n--- Hot Functions (by self time) ---")
    print(f"{'Function':<50} {'Self %':>8} {'Total %':>8}")
    print("-" * 70)
    for func in analysis.hot_functions[:10]:
        name = func['function'][-50:] if len(func['function']) > 50 else func['function']
        print(f"{name:<50} {func['self_pct']:>7.1f}% {func['total_pct']:>7.1f}%")

    print("\n--- Top Call Patterns ---")
    for pattern in analysis.call_patterns[:5]:
        print(f"  {pattern['caller'][-30:]} -> {pattern['callee'][-30:]}: {pattern['pct']:.1f}%")

    print("\n--- Recommendations ---")
    for i, rec in enumerate(analysis.recommendations, 1):
        print(f"{i}. {rec}")

    print()


# Example usage
if __name__ == "__main__":
    example_collapsed = """
main;process_request;parse_json 1500
main;process_request;validate 500
main;process_request;db_query;serialize_json 3000
main;process_request;db_query;execute 2000
main;process_request;db_query;lock_acquire 800
main;logging 200
"""

    samples = parse_collapsed_stacks(example_collapsed)
    analysis = analyze_profile(samples)
    print_analysis_report(analysis)
```

### Differential Profiling

Compare profiles before and after changes to measure improvement:

```python
"""
Differential profiling compares two profiles to identify
performance regressions or improvements.
"""

from typing import Dict, Tuple, List
from dataclasses import dataclass


@dataclass
class DiffResult:
    """Result of comparing two profiles."""
    function: str
    baseline_pct: float
    current_pct: float
    change_pct: float
    change_type: str  # 'regression', 'improvement', 'new', 'removed'


def compare_profiles(
    baseline: Dict[str, float],  # function -> percentage
    current: Dict[str, float],
    threshold_pct: float = 1.0
) -> List[DiffResult]:
    """
    Compare two profiles and identify significant changes.

    Args:
        baseline: Baseline profile with function percentages
        current: Current profile with function percentages
        threshold_pct: Minimum change to report

    Returns:
        List of functions with significant changes
    """
    results = []
    all_functions = set(baseline.keys()) | set(current.keys())

    for func in all_functions:
        baseline_pct = baseline.get(func, 0.0)
        current_pct = current.get(func, 0.0)
        change = current_pct - baseline_pct

        # Skip insignificant changes
        if abs(change) < threshold_pct:
            continue

        # Determine change type
        if func not in baseline:
            change_type = 'new'
        elif func not in current:
            change_type = 'removed'
        elif change > 0:
            change_type = 'regression'
        else:
            change_type = 'improvement'

        results.append(DiffResult(
            function=func,
            baseline_pct=baseline_pct,
            current_pct=current_pct,
            change_pct=change,
            change_type=change_type
        ))

    # Sort by absolute change magnitude
    results.sort(key=lambda x: abs(x.change_pct), reverse=True)
    return results


def print_diff_report(results: List[DiffResult]):
    """Print a formatted diff report."""
    print("\n" + "=" * 70)
    print("PROFILE COMPARISON REPORT")
    print("=" * 70)

    regressions = [r for r in results if r.change_type == 'regression']
    improvements = [r for r in results if r.change_type == 'improvement']
    new_funcs = [r for r in results if r.change_type == 'new']
    removed = [r for r in results if r.change_type == 'removed']

    if regressions:
        print("\n--- Regressions (increased CPU usage) ---")
        for r in regressions:
            print(f"  {r.function}: {r.baseline_pct:.1f}% -> {r.current_pct:.1f}% (+{r.change_pct:.1f}%)")

    if improvements:
        print("\n--- Improvements (decreased CPU usage) ---")
        for r in improvements:
            print(f"  {r.function}: {r.baseline_pct:.1f}% -> {r.current_pct:.1f}% ({r.change_pct:.1f}%)")

    if new_funcs:
        print("\n--- New hot functions ---")
        for r in new_funcs:
            print(f"  {r.function}: {r.current_pct:.1f}%")

    if removed:
        print("\n--- Functions no longer hot ---")
        for r in removed:
            print(f"  {r.function}: was {r.baseline_pct:.1f}%")

    # Summary
    total_regression = sum(r.change_pct for r in regressions)
    total_improvement = sum(abs(r.change_pct) for r in improvements)

    print("\n--- Summary ---")
    print(f"Total regression: +{total_regression:.1f}%")
    print(f"Total improvement: -{total_improvement:.1f}%")
    print(f"Net change: {total_regression - total_improvement:+.1f}%")


# Example usage
if __name__ == "__main__":
    baseline_profile = {
        'parse_json': 15.0,
        'serialize_json': 20.0,
        'db_query': 25.0,
        'validation': 10.0,
        'string_concat': 8.0,
    }

    current_profile = {
        'parse_json': 8.0,   # Improved (switched to orjson)
        'serialize_json': 12.0,  # Improved
        'db_query': 28.0,   # Slight regression
        'validation': 10.0,  # No change
        'cache_lookup': 5.0,  # New function
    }

    diff_results = compare_profiles(baseline_profile, current_profile)
    print_diff_report(diff_results)
```

## Summary

CPU profiling is essential for understanding and optimizing application performance. Key takeaways:

1. Choose the right profiling method: Use sampling profilers for production (low overhead) and instrumentation profilers for development (precise measurements).

2. Understand the metrics: Know the difference between wall time and CPU time. Use wall time for user-facing latency, CPU time for algorithm efficiency.

3. Use appropriate tools: Each language has battle-tested profiling tools. Use py-spy for Python, async-profiler for Java, pprof for Go.

4. Focus on hot paths: The majority of CPU time is typically spent in a small percentage of code. Identify and optimize these areas first.

5. Profile in production: Development profiles do not reflect production behavior. Use continuous profiling with low sample rates for production visibility.

6. Measure improvements: Use differential profiling to verify that optimizations actually improve performance.

7. Keep overhead low: In production, target less than 1-2% overhead. Adjust sample rates based on your traffic and sensitivity requirements.

Effective CPU profiling requires both the right tools and the analytical skills to interpret the data. Start with high-level flame graphs to identify hot paths, then drill down into specific functions with detailed profiling to find optimization opportunities.
