# How to Use Memory Profiling Effectively

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Memory Profiling, Performance, Debugging, Optimization, Profiling, Python, Node.js, Go, Java

Description: Learn how to use memory profiling tools to identify memory leaks, optimize allocation patterns, and improve application performance across Python, Node.js, Go, and Java.

---

> Memory issues are silent killers. Your application may run fine for hours, then suddenly crash or slow to a crawl. Memory profiling gives you visibility into what your code is actually doing with memory, turning invisible problems into actionable insights.

Memory problems differ from CPU bottlenecks. A slow function is annoying but predictable. A memory leak grows over time, causing crashes at 3 AM. Memory profiling helps you catch these issues before they impact users.

---

## Why Memory Profiling Matters

Memory issues cause:
- **Application crashes** from out-of-memory errors
- **Performance degradation** from garbage collection pressure
- **Increased infrastructure costs** from oversized servers
- **Unpredictable behavior** that is hard to reproduce

Unlike CPU profiling, memory problems often appear only after extended runtime. A function that leaks 1KB per request becomes a crisis at 100K requests per day.

---

## Types of Memory Issues

| Issue Type | Description | Symptoms |
|------------|-------------|----------|
| **Memory Leaks** | Objects retained longer than needed | Steadily growing memory over time |
| **Memory Bloat** | Inefficient data structures | High baseline memory usage |
| **Fragmentation** | Scattered allocations | Memory unavailable despite being "free" |
| **Allocation Churn** | Excessive object creation | High GC pressure, latency spikes |

---

## Python Memory Profiling

### tracemalloc - Built-in Allocation Tracking

tracemalloc is Python's built-in memory tracer. It tracks every allocation with source location information:

```python
# tracemalloc_example.py
import tracemalloc

def find_memory_hogs():
    # Start tracing memory allocations
    tracemalloc.start()

    # Your code that might leak memory
    data = []
    for i in range(10000):
        # Each dict allocates memory that is tracked
        data.append({'id': i, 'payload': 'x' * 1000})

    # Take a snapshot of current allocations
    snapshot = tracemalloc.take_snapshot()

    # Get top 10 allocations by size
    top_stats = snapshot.statistics('lineno')

    print("Top 10 memory allocations:")
    for stat in top_stats[:10]:
        print(f"  {stat}")

    # Show current and peak memory usage
    current, peak = tracemalloc.get_traced_memory()
    print(f"\nCurrent: {current / 1024 / 1024:.2f} MB")
    print(f"Peak: {peak / 1024 / 1024:.2f} MB")

    tracemalloc.stop()

if __name__ == "__main__":
    find_memory_hogs()
```

### Comparing Snapshots to Find Leaks

The power of tracemalloc is comparing snapshots over time:

```python
# memory_leak_detector.py
import tracemalloc
import gc

class MemoryLeakDetector:
    """Detects memory leaks by comparing snapshots"""

    def __init__(self):
        self.snapshots = []

    def start(self):
        tracemalloc.start()

    def take_snapshot(self, label=""):
        # Force garbage collection before snapshot
        gc.collect()
        snapshot = tracemalloc.take_snapshot()
        self.snapshots.append((label, snapshot))
        return snapshot

    def compare_snapshots(self, idx1=0, idx2=-1):
        """Compare two snapshots to find memory growth"""
        label1, snap1 = self.snapshots[idx1]
        label2, snap2 = self.snapshots[idx2]

        # Compare by line number for detailed analysis
        diff = snap2.compare_to(snap1, 'lineno')

        print(f"Memory changes from '{label1}' to '{label2}':")
        for stat in diff[:10]:
            # Only show increases
            if stat.size_diff > 0:
                print(f"  +{stat.size_diff / 1024:.1f} KB: {stat.traceback}")

    def stop(self):
        tracemalloc.stop()

# Usage
detector = MemoryLeakDetector()
detector.start()

detector.take_snapshot("baseline")

# Run some operations
leaky_list = []
for i in range(1000):
    leaky_list.append(object())

detector.take_snapshot("after operations")

detector.compare_snapshots()
detector.stop()
```

