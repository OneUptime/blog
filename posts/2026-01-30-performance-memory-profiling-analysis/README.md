# How to Create Memory Profiling Analysis

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Performance, Memory, Profiling, Debugging

Description: Analyze memory profiles to detect leaks, optimize allocations, and reduce memory footprint in applications using heap dumps and allocation tracking.

---

Memory issues are among the hardest problems to debug in production systems. Your application runs smoothly for hours or days, then memory usage spikes, garbage collection pauses become unbearable, and eventually the process crashes with an out-of-memory error. Memory profiling gives you the visibility needed to understand what your application is doing with memory, where allocations happen, and why objects are not being released.

This guide covers the fundamentals of memory profiling, from understanding memory regions to taking heap dumps, analyzing object retention, and implementing optimization strategies.

---

## Understanding Memory: Heap vs Stack

Before diving into profiling, you need to understand how applications use memory. Memory is divided into two main regions with fundamentally different characteristics.

### Stack Memory

Stack memory is fast, automatic, and limited in size. It stores:

- Function call frames
- Local primitive variables
- References to heap objects
- Return addresses

Stack allocation and deallocation happen automatically when functions are called and return. The stack follows a Last-In-First-Out (LIFO) pattern.

### Heap Memory

Heap memory is where dynamic allocations live. Objects, arrays, closures, and any data with a lifetime beyond a single function call reside here. The heap is:

- Managed by the garbage collector (in managed languages)
- Larger but slower than the stack
- Subject to fragmentation
- The source of most memory issues

| Characteristic | Stack | Heap |
|---------------|-------|------|
| Allocation speed | Very fast (pointer bump) | Slower (GC managed) |
| Size | Limited (typically 1-8 MB) | Large (GBs available) |
| Lifetime | Tied to function scope | Until no longer referenced |
| Access pattern | LIFO only | Random access |
| Memory errors | Stack overflow | Memory leaks, fragmentation |
| Cleanup | Automatic on function return | Garbage collection |

The following diagram shows how stack and heap interact during program execution.

```
+------------------+     +----------------------------------+
|     STACK        |     |              HEAP                |
+------------------+     +----------------------------------+
| main()           |     |                                  |
|   x = 42         |     |  +--------+    +-------------+   |
|   obj ----+------|---->|  | Object |    | LargeArray  |   |
| function1()      |     |  | id: 1  |    | [0...9999]  |   |
|   y = 100        |     |  | data --|--->+-------------+   |
|   arr ----+------|---->|  +--------+                      |
+------------------+     +----------------------------------+
```

---

## Memory Profiling Concepts

Memory profiling involves capturing snapshots of memory state and tracking allocations over time. There are several key concepts to understand.

### Profile Types for Memory Analysis

| Profile Type | What It Captures | Best For |
|-------------|------------------|----------|
| Heap Snapshot | All live objects at a point in time | Finding retained objects, leak detection |
| Allocation Profile | Where allocations happen over time | Finding allocation hotspots, churn |
| Allocation Timeline | Allocations with timestamps | Correlating memory growth with events |
| Retained Size | Size including referenced objects | Understanding true memory cost |
| Shallow Size | Size of object itself | Basic object accounting |

### Key Metrics to Track

Understanding these metrics helps you interpret profiling results.

**Shallow Size** is the memory consumed by the object itself, not including objects it references. For example, an object with three properties pointing to large arrays has a small shallow size.

**Retained Size** is the memory that would be freed if this object were garbage collected, including all objects that are only reachable through it. This is the true memory cost of keeping an object alive.

**Dominator** is an object that, if removed, would cause other objects to become unreachable. Understanding dominators helps identify which objects are keeping large object graphs alive.

---

## Taking Heap Dumps

Heap dumps (or heap snapshots) capture the entire memory state of your application. They are essential for understanding what objects exist and why they are being retained.

### Node.js Heap Dumps

Node.js provides built-in support for heap snapshots through the V8 inspector protocol.

The following code shows how to programmatically capture heap dumps in a Node.js application.

```javascript
// heapDump.js - Utility for capturing heap snapshots
const v8 = require('v8');
const fs = require('fs');
const path = require('path');

// Simple heap dump using v8 module
function takeHeapSnapshot(outputDir = './heap-dumps') {
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = path.join(outputDir, `heap-${timestamp}.heapsnapshot`);

  // Write the heap snapshot to file
  const snapshotStream = v8.writeHeapSnapshot(filename);

  console.log(`Heap snapshot written to: ${snapshotStream}`);
  return snapshotStream;
}

// Take heap dump with garbage collection first (requires --expose-gc flag)
function takeCleanHeapSnapshot(outputDir = './heap-dumps') {
  // Force garbage collection to get accurate picture
  if (global.gc) {
    global.gc();
    // Run twice to handle weak references and weak callbacks
    global.gc();
  }

  return takeHeapSnapshot(outputDir);
}

module.exports = { takeHeapSnapshot, takeCleanHeapSnapshot };
```