### memory_profiler - Line-by-Line Analysis

memory_profiler shows memory usage per line of code:

```bash
pip install memory_profiler
```

```python
# memory_line_profile.py
from memory_profiler import profile

@profile
def inefficient_processing():
    # Line 1: Allocates ~80MB for 10M integers
    data = list(range(10000000))

    # Line 2: Allocates another ~80MB for squared values
    squared = [x ** 2 for x in data]

    # Line 3: Allocates ~80MB for filtered results
    filtered = [x for x in squared if x % 2 == 0]

    # Line 4: Single integer result
    result = sum(filtered)

    return result

@profile
def efficient_processing():
    # Uses generator expressions - minimal memory footprint
    # Each value computed and discarded immediately
    result = sum(
        x ** 2
        for x in range(10000000)
        if (x ** 2) % 2 == 0
    )
    return result

if __name__ == "__main__":
    print("Inefficient version:")
    inefficient_processing()

    print("\nEfficient version:")
    efficient_processing()
```

Run with:

```bash
python -m memory_profiler memory_line_profile.py
```

Output shows memory increment per line:

```
Line #    Mem usage    Increment   Line Contents
================================================
     5     38.5 MiB     38.5 MiB   @profile
     6                             def inefficient_processing():
     7    118.5 MiB     80.0 MiB       data = list(range(10000000))
     8    198.5 MiB     80.0 MiB       squared = [x ** 2 for x in data]
     9    278.5 MiB     80.0 MiB       filtered = [x for x in squared if x % 2 == 0]
```

---

## Node.js Memory Profiling

### Heap Snapshots with Chrome DevTools

Node.js uses V8, which provides powerful heap profiling tools:

```javascript
// heap_snapshot.js
const v8 = require('v8');
const fs = require('fs');

class HeapProfiler {
    constructor() {
        this.snapshots = [];
    }

    // Take a heap snapshot and save to file
    takeSnapshot(filename) {
        const snapshotPath = `${filename}.heapsnapshot`;

        // Write heap snapshot stream to file
        const snapshotStream = v8.writeHeapSnapshot(snapshotPath);

        console.log(`Heap snapshot written to: ${snapshotStream}`);
        this.snapshots.push(snapshotStream);

        return snapshotStream;
    }

    // Get current heap statistics
    getHeapStats() {
        const stats = v8.getHeapStatistics();
        return {
            totalHeapSize: (stats.total_heap_size / 1024 / 1024).toFixed(2) + ' MB',
            usedHeapSize: (stats.used_heap_size / 1024 / 1024).toFixed(2) + ' MB',
            heapSizeLimit: (stats.heap_size_limit / 1024 / 1024).toFixed(2) + ' MB',
            externalMemory: (stats.external_memory / 1024 / 1024).toFixed(2) + ' MB'
        };
    }
}

// Usage
const profiler = new HeapProfiler();

console.log('Initial heap:', profiler.getHeapStats());
profiler.takeSnapshot('snapshot-1');

// Simulate memory usage
const leakyArray = [];
for (let i = 0; i < 100000; i++) {
    leakyArray.push({ id: i, data: 'x'.repeat(100) });
}

console.log('After allocations:', profiler.getHeapStats());
profiler.takeSnapshot('snapshot-2');

// Load snapshots in Chrome DevTools:
// 1. Open Chrome DevTools (F12)
// 2. Go to Memory tab
// 3. Load the .heapsnapshot files
// 4. Compare snapshots to find retained objects
```

### Using heapdump for Production

```bash
npm install heapdump
```