### Using the V8 Inspector for Detailed Snapshots

For more control over the snapshot process, use the inspector module directly.

```javascript
// inspectorHeapDump.js - Detailed heap dump with inspector API
const inspector = require('inspector');
const fs = require('fs');
const path = require('path');

async function takeDetailedHeapSnapshot(outputPath) {
  const session = new inspector.Session();
  session.connect();

  const chunks = [];

  // Collect snapshot chunks as they are generated
  session.on('HeapProfiler.addHeapSnapshotChunk', (message) => {
    chunks.push(message.params.chunk);
  });

  // Take the snapshot
  await new Promise((resolve, reject) => {
    session.post('HeapProfiler.takeHeapSnapshot', null, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  // Write complete snapshot to file
  const snapshotData = chunks.join('');
  fs.writeFileSync(outputPath, snapshotData);

  session.disconnect();

  return {
    path: outputPath,
    size: snapshotData.length,
    objectCount: (snapshotData.match(/"id":/g) || []).length
  };
}

// Export snapshot endpoint for HTTP server
function addHeapSnapshotEndpoint(app) {
  app.get('/debug/heap-snapshot', async (req, res) => {
    try {
      const timestamp = Date.now();
      const filename = `heap-${timestamp}.heapsnapshot`;
      const filepath = path.join('/tmp', filename);

      await takeDetailedHeapSnapshot(filepath);

      res.download(filepath, filename, (err) => {
        // Clean up temp file after download
        fs.unlinkSync(filepath);
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
}

module.exports = { takeDetailedHeapSnapshot, addHeapSnapshotEndpoint };
```

### Java Heap Dumps

Java applications use different tools for heap dumps. Here are the common approaches.

```bash
# Using jmap to dump heap of running process
jmap -dump:format=b,file=heap.hprof <pid>

# Using jcmd (preferred in newer Java versions)
jcmd <pid> GC.heap_dump /path/to/heap.hprof

# Automatic heap dump on OutOfMemoryError (add to JVM options)
# -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/path/to/dumps/

# Trigger heap dump via JMX
# Using jconsole or programmatically via MBean
```

The following Java code shows how to trigger heap dumps programmatically.

```java
// HeapDumper.java - Programmatic heap dump utility
import com.sun.management.HotSpotDiagnosticMXBean;
import java.lang.management.ManagementFactory;
import java.io.IOException;
import java.time.Instant;

public class HeapDumper {

    private static final HotSpotDiagnosticMXBean diagnosticMXBean;

    static {
        diagnosticMXBean = ManagementFactory.getPlatformMXBean(
            HotSpotDiagnosticMXBean.class
        );
    }

    /**
     * Take a heap dump and save to specified file.
     * @param filePath Path for the heap dump file
     * @param live If true, dump only live objects (triggers GC first)
     */
    public static void dumpHeap(String filePath, boolean live) throws IOException {
        diagnosticMXBean.dumpHeap(filePath, live);
    }

    /**
     * Take a heap dump with automatic filename based on timestamp.
     */
    public static String dumpHeap(String directory, boolean live) throws IOException {
        String timestamp = Instant.now().toString().replace(":", "-");
        String filePath = directory + "/heap-" + timestamp + ".hprof";
        dumpHeap(filePath, live);
        return filePath;
    }

    // Example usage with REST endpoint
    public static void main(String[] args) throws Exception {
        // Simulate memory allocation
        Object[] objects = new Object[10000];
        for (int i = 0; i < objects.length; i++) {
            objects[i] = new byte[1024];
        }

        // Take heap dump
        String dumpPath = dumpHeap("/tmp", true);
        System.out.println("Heap dump saved to: " + dumpPath);
    }
}
```

### Python Memory Profiling

Python has several tools for memory analysis. Here is how to use them.

```python
# memory_profiler_example.py - Memory profiling in Python
import tracemalloc
import gc
from functools import wraps

def start_memory_tracking():
    """Start tracking memory allocations."""
    tracemalloc.start(25)  # Store up to 25 frames

def get_memory_snapshot():
    """Get current memory snapshot."""
    snapshot = tracemalloc.take_snapshot()
    return snapshot

def compare_snapshots(snapshot1, snapshot2, top_n=10):
    """Compare two snapshots and show top differences."""
    top_stats = snapshot2.compare_to(snapshot1, 'lineno')

    print(f"Top {top_n} memory changes:")
    for stat in top_stats[:top_n]:
        print(stat)

    return top_stats

def get_top_allocations(snapshot, top_n=10):
    """Get top memory allocations from snapshot."""
    top_stats = snapshot.statistics('lineno')

    print(f"Top {top_n} allocations:")
    for stat in top_stats[:top_n]:
        print(stat)

    return top_stats

# Decorator to profile memory usage of a function
def profile_memory(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        gc.collect()
        tracemalloc.start()

        result = func(*args, **kwargs)

        snapshot = tracemalloc.take_snapshot()
        top_stats = snapshot.statistics('lineno')

        print(f"\nMemory profile for {func.__name__}:")
        print("Top 5 allocations:")
        for stat in top_stats[:5]:
            print(f"  {stat}")

        current, peak = tracemalloc.get_traced_memory()
        print(f"Current memory: {current / 1024:.2f} KB")
        print(f"Peak memory: {peak / 1024:.2f} KB")

        tracemalloc.stop()
        return result

    return wrapper

# Example usage
@profile_memory
def allocate_data():
    """Function that allocates significant memory."""
    data = []
    for i in range(10000):
        data.append({'id': i, 'value': 'x' * 100})
    return data

if __name__ == '__main__':
    result = allocate_data()
```