```javascript
// heapdump_example.js
const heapdump = require('heapdump');
const path = require('path');

class MemoryMonitor {
    constructor(options = {}) {
        this.threshold = options.threshold || 500; // MB
        this.dumpPath = options.dumpPath || './dumps';
        this.interval = options.interval || 60000; // 1 minute
    }

    start() {
        // Check memory periodically
        setInterval(() => {
            const used = process.memoryUsage().heapUsed / 1024 / 1024;

            console.log(`Heap used: ${used.toFixed(2)} MB`);

            // Auto-dump if threshold exceeded
            if (used > this.threshold) {
                this.dumpHeap('threshold-exceeded');
            }
        }, this.interval);

        // Dump on SIGUSR2 signal (kill -USR2 <pid>)
        process.on('SIGUSR2', () => {
            this.dumpHeap('manual-signal');
        });
    }

    dumpHeap(reason) {
        const filename = path.join(
            this.dumpPath,
            `heap-${reason}-${Date.now()}.heapsnapshot`
        );

        heapdump.writeSnapshot(filename, (err, filepath) => {
            if (err) {
                console.error('Heap dump failed:', err);
            } else {
                console.log(`Heap dump written to: ${filepath}`);
            }
        });
    }
}

// Usage
const monitor = new MemoryMonitor({ threshold: 200 });
monitor.start();
```

### Tracking Memory Leaks in Express

```javascript
// express_memory_tracking.js
const express = require('express');
const v8 = require('v8');

const app = express();

// Memory tracking middleware
app.use((req, res, next) => {
    const startMem = process.memoryUsage().heapUsed;

    res.on('finish', () => {
        const endMem = process.memoryUsage().heapUsed;
        const diff = (endMem - startMem) / 1024;

        // Log requests that allocate significant memory
        if (diff > 100) { // More than 100KB
            console.log(`Memory spike: ${req.method} ${req.path} - ${diff.toFixed(2)} KB`);
        }
    });

    next();
});

// Memory stats endpoint
app.get('/debug/memory', (req, res) => {
    const mem = process.memoryUsage();
    const heapStats = v8.getHeapStatistics();

    res.json({
        rss: (mem.rss / 1024 / 1024).toFixed(2) + ' MB',
        heapTotal: (mem.heapTotal / 1024 / 1024).toFixed(2) + ' MB',
        heapUsed: (mem.heapUsed / 1024 / 1024).toFixed(2) + ' MB',
        external: (mem.external / 1024 / 1024).toFixed(2) + ' MB',
        heapSizeLimit: (heapStats.heap_size_limit / 1024 / 1024).toFixed(2) + ' MB'
    });
});

// Force GC endpoint (requires --expose-gc flag)
app.post('/debug/gc', (req, res) => {
    if (global.gc) {
        global.gc();
        res.json({ message: 'Garbage collection triggered' });
    } else {
        res.status(400).json({
            error: 'GC not exposed. Start node with --expose-gc flag'
        });
    }
});

app.listen(3000);
```

---

## Go Memory Profiling

### Using pprof

Go has built-in profiling through the pprof package:

```go
// memory_profile.go
package main

import (
    "fmt"
    "net/http"
    _ "net/http/pprof" // Import for side effects
    "runtime"
    "time"
)

// PrintMemStats outputs current memory statistics
func PrintMemStats() {
    var m runtime.MemStats
    runtime.ReadMemStats(&m)

    fmt.Printf("Alloc = %v MB\n", m.Alloc/1024/1024)
    fmt.Printf("TotalAlloc = %v MB\n", m.TotalAlloc/1024/1024)
    fmt.Printf("Sys = %v MB\n", m.Sys/1024/1024)
    fmt.Printf("NumGC = %v\n", m.NumGC)
    fmt.Printf("HeapObjects = %v\n", m.HeapObjects)
}

// SimulateMemoryUsage creates allocations for profiling
func SimulateMemoryUsage() {
    // Create slice that holds references
    var data [][]byte

    for i := 0; i < 100; i++ {
        // Allocate 1MB chunks
        chunk := make([]byte, 1024*1024)
        data = append(data, chunk)

        // Print stats every 10 iterations
        if i%10 == 0 {
            PrintMemStats()
        }

        time.Sleep(100 * time.Millisecond)
    }

    // Keep data alive to prevent GC
    _ = data
}

func main() {
    // Start pprof server on separate port
    go func() {
        // Access profiles at:
        // http://localhost:6060/debug/pprof/heap
        // http://localhost:6060/debug/pprof/allocs
        http.ListenAndServe("localhost:6060", nil)
    }()

    fmt.Println("pprof server running at http://localhost:6060/debug/pprof/")

    // Run memory-intensive operation
    SimulateMemoryUsage()

    // Keep main alive
    select {}
}
```