---

## Analyzing Object Retention

Once you have a heap dump, you need to analyze it to find memory issues. The key is understanding why objects are being retained.

### Retention Paths

A retention path shows the chain of references keeping an object alive. Understanding these paths is crucial for fixing memory leaks.

```
GC Root (Global variable 'cache')
  └── Map
      └── Object (key: 'user-123')
          └── UserData
              └── LargeBuffer (1 MB)
```

In this example, the LargeBuffer cannot be garbage collected because it is referenced by UserData, which is stored in a Map held by a global cache variable.

### Common Retention Patterns

| Pattern | Description | Solution |
|---------|-------------|----------|
| Global cache without bounds | Objects added to global Map/Object, never removed | Use LRU cache with size limits |
| Event listener accumulation | Listeners added but never removed | Remove listeners on cleanup |
| Closure capturing scope | Functions capture variables they do not need | Restructure closures, null references |
| Detached DOM nodes | DOM nodes removed but still referenced | Clear references when removing elements |
| Circular references | Objects reference each other | Usually handled by GC, but can cause issues with weak references |

### Analyzing Heap Dumps in Chrome DevTools

Chrome DevTools can analyze V8 heap snapshots. Here is a workflow for analysis.

```javascript
// First, generate a heap snapshot from your Node.js application
// Then open it in Chrome DevTools: Memory tab -> Load

// Key views in DevTools:
// 1. Summary view - Objects grouped by constructor name
// 2. Comparison view - Differences between two snapshots
// 3. Containment view - Object hierarchy from GC roots
// 4. Statistics view - Memory breakdown by type

// What to look for:
// - Objects with high retained size
// - Growing object counts between snapshots
// - Unexpected objects still in memory
// - Long retention paths from GC roots

// Example: Finding detached DOM trees
// In Summary view, search for "Detached"
// Detached DOM trees show as "Detached HTMLElement"
// These are DOM nodes removed from document but still referenced
```

### Programmatic Heap Analysis

For automated analysis, you can parse heap snapshots programmatically.

```javascript
// heapAnalyzer.js - Basic heap snapshot analysis
const fs = require('fs');

function analyzeHeapSnapshot(snapshotPath) {
  console.log(`Analyzing: ${snapshotPath}`);

  const data = fs.readFileSync(snapshotPath, 'utf8');
  const snapshot = JSON.parse(data);

  // Extract node information
  const nodes = snapshot.nodes;
  const strings = snapshot.strings;
  const nodeFields = snapshot.snapshot.meta.node_fields;

  // Field indices
  const typeIndex = nodeFields.indexOf('type');
  const nameIndex = nodeFields.indexOf('name');
  const selfSizeIndex = nodeFields.indexOf('self_size');
  const retainedSizeIndex = nodeFields.indexOf('retained_size');

  const fieldCount = nodeFields.length;

  // Count objects by type
  const typeCounts = {};
  const typeSizes = {};

  for (let i = 0; i < nodes.length; i += fieldCount) {
    const nameStringIndex = nodes[i + nameIndex];
    const name = strings[nameStringIndex];
    const selfSize = nodes[i + selfSizeIndex];

    typeCounts[name] = (typeCounts[name] || 0) + 1;
    typeSizes[name] = (typeSizes[name] || 0) + selfSize;
  }

  // Sort by count
  const sortedByCount = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  console.log('\nTop 20 object types by count:');
  sortedByCount.forEach(([name, count]) => {
    const size = typeSizes[name];
    console.log(`  ${name}: ${count} objects, ${(size / 1024).toFixed(2)} KB`);
  });

  // Sort by size
  const sortedBySize = Object.entries(typeSizes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  console.log('\nTop 20 object types by size:');
  sortedBySize.forEach(([name, size]) => {
    const count = typeCounts[name];
    console.log(`  ${name}: ${(size / 1024 / 1024).toFixed(2)} MB (${count} objects)`);
  });

  return { typeCounts, typeSizes };
}

module.exports = { analyzeHeapSnapshot };
```

---

## Detecting Memory Leaks

Memory leaks occur when objects that should be released continue to be retained. Detection requires monitoring memory over time.

### Growth Pattern Analysis

The following code monitors heap growth to detect potential leaks.

```javascript
// memoryLeakDetector.js - Automated leak detection
class MemoryLeakDetector {
  constructor(options = {}) {
    this.samples = [];
    this.windowSize = options.windowSize || 30;
    this.sampleIntervalMs = options.sampleIntervalMs || 10000;
    this.growthThreshold = options.growthThreshold || 0.2; // 20% growth
    this.alertCallback = options.alertCallback || console.warn;

    this.intervalId = null;
  }

  start() {
    this.intervalId = setInterval(() => {
      this.collectSample();
      this.analyze();
    }, this.sampleIntervalMs);

    console.log('Memory leak detector started');
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  collectSample() {
    const usage = process.memoryUsage();

    this.samples.push({
      timestamp: Date.now(),
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
      rss: usage.rss
    });

    // Keep only recent samples
    if (this.samples.length > this.windowSize) {
      this.samples.shift();
    }
  }

  analyze() {
    if (this.samples.length < this.windowSize / 2) {
      return; // Not enough data
    }

    // Calculate linear regression to detect growth trend
    const regression = this.calculateRegression(
      this.samples.map(s => s.heapUsed)
    );

    const firstValue = this.samples[0].heapUsed;
    const lastValue = this.samples[this.samples.length - 1].heapUsed;
    const growthRate = (lastValue - firstValue) / firstValue;

    // Check if growth is significant and consistent
    if (growthRate > this.growthThreshold && regression.slope > 0) {
      const growthPerMinute = regression.slope * 60000 / this.sampleIntervalMs;

      this.alertCallback({
        type: 'memory_leak_suspected',
        growthRate: (growthRate * 100).toFixed(2) + '%',
        growthPerMinute: (growthPerMinute / 1024 / 1024).toFixed(2) + ' MB/min',
        currentHeap: (lastValue / 1024 / 1024).toFixed(2) + ' MB',
        correlation: regression.r.toFixed(3),
        samples: this.samples.length
      });
    }
  }

  calculateRegression(values) {
    const n = values.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0, sumYY = 0;

    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += values[i];
      sumXY += i * values[i];
      sumXX += i * i;
      sumYY += values[i] * values[i];
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Correlation coefficient
    const r = (n * sumXY - sumX * sumY) /
      Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));

    return { slope, intercept, r };
  }

  getReport() {
    if (this.samples.length === 0) {
      return { message: 'No samples collected' };
    }

    const first = this.samples[0];
    const last = this.samples[this.samples.length - 1];
    const duration = (last.timestamp - first.timestamp) / 1000 / 60;

    return {
      samples: this.samples.length,
      durationMinutes: duration.toFixed(2),
      startHeap: (first.heapUsed / 1024 / 1024).toFixed(2) + ' MB',
      currentHeap: (last.heapUsed / 1024 / 1024).toFixed(2) + ' MB',
      growth: ((last.heapUsed - first.heapUsed) / 1024 / 1024).toFixed(2) + ' MB',
      growthPercent: ((last.heapUsed / first.heapUsed - 1) * 100).toFixed(2) + '%'
    };
  }
}

module.exports = { MemoryLeakDetector };
```

### Comparison-Based Leak Detection

Comparing heap snapshots is the most reliable way to find leaks.

```javascript
// snapshotComparison.js - Compare heap snapshots
const fs = require('fs');

function compareSnapshots(snapshot1Path, snapshot2Path) {
  console.log('Comparing heap snapshots...');
  console.log(`  Before: ${snapshot1Path}`);
  console.log(`  After: ${snapshot2Path}`);

  const snap1 = JSON.parse(fs.readFileSync(snapshot1Path, 'utf8'));
  const snap2 = JSON.parse(fs.readFileSync(snapshot2Path, 'utf8'));

  const counts1 = countObjectsByType(snap1);
  const counts2 = countObjectsByType(snap2);

  // Find types with significant growth
  const growth = [];

  for (const [type, count2] of Object.entries(counts2)) {
    const count1 = counts1[type] || 0;
    const diff = count2 - count1;

    if (diff > 0) {
      growth.push({
        type,
        before: count1,
        after: count2,
        diff,
        growthPercent: count1 > 0 ? ((diff / count1) * 100).toFixed(1) : 'new'
      });
    }
  }

  // Sort by absolute growth
  growth.sort((a, b) => b.diff - a.diff);

  console.log('\nObject types with growth:');
  console.log('Type                           | Before | After  | Diff   | Growth%');
  console.log('-'.repeat(70));

  growth.slice(0, 20).forEach(item => {
    const type = item.type.padEnd(30).substring(0, 30);
    const before = String(item.before).padStart(6);
    const after = String(item.after).padStart(6);
    const diff = String('+' + item.diff).padStart(6);
    const pct = String(item.growthPercent + '%').padStart(7);
    console.log(`${type} | ${before} | ${after} | ${diff} | ${pct}`);
  });

  return growth;
}

function countObjectsByType(snapshot) {
  const nodes = snapshot.nodes;
  const strings = snapshot.strings;
  const nodeFields = snapshot.snapshot.meta.node_fields;
  const nameIndex = nodeFields.indexOf('name');
  const fieldCount = nodeFields.length;

  const counts = {};

  for (let i = 0; i < nodes.length; i += fieldCount) {
    const name = strings[nodes[i + nameIndex]];
    counts[name] = (counts[name] || 0) + 1;
  }

  return counts;
}

module.exports = { compareSnapshots };
```