### Capturing and Analyzing Heap Profiles

```bash
# Capture heap profile from running application
go tool pprof http://localhost:6060/debug/pprof/heap

# Save profile to file
curl -o heap.prof http://localhost:6060/debug/pprof/heap

# Analyze with interactive mode
go tool pprof heap.prof

# Common pprof commands:
# top10        - Show top 10 memory consumers
# list funcName - Show line-by-line allocation for function
# web          - Open visualization in browser
# png          - Save visualization as PNG
```

### Programmatic Memory Profiling

```go
// programmatic_profile.go
package main

import (
    "os"
    "runtime"
    "runtime/pprof"
)

func captureHeapProfile(filename string) error {
    // Force GC to get accurate picture
    runtime.GC()

    f, err := os.Create(filename)
    if err != nil {
        return err
    }
    defer f.Close()

    // Write heap profile
    return pprof.WriteHeapProfile(f)
}

func compareProfiles() {
    // Capture baseline
    captureHeapProfile("heap-before.prof")

    // Run operations
    runMemoryIntensiveTask()

    // Capture after
    captureHeapProfile("heap-after.prof")

    // Compare with:
    // go tool pprof -base heap-before.prof heap-after.prof
}

func runMemoryIntensiveTask() {
    data := make([]string, 0, 100000)
    for i := 0; i < 100000; i++ {
        data = append(data, fmt.Sprintf("item-%d", i))
    }
    _ = data
}
```

### Finding Memory Leaks in Go

```go
// leak_detector.go
package main

import (
    "runtime"
    "time"
)

// LeakDetector monitors memory growth over time
type LeakDetector struct {
    samples   []uint64
    interval  time.Duration
    threshold float64 // Percentage growth that triggers alert
}

func NewLeakDetector(interval time.Duration, threshold float64) *LeakDetector {
    return &LeakDetector{
        samples:   make([]uint64, 0),
        interval:  interval,
        threshold: threshold,
    }
}

func (ld *LeakDetector) Start() {
    ticker := time.NewTicker(ld.interval)

    go func() {
        for range ticker.C {
            var m runtime.MemStats
            runtime.ReadMemStats(&m)

            ld.samples = append(ld.samples, m.HeapAlloc)

            // Keep last 60 samples
            if len(ld.samples) > 60 {
                ld.samples = ld.samples[1:]
            }

            // Check for sustained growth
            if len(ld.samples) >= 10 {
                ld.checkForLeak()
            }
        }
    }()
}

func (ld *LeakDetector) checkForLeak() {
    first := ld.samples[0]
    last := ld.samples[len(ld.samples)-1]

    if first == 0 {
        return
    }

    growth := float64(last-first) / float64(first) * 100

    if growth > ld.threshold {
        fmt.Printf("ALERT: Memory grew %.2f%% (from %d to %d bytes)\n",
            growth, first, last)
    }
}
```

---

## Java Memory Profiling

### Using VisualVM

VisualVM is a free profiling tool bundled with the JDK:

```java
// MemoryLeakExample.java
import java.util.*;

public class MemoryLeakExample {
    // Static collection that grows indefinitely - classic leak pattern
    private static final List<byte[]> leakyList = new ArrayList<>();

    // Cache without eviction - another common leak
    private static final Map<String, Object> cache = new HashMap<>();

    public static void simulateLeak() {
        // Each call adds 1MB to the list
        leakyList.add(new byte[1024 * 1024]);

        // Cache entries never removed
        cache.put(UUID.randomUUID().toString(), new byte[1024]);
    }

    public static void main(String[] args) throws InterruptedException {
        System.out.println("Connect VisualVM to PID: " +
            ProcessHandle.current().pid());

        // Give time to connect profiler
        Thread.sleep(10000);

        // Simulate leak over time
        for (int i = 0; i < 1000; i++) {
            simulateLeak();
            Thread.sleep(100);

            if (i % 100 == 0) {
                System.out.println("Iteration " + i +
                    ", Heap used: " +
                    Runtime.getRuntime().totalMemory() / 1024 / 1024 + " MB");
            }
        }
    }
}
```