---

## Allocation Profiling

While heap snapshots show what is in memory, allocation profiling shows where allocations happen. This helps identify code that creates excessive garbage collector pressure.

### Node.js Allocation Tracking

```javascript
// allocationProfiler.js - Track memory allocations
const inspector = require('inspector');
const fs = require('fs');

class AllocationProfiler {
  constructor() {
    this.session = new inspector.Session();
    this.session.connect();
  }

  async startSampling(sampleInterval = 512) {
    // Start allocation sampling
    await new Promise((resolve, reject) => {
      this.session.post('HeapProfiler.startSampling', {
        samplingInterval: sampleInterval
      }, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    console.log(`Allocation sampling started (interval: ${sampleInterval} bytes)`);
  }

  async stopSampling() {
    const profile = await new Promise((resolve, reject) => {
      this.session.post('HeapProfiler.stopSampling', (err, result) => {
        if (err) reject(err);
        else resolve(result.profile);
      });
    });

    return profile;
  }

  async saveProfile(profile, outputPath) {
    fs.writeFileSync(outputPath, JSON.stringify(profile, null, 2));
    console.log(`Allocation profile saved to: ${outputPath}`);
  }

  analyzeProfile(profile) {
    const allocations = [];

    function traverse(node, stack = []) {
      const frame = {
        functionName: node.callFrame.functionName || '(anonymous)',
        scriptName: node.callFrame.url || '(unknown)',
        lineNumber: node.callFrame.lineNumber,
        columnNumber: node.callFrame.columnNumber
      };

      const currentStack = [...stack, frame];

      if (node.selfSize > 0) {
        allocations.push({
          size: node.selfSize,
          stack: currentStack
        });
      }

      for (const child of (node.children || [])) {
        traverse(child, currentStack);
      }
    }

    traverse(profile.head);

    // Group by allocation site
    const bySite = {};

    allocations.forEach(alloc => {
      const site = alloc.stack.map(f =>
        `${f.functionName}@${f.scriptName}:${f.lineNumber}`
      ).join(' <- ');

      if (!bySite[site]) {
        bySite[site] = { count: 0, totalSize: 0 };
      }
      bySite[site].count++;
      bySite[site].totalSize += alloc.size;
    });

    // Sort by total size
    const sorted = Object.entries(bySite)
      .sort((a, b) => b[1].totalSize - a[1].totalSize)
      .slice(0, 20);

    console.log('\nTop allocation sites by total size:');
    sorted.forEach(([site, stats], i) => {
      console.log(`\n${i + 1}. ${(stats.totalSize / 1024).toFixed(2)} KB (${stats.count} allocations)`);
      console.log(`   ${site.substring(0, 100)}`);
    });

    return sorted;
  }

  disconnect() {
    this.session.disconnect();
  }
}

module.exports = { AllocationProfiler };
```

### Tracking Specific Allocation Patterns

```javascript
// allocationTracker.js - Track allocations for specific patterns
class AllocationTracker {
  constructor() {
    this.allocations = new Map();
    this.enabled = false;
  }

  track(type, size, metadata = {}) {
    if (!this.enabled) return;

    const stack = new Error().stack.split('\n').slice(2, 7).join('\n');
    const key = `${type}:${stack}`;

    if (!this.allocations.has(key)) {
      this.allocations.set(key, {
        type,
        count: 0,
        totalSize: 0,
        stack,
        metadata: []
      });
    }

    const entry = this.allocations.get(key);
    entry.count++;
    entry.totalSize += size;
    entry.metadata.push(metadata);

    // Keep only recent metadata to prevent memory growth
    if (entry.metadata.length > 100) {
      entry.metadata = entry.metadata.slice(-100);
    }
  }

  enable() {
    this.enabled = true;
    console.log('Allocation tracking enabled');
  }

  disable() {
    this.enabled = false;
    console.log('Allocation tracking disabled');
  }

  reset() {
    this.allocations.clear();
  }

  getReport() {
    const entries = Array.from(this.allocations.values())
      .sort((a, b) => b.totalSize - a.totalSize);

    return {
      totalTypes: entries.length,
      totalAllocations: entries.reduce((sum, e) => sum + e.count, 0),
      totalSize: entries.reduce((sum, e) => sum + e.totalSize, 0),
      topAllocations: entries.slice(0, 20).map(e => ({
        type: e.type,
        count: e.count,
        totalSizeKB: (e.totalSize / 1024).toFixed(2),
        avgSizeBytes: Math.round(e.totalSize / e.count),
        stack: e.stack
      }))
    };
  }
}

// Example usage with custom object tracking
const tracker = new AllocationTracker();

function createUser(data) {
  const user = {
    id: data.id,
    name: data.name,
    email: data.email,
    preferences: { ...data.preferences },
    history: []
  };

  // Track this allocation
  tracker.track('User', JSON.stringify(user).length, { id: data.id });

  return user;
}

module.exports = { AllocationTracker, tracker };
```