### JVM Memory Flags for Profiling

```bash
# Enable GC logging for analysis
java -Xlog:gc*:file=gc.log:time,uptime,level,tags \
     -XX:+HeapDumpOnOutOfMemoryError \
     -XX:HeapDumpPath=/tmp/heapdump.hprof \
     -jar myapp.jar

# Enable JMX for remote monitoring
java -Dcom.sun.management.jmxremote \
     -Dcom.sun.management.jmxremote.port=9010 \
     -Dcom.sun.management.jmxremote.local.only=false \
     -Dcom.sun.management.jmxremote.authenticate=false \
     -Dcom.sun.management.jmxremote.ssl=false \
     -jar myapp.jar
```

### Programmatic Memory Monitoring

```java
// MemoryMonitor.java
import java.lang.management.*;
import java.util.*;

public class MemoryMonitor {
    private final MemoryMXBean memoryBean;
    private final List<GarbageCollectorMXBean> gcBeans;

    public MemoryMonitor() {
        this.memoryBean = ManagementFactory.getMemoryMXBean();
        this.gcBeans = ManagementFactory.getGarbageCollectorMXBeans();
    }

    public void printMemoryStats() {
        MemoryUsage heapUsage = memoryBean.getHeapMemoryUsage();
        MemoryUsage nonHeapUsage = memoryBean.getNonHeapMemoryUsage();

        System.out.println("=== Heap Memory ===");
        System.out.printf("  Used: %d MB%n", heapUsage.getUsed() / 1024 / 1024);
        System.out.printf("  Committed: %d MB%n", heapUsage.getCommitted() / 1024 / 1024);
        System.out.printf("  Max: %d MB%n", heapUsage.getMax() / 1024 / 1024);

        System.out.println("=== Non-Heap Memory ===");
        System.out.printf("  Used: %d MB%n", nonHeapUsage.getUsed() / 1024 / 1024);

        System.out.println("=== GC Stats ===");
        for (GarbageCollectorMXBean gc : gcBeans) {
            System.out.printf("  %s: count=%d, time=%dms%n",
                gc.getName(), gc.getCollectionCount(), gc.getCollectionTime());
        }
    }

    public void setupMemoryThresholdAlert(double thresholdPercent) {
        MemoryPoolMXBean tenuredPool = null;

        // Find the tenured/old generation pool
        for (MemoryPoolMXBean pool : ManagementFactory.getMemoryPoolMXBeans()) {
            if (pool.getType() == MemoryType.HEAP &&
                pool.isUsageThresholdSupported()) {
                tenuredPool = pool;
                break;
            }
        }

        if (tenuredPool != null) {
            long maxMemory = tenuredPool.getUsage().getMax();
            long threshold = (long) (maxMemory * thresholdPercent);
            tenuredPool.setUsageThreshold(threshold);

            // Register notification listener
            NotificationEmitter emitter = (NotificationEmitter) memoryBean;
            emitter.addNotificationListener(
                (notification, handback) -> {
                    System.out.println("ALERT: Memory threshold exceeded!");
                    printMemoryStats();
                },
                null, null
            );
        }
    }

    public static void main(String[] args) throws InterruptedException {
        MemoryMonitor monitor = new MemoryMonitor();
        monitor.setupMemoryThresholdAlert(0.8); // Alert at 80% usage

        // Print stats periodically
        while (true) {
            monitor.printMemoryStats();
            Thread.sleep(5000);
        }
    }
}
```

---

## Interpreting Heap Snapshots

### What to Look For

1. **Retained Size vs Shallow Size**
   - Shallow size: Memory used by the object itself
   - Retained size: Memory that would be freed if object is garbage collected

2. **Dominator Tree**
   - Shows which objects keep other objects alive
   - Root dominators are potential leak sources

3. **Object Count Growth**
   - Compare snapshots to find objects that keep growing
   - Focus on application objects, not framework internals