---

## Memory Optimization Strategies

Once you have identified memory issues through profiling, apply these optimization strategies.

### 1. Bounded Caches

Unbounded caches are the most common cause of memory leaks. Always use bounded caches with eviction policies.

```javascript
// boundedCache.js - LRU cache with size limits
class LRUCache {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 1000;
    this.maxAge = options.maxAge || 3600000; // 1 hour default
    this.cache = new Map();
  }

  get(key) {
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    // Check if expired
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return undefined;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  set(key, value, ttl = this.maxAge) {
    // Remove if exists (to update position)
    this.cache.delete(key);

    // Evict oldest entries if at capacity
    while (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      value,
      expires: Date.now() + ttl,
      size: this.estimateSize(value)
    });
  }

  delete(key) {
    return this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  estimateSize(value) {
    // Rough size estimation
    if (typeof value === 'string') return value.length * 2;
    if (typeof value === 'number') return 8;
    if (Buffer.isBuffer(value)) return value.length;
    return JSON.stringify(value).length * 2;
  }

  getStats() {
    let totalSize = 0;
    let expiredCount = 0;
    const now = Date.now();

    for (const entry of this.cache.values()) {
      totalSize += entry.size;
      if (now > entry.expires) expiredCount++;
    }

    return {
      entries: this.cache.size,
      maxSize: this.maxSize,
      estimatedBytes: totalSize,
      expiredEntries: expiredCount
    };
  }
}

module.exports = { LRUCache };
```

### 2. Object Pooling

For frequently allocated objects, pooling reduces garbage collection pressure.

```javascript
// objectPool.js - Reusable object pool
class ObjectPool {
  constructor(factory, reset, initialSize = 10) {
    this.factory = factory;
    this.reset = reset;
    this.pool = [];
    this.inUse = new Set();

    // Pre-allocate objects
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.factory());
    }
  }

  acquire() {
    let obj = this.pool.pop();

    if (!obj) {
      obj = this.factory();
    }

    this.inUse.add(obj);
    return obj;
  }

  release(obj) {
    if (!this.inUse.has(obj)) {
      console.warn('Attempted to release object not from this pool');
      return;
    }

    this.inUse.delete(obj);
    this.reset(obj);
    this.pool.push(obj);
  }

  getStats() {
    return {
      available: this.pool.length,
      inUse: this.inUse.size,
      total: this.pool.length + this.inUse.size
    };
  }
}

// Example: Buffer pool for network I/O
const bufferPool = new ObjectPool(
  () => Buffer.alloc(4096),
  (buf) => buf.fill(0),
  20
);

// Example: Connection object pool
const connectionPool = new ObjectPool(
  () => ({
    socket: null,
    lastUsed: 0,
    metadata: {}
  }),
  (conn) => {
    conn.socket = null;
    conn.lastUsed = 0;
    conn.metadata = {};
  },
  50
);

module.exports = { ObjectPool, bufferPool, connectionPool };
```

### 3. Streaming Large Data

Never load large datasets entirely into memory. Use streams instead.

```javascript
// streamProcessing.js - Memory-efficient data processing
const { Transform, pipeline } = require('stream');
const fs = require('fs');
const readline = require('readline');

// Process large JSON files as stream
function processLargeJsonStream(inputPath, processor) {
  return new Promise((resolve, reject) => {
    const results = [];
    let lineCount = 0;

    const rl = readline.createInterface({
      input: fs.createReadStream(inputPath),
      crlfDelay: Infinity
    });

    rl.on('line', (line) => {
      lineCount++;
      try {
        const obj = JSON.parse(line);
        const result = processor(obj);
        if (result !== undefined) {
          results.push(result);
        }
      } catch (e) {
        console.warn(`Error parsing line ${lineCount}: ${e.message}`);
      }
    });

    rl.on('close', () => {
      resolve({ results, lineCount });
    });

    rl.on('error', reject);
  });
}

// Transform stream for processing
class ChunkProcessor extends Transform {
  constructor(processFunc, options = {}) {
    super({ ...options, objectMode: true });
    this.processFunc = processFunc;
    this.batchSize = options.batchSize || 100;
    this.batch = [];
  }

  _transform(chunk, encoding, callback) {
    this.batch.push(chunk);

    if (this.batch.length >= this.batchSize) {
      this.processBatch();
    }

    callback();
  }

  _flush(callback) {
    if (this.batch.length > 0) {
      this.processBatch();
    }
    callback();
  }

  processBatch() {
    const results = this.processFunc(this.batch);
    for (const result of results) {
      this.push(result);
    }
    this.batch = [];
  }
}

// Example: Memory-efficient CSV processing
async function processLargeCsv(inputPath, outputPath, transform) {
  const csvParser = require('csv-parser');
  const { stringify } = require('csv-stringify');

  await pipeline(
    fs.createReadStream(inputPath),
    csvParser(),
    new ChunkProcessor(transform, { batchSize: 1000 }),
    stringify({ header: true }),
    fs.createWriteStream(outputPath)
  );
}

module.exports = { processLargeJsonStream, ChunkProcessor, processLargeCsv };
```