### Common Leak Patterns

```python
# Python leak patterns

# 1. Global collections that grow
_cache = {}  # Never cleaned
def process(key, value):
    _cache[key] = value  # Leak!

# 2. Circular references with __del__
class Node:
    def __init__(self):
        self.parent = None
        self.children = []

    def __del__(self):
        print("Deleted")  # Prevents GC of cycles

# 3. Closures capturing large objects
def create_handler(large_data):
    def handler():
        # Captures entire large_data even if only using small part
        return large_data[0]
    return handler

# 4. Event listeners not removed
class Publisher:
    listeners = []  # Class variable - shared across instances

    def subscribe(self, callback):
        self.listeners.append(callback)
    # Missing unsubscribe - listeners never removed
```

```javascript
// JavaScript leak patterns

// 1. Closures holding references
function setupHandler() {
    const largeData = new Array(1000000).fill('x');

    // This closure keeps largeData alive
    element.addEventListener('click', () => {
        console.log(largeData.length);
    });
}

// 2. Detached DOM nodes
let detachedNodes = [];
function removeElement(el) {
    el.parentNode.removeChild(el);
    detachedNodes.push(el);  // Still referenced!
}

// 3. Forgotten timers
function startPolling() {
    setInterval(() => {
        // This runs forever even if component unmounts
        fetchData();
    }, 1000);
}

// 4. Console.log in production
// Objects logged to console are retained
console.log(hugeObject);  // Leak in some browsers
```

---

## Continuous Memory Monitoring

### Python Memory Metrics with Prometheus

```python
# memory_metrics.py
from prometheus_client import Gauge, start_http_server
import tracemalloc
import psutil
import threading
import time

# Define metrics
memory_rss = Gauge('process_memory_rss_bytes', 'RSS memory in bytes')
memory_vms = Gauge('process_memory_vms_bytes', 'VMS memory in bytes')
memory_heap = Gauge('python_heap_bytes', 'Python heap memory in bytes')
gc_collections = Gauge('python_gc_collections_total', 'GC collections', ['generation'])

class MemoryMetricsCollector:
    def __init__(self, interval=10):
        self.interval = interval
        self._running = False

    def start(self):
        tracemalloc.start()
        self._running = True

        thread = threading.Thread(target=self._collect_loop, daemon=True)
        thread.start()

    def _collect_loop(self):
        import gc

        while self._running:
            # Process memory
            process = psutil.Process()
            mem_info = process.memory_info()
            memory_rss.set(mem_info.rss)
            memory_vms.set(mem_info.vms)

            # Python heap
            current, peak = tracemalloc.get_traced_memory()
            memory_heap.set(current)

            # GC stats
            for i, count in enumerate(gc.get_count()):
                gc_collections.labels(generation=str(i)).set(count)

            time.sleep(self.interval)

    def stop(self):
        self._running = False
        tracemalloc.stop()

# Usage
if __name__ == "__main__":
    # Start Prometheus metrics server
    start_http_server(8000)

    # Start memory collection
    collector = MemoryMetricsCollector(interval=5)
    collector.start()

    # Your application code here
    run_application()
```

### Node.js Memory Metrics

```javascript
// memory_metrics.js
const promClient = require('prom-client');
const v8 = require('v8');

// Create metrics
const heapUsedGauge = new promClient.Gauge({
    name: 'nodejs_heap_used_bytes',
    help: 'V8 heap used in bytes'
});

const heapTotalGauge = new promClient.Gauge({
    name: 'nodejs_heap_total_bytes',
    help: 'V8 heap total in bytes'
});

const externalMemoryGauge = new promClient.Gauge({
    name: 'nodejs_external_memory_bytes',
    help: 'External memory in bytes'
});

const gcDurationHistogram = new promClient.Histogram({
    name: 'nodejs_gc_duration_seconds',
    help: 'GC duration in seconds',
    labelNames: ['gc_type'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1]
});

// Collect metrics
function collectMemoryMetrics() {
    const mem = process.memoryUsage();

    heapUsedGauge.set(mem.heapUsed);
    heapTotalGauge.set(mem.heapTotal);
    externalMemoryGauge.set(mem.external);
}

// Track GC events (requires --expose-gc)
let lastGC = Date.now();
const gcObserver = new PerformanceObserver((list) => {
    const entries = list.getEntries();

    for (const entry of entries) {
        gcDurationHistogram.observe(
            { gc_type: entry.detail.kind },
            entry.duration / 1000
        );
    }
});

// Start collection
gcObserver.observe({ entryTypes: ['gc'] });
setInterval(collectMemoryMetrics, 5000);

module.exports = { promClient };
```