### 4. Weak References for Caches

Use WeakMap and WeakRef for caches where cached data can be garbage collected.

```javascript
// weakCache.js - Cache that allows garbage collection
class WeakValueCache {
  constructor() {
    this.cache = new Map();
    this.registry = new FinalizationRegistry((key) => {
      // Clean up key when value is garbage collected
      const ref = this.cache.get(key);
      if (ref && ref.deref() === undefined) {
        this.cache.delete(key);
      }
    });
  }

  set(key, value) {
    const ref = new WeakRef(value);
    this.cache.set(key, ref);
    this.registry.register(value, key);
  }

  get(key) {
    const ref = this.cache.get(key);
    if (!ref) return undefined;

    const value = ref.deref();
    if (value === undefined) {
      this.cache.delete(key);
      return undefined;
    }

    return value;
  }

  has(key) {
    return this.get(key) !== undefined;
  }

  delete(key) {
    return this.cache.delete(key);
  }

  // Get count of valid entries
  size() {
    let count = 0;
    for (const ref of this.cache.values()) {
      if (ref.deref() !== undefined) count++;
    }
    return count;
  }
}

module.exports = { WeakValueCache };
```

### 5. Memory-Efficient Data Structures

Choose data structures appropriate for your memory constraints.

```javascript
// efficientDataStructures.js - Memory-optimized structures

// Use TypedArrays for numeric data
class NumericTimeSeries {
  constructor(maxPoints) {
    this.maxPoints = maxPoints;
    this.timestamps = new Float64Array(maxPoints);
    this.values = new Float64Array(maxPoints);
    this.head = 0;
    this.count = 0;
  }

  add(timestamp, value) {
    this.timestamps[this.head] = timestamp;
    this.values[this.head] = value;

    this.head = (this.head + 1) % this.maxPoints;
    this.count = Math.min(this.count + 1, this.maxPoints);
  }

  getRange(startTime, endTime) {
    const results = [];
    const startIndex = this.count === this.maxPoints
      ? this.head
      : 0;

    for (let i = 0; i < this.count; i++) {
      const idx = (startIndex + i) % this.maxPoints;
      const ts = this.timestamps[idx];

      if (ts >= startTime && ts <= endTime) {
        results.push({ timestamp: ts, value: this.values[idx] });
      }
    }

    return results;
  }

  // Memory usage: 16 bytes per point (8 + 8) vs ~100+ bytes for objects
}

// String interning for repeated strings
class StringInterner {
  constructor() {
    this.strings = new Map();
  }

  intern(str) {
    if (this.strings.has(str)) {
      return this.strings.get(str);
    }

    this.strings.set(str, str);
    return str;
  }

  // Get memory savings
  getStats() {
    return {
      uniqueStrings: this.strings.size
    };
  }
}

module.exports = { NumericTimeSeries, StringInterner };
```

---

## Memory Profiling Workflow Summary

Here is a practical workflow for memory profiling analysis.

| Step | Action | Tools |
|------|--------|-------|
| 1. Baseline | Take heap snapshot during normal operation | v8.writeHeapSnapshot, jmap |
| 2. Monitor | Track memory metrics over time | process.memoryUsage, Prometheus |
| 3. Detect | Identify abnormal growth patterns | Custom monitoring, alerts |
| 4. Capture | Take snapshots before and after suspected leak | Inspector API, jcmd |
| 5. Compare | Diff snapshots to find growing object types | DevTools, programmatic analysis |
| 6. Trace | Find retention paths for leaked objects | DevTools containment view |
| 7. Fix | Apply appropriate optimization strategy | Code changes |
| 8. Verify | Confirm fix with new profiling session | Repeat steps 1-4 |

---

## Common Pitfalls

Avoid these mistakes when doing memory profiling.

| Pitfall | Problem | Solution |
|---------|---------|----------|
| Profiling in development only | Production has different load patterns | Profile in staging with realistic load |
| Taking too few snapshots | Miss the growth pattern | Take multiple snapshots over time |
| Ignoring small leaks | Small leaks compound over time | Investigate any consistent growth |
| Fixing symptoms not causes | Increasing heap size delays the crash | Find and fix the root cause |
| Not triggering GC before snapshots | Stale objects pollute results | Force GC before taking snapshots |
| Over-optimizing | Premature optimization wastes time | Profile first, then optimize hot spots |