---

## Best Practices for Memory-Efficient Code

### 1. Use Appropriate Data Structures

```python
# Python examples

# Bad: List for membership testing
items = [1, 2, 3, 4, 5]
if x in items:  # O(n) scan
    pass

# Good: Set for membership testing
items = {1, 2, 3, 4, 5}
if x in items:  # O(1) lookup
    pass

# Bad: Storing redundant data
users = [
    {"name": "Alice", "country": "United States of America"},
    {"name": "Bob", "country": "United States of America"},
]

# Good: Normalize repeated values
countries = {"US": "United States of America"}
users = [
    {"name": "Alice", "country_code": "US"},
    {"name": "Bob", "country_code": "US"},
]
```

### 2. Use Generators for Large Datasets

```python
# Bad: Load everything into memory
def process_file(filename):
    with open(filename) as f:
        lines = f.readlines()  # Entire file in memory
    return [process(line) for line in lines]

# Good: Process line by line
def process_file(filename):
    with open(filename) as f:
        for line in f:  # One line at a time
            yield process(line)
```

### 3. Clean Up Resources

```python
# Bad: Resources left open
def query_database():
    conn = database.connect()
    result = conn.execute("SELECT * FROM users")
    return result
    # Connection never closed!

# Good: Context managers ensure cleanup
def query_database():
    with database.connect() as conn:
        result = conn.execute("SELECT * FROM users")
        return list(result)
    # Connection automatically closed
```

### 4. Implement Object Pooling

```python
# Object pool for expensive objects
class ConnectionPool:
    def __init__(self, factory, max_size=10):
        self.factory = factory
        self.max_size = max_size
        self.pool = []
        self.in_use = set()

    def acquire(self):
        if self.pool:
            conn = self.pool.pop()
        elif len(self.in_use) < self.max_size:
            conn = self.factory()
        else:
            raise RuntimeError("Pool exhausted")

        self.in_use.add(id(conn))
        return conn

    def release(self, conn):
        self.in_use.discard(id(conn))
        self.pool.append(conn)
```

### 5. Use Weak References

```python
import weakref

# Bad: Strong reference prevents garbage collection
class Cache:
    def __init__(self):
        self.data = {}

    def set(self, key, value):
        self.data[key] = value  # Keeps value alive forever

# Good: Weak reference allows garbage collection
class WeakCache:
    def __init__(self):
        self.data = weakref.WeakValueDictionary()

    def set(self, key, value):
        self.data[key] = value  # Value can be GC'd if no other refs
```

---

## Summary

| Language | Tool | Use Case |
|----------|------|----------|
| Python | tracemalloc | Built-in allocation tracking |
| Python | memory_profiler | Line-by-line memory analysis |
| Node.js | Chrome DevTools | Heap snapshot analysis |
| Node.js | heapdump | Production heap dumps |
| Go | pprof | CPU and memory profiling |
| Java | VisualVM | GUI-based profiling |
| Java | JMX | Remote monitoring |

Key practices:
1. **Profile regularly** - Do not wait for production issues
2. **Compare snapshots** - Single snapshots miss trends
3. **Monitor continuously** - Use metrics to catch regressions
4. **Test with realistic data** - Small test data hides memory issues
5. **Clean up resources** - Use context managers and finalizers
6. **Use appropriate data structures** - Right structure reduces memory

---

*Need to monitor memory usage across your entire infrastructure? [OneUptime](https://oneuptime.com) provides comprehensive observability with metrics, traces, and logs to help you identify and resolve memory issues before they impact users.*