---

## Putting It All Together

Here is a complete example that combines the techniques discussed.

```javascript
// memoryProfiler.js - Complete memory profiling setup
const v8 = require('v8');
const fs = require('fs');
const path = require('path');

class MemoryProfiler {
  constructor(options = {}) {
    this.outputDir = options.outputDir || './memory-profiles';
    this.snapshotInterval = options.snapshotInterval || 3600000; // 1 hour
    this.leakDetector = new MemoryLeakDetector({
      alertCallback: this.handleLeakAlert.bind(this)
    });

    this.snapshots = [];
    this.intervalId = null;

    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  start() {
    console.log('Memory profiler started');

    // Start leak detection
    this.leakDetector.start();

    // Take periodic snapshots
    this.intervalId = setInterval(() => {
      this.takeSnapshot('periodic');
    }, this.snapshotInterval);

    // Take initial snapshot
    this.takeSnapshot('startup');
  }

  stop() {
    this.leakDetector.stop();
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  takeSnapshot(reason = 'manual') {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const timestamp = Date.now();
    const filename = `heap-${reason}-${timestamp}.heapsnapshot`;
    const filepath = path.join(this.outputDir, filename);

    const snapshotPath = v8.writeHeapSnapshot(filepath);

    const record = {
      timestamp,
      reason,
      path: snapshotPath,
      memoryUsage: process.memoryUsage()
    };

    this.snapshots.push(record);

    console.log(`Heap snapshot saved: ${filename}`);
    console.log(`  Heap used: ${(record.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);

    return record;
  }

  handleLeakAlert(alert) {
    console.error('Memory leak alert:', alert);

    // Take snapshot for investigation
    this.takeSnapshot('leak-alert');

    // Compare with previous snapshot if available
    if (this.snapshots.length >= 2) {
      const prev = this.snapshots[this.snapshots.length - 2];
      const curr = this.snapshots[this.snapshots.length - 1];

      console.log('Compare snapshots for investigation:');
      console.log(`  Before: ${prev.path}`);
      console.log(`  After: ${curr.path}`);
    }
  }

  getReport() {
    return {
      snapshotCount: this.snapshots.length,
      snapshots: this.snapshots.map(s => ({
        timestamp: new Date(s.timestamp).toISOString(),
        reason: s.reason,
        heapUsedMB: (s.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)
      })),
      leakDetection: this.leakDetector.getReport()
    };
  }
}

// Memory leak detector (from earlier in this guide)
class MemoryLeakDetector {
  constructor(options = {}) {
    this.samples = [];
    this.windowSize = options.windowSize || 30;
    this.sampleIntervalMs = options.sampleIntervalMs || 10000;
    this.growthThreshold = options.growthThreshold || 0.2;
    this.alertCallback = options.alertCallback || console.warn;
    this.intervalId = null;
  }

  start() {
    this.intervalId = setInterval(() => {
      this.collectSample();
      this.analyze();
    }, this.sampleIntervalMs);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  collectSample() {
    const usage = process.memoryUsage();
    this.samples.push({
      timestamp: Date.now(),
      heapUsed: usage.heapUsed
    });

    if (this.samples.length > this.windowSize) {
      this.samples.shift();
    }
  }

  analyze() {
    if (this.samples.length < this.windowSize / 2) return;

    const first = this.samples[0].heapUsed;
    const last = this.samples[this.samples.length - 1].heapUsed;
    const growthRate = (last - first) / first;

    if (growthRate > this.growthThreshold) {
      this.alertCallback({
        type: 'memory_leak_suspected',
        growthRate: (growthRate * 100).toFixed(2) + '%',
        currentHeap: (last / 1024 / 1024).toFixed(2) + ' MB'
      });
    }
  }

  getReport() {
    if (this.samples.length === 0) {
      return { message: 'No samples collected' };
    }

    const first = this.samples[0];
    const last = this.samples[this.samples.length - 1];

    return {
      samples: this.samples.length,
      startHeap: (first.heapUsed / 1024 / 1024).toFixed(2) + ' MB',
      currentHeap: (last.heapUsed / 1024 / 1024).toFixed(2) + ' MB'
    };
  }
}

module.exports = { MemoryProfiler, MemoryLeakDetector };
```

---

## Summary

Memory profiling is essential for building reliable applications. The key points to remember are:

- Understand the difference between heap and stack memory
- Take heap snapshots before and after suspected issues
- Compare snapshots to identify growing object types
- Trace retention paths to find why objects are not being released
- Use allocation profiling to find code that creates garbage collection pressure
- Apply appropriate optimization strategies based on profiling results
- Use bounded caches, object pooling, streaming, and efficient data structures

Memory profiling is not a one-time activity. Build monitoring into your applications, set up alerts for abnormal growth, and regularly review memory usage patterns. The investment in understanding your application's memory behavior pays off in stability and performance.
