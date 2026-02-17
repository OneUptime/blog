# How to Analyze Heap Allocation Profiles in Cloud Profiler to Optimize Memory Usage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Profiler, Heap Profiling, Memory Optimization, Performance

Description: Learn how to read and analyze heap allocation profiles in Cloud Profiler to find memory-hungry code paths, reduce garbage collection pressure, and optimize memory usage.

---

Memory problems in production are some of the hardest to debug. Your service might be using 2GB of RAM when you expected 500MB, or garbage collection pauses might be causing latency spikes. Heap allocation profiles in Cloud Profiler give you the data to understand exactly where memory is being allocated and which code paths are the biggest consumers.

Unlike heap snapshots (which show live objects at a point in time), allocation profiles show all allocations made during a profiling window, including temporary objects that were quickly garbage collected. This distinction matters because high-frequency temporary allocations create garbage collection pressure even if they do not contribute to long-term memory usage.

## Heap Profile Types in Cloud Profiler

Cloud Profiler provides two heap-related profile types:

**Heap (in-use)**: Shows memory currently in use on the heap. Each bar in the flame graph represents objects that are alive at the time of sampling. Use this to find memory leaks and understand what is consuming your working memory.

**Heap (allocated)**: Shows total bytes allocated during the profiling window, regardless of whether the objects are still alive. Use this to find functions that create lots of temporary objects and generate garbage collection pressure.

Both are valuable. If your concern is memory usage (OOM issues, high RSS), focus on the in-use profile. If your concern is GC pauses and latency, focus on the allocation profile.

## Reading the Heap Flame Graph

The heap flame graph follows the same conventions as CPU flame graphs, but the width of each bar represents bytes instead of time.

### What the Width Means

- **Heap in-use**: Width represents bytes of live memory attributed to that function and its children.
- **Heap allocated**: Width represents total bytes allocated by that function and its children during the profiling window.

### Self vs. Total

- **Total allocation**: The full width of the bar, including all child functions.
- **Self allocation**: Memory allocated directly by this function, excluding child calls. This appears as bar width that has no child bar above it.

A function with high self allocation is the one actually creating objects. A function with high total allocation but low self allocation is just calling other functions that allocate.

## Practical Analysis Examples

### Example 1: Finding the Biggest Allocator (Python)

You open Cloud Profiler, select your Python service, and choose "Heap (allocated)." The flame graph shows:

```
handle_request()                   (total: 100%)
  process_data()                   (total: 70%)
    parse_json()                   (total: 45%, self: 45%)
    transform_records()            (total: 25%, self: 5%)
      create_record_objects()      (total: 20%, self: 20%)
  format_response()                (total: 28%, self: 28%)
```

Reading this:
- `parse_json()` allocates 45% of all memory - the single biggest allocator. It is creating data structures from the parsed JSON.
- `create_record_objects()` allocates 20% - it is creating many small objects.
- `format_response()` allocates 28% - likely building the response string or dictionary.

### Example 2: Reducing Allocation in JSON Parsing

If JSON parsing dominates your heap profile, consider these optimizations:

```python
# BEFORE: Parse entire JSON payload into memory
import json

def process_request(raw_body):
    # Creates a large dictionary in memory
    data = json.loads(raw_body)
    # Only need a few fields
    return {
        "id": data["id"],
        "name": data["name"],
    }


# AFTER: Use streaming parser for large payloads
import ijson  # Streaming JSON parser

def process_request(raw_body_stream):
    # Parse only the fields you need without loading entire JSON
    result = {}
    parser = ijson.parse(raw_body_stream)
    for prefix, event, value in parser:
        if prefix == "id":
            result["id"] = value
        elif prefix == "name":
            result["name"] = value
            break  # Stop parsing once we have what we need
    return result
```

### Example 3: Reducing Object Creation in Go

Go heap profiles often reveal excessive object creation in hot loops.

```go
// BEFORE: Creates a new buffer for every request
func handleRequest(w http.ResponseWriter, r *http.Request) {
    buf := new(bytes.Buffer) // Allocated on heap every time
    encoder := json.NewEncoder(buf)
    encoder.Encode(response)
    w.Write(buf.Bytes())
}

// AFTER: Reuse buffers with sync.Pool
var bufPool = sync.Pool{
    New: func() interface{} {
        return new(bytes.Buffer)
    },
}

func handleRequest(w http.ResponseWriter, r *http.Request) {
    buf := bufPool.Get().(*bytes.Buffer)
    buf.Reset() // Clear previous content
    defer bufPool.Put(buf)

    encoder := json.NewEncoder(buf)
    encoder.Encode(response)
    w.Write(buf.Bytes())
}
```

### Example 4: Java Heap Analysis

For Java applications, Cloud Profiler heap profiles show allocations by method. Common hotspots include:

```java
// BEFORE: String concatenation in a loop creates many temporary String objects
public String buildReport(List<Record> records) {
    String result = "";
    for (Record r : records) {
        result += r.getName() + ": " + r.getValue() + "\n"; // Allocates new String each iteration
    }
    return result;
}

// AFTER: StringBuilder avoids temporary String allocations
public String buildReport(List<Record> records) {
    StringBuilder sb = new StringBuilder(records.size() * 50); // Pre-size the buffer
    for (Record r : records) {
        sb.append(r.getName()).append(": ").append(r.getValue()).append('\n');
    }
    return sb.toString();
}
```

## Comparing Heap Profiles Over Time

To detect memory growth, compare the heap in-use profile from two different time periods.

1. Select your service in Cloud Profiler
2. Choose "Heap" as the profile type
3. Set the time range to the current period
4. Click "Compare to" and select an earlier period

Functions that show more memory in the recent period (highlighted in red/orange) are growing. This could indicate:
- A cache that is accumulating entries
- A connection pool that is growing
- A data structure that holds references longer than intended
- A leak

## Correlating Heap Profiles with GC Metrics

Heap allocation profiles are most useful when combined with garbage collection metrics. If your application has high allocation rates, GC will run more frequently, causing latency spikes.

For Go, check GC stats:

```go
// Log GC statistics periodically
import "runtime"

func logGCStats() {
    var stats runtime.MemStats
    runtime.ReadMemStats(&stats)

    log.Printf("Heap alloc: %d MB, Heap objects: %d, GC cycles: %d, GC pause total: %d ms",
        stats.HeapAlloc/1024/1024,
        stats.HeapObjects,
        stats.NumGC,
        stats.PauseTotalNs/1000000,
    )
}
```

For Java, add GC logging:

```bash
# Enable GC logging in JVM arguments
java -Xlog:gc*:file=/var/log/gc.log:time,tags -jar app.jar
```

For Node.js, monitor V8 heap statistics:

```javascript
// Log heap statistics periodically
setInterval(() => {
    const usage = process.memoryUsage();
    console.log(JSON.stringify({
        severity: 'INFO',
        message: 'heap_stats',
        heap_used_mb: Math.round(usage.heapUsed / 1024 / 1024),
        heap_total_mb: Math.round(usage.heapTotal / 1024 / 1024),
        rss_mb: Math.round(usage.rss / 1024 / 1024),
    }));
}, 60000); // Every minute
```

## Optimization Strategies by Language

### Python
- Use generators instead of lists for large sequences
- Avoid creating dictionaries when named tuples or dataclasses suffice
- Use `__slots__` on frequently instantiated classes
- Consider `array` or `numpy` for numeric data instead of lists

### Go
- Use `sync.Pool` for frequently allocated temporary objects
- Pre-allocate slices with `make([]T, 0, expectedSize)`
- Use value types instead of pointers for small structs
- Avoid closures in hot loops (they allocate)

### Java
- Pre-size collections (ArrayList, HashMap) when the size is known
- Use primitive arrays instead of boxed collections when possible
- Reuse StringBuilder instances
- Use object pools for expensive objects

### Node.js
- Reuse Buffers instead of creating new ones
- Use streams for large data processing
- Avoid creating closures in tight loops
- Use TypedArrays for numeric data

## Setting Up Memory Alerts

Complement profiling with alerting to catch memory issues early.

```bash
# Alert when container memory exceeds 80% of limit
gcloud monitoring policies create \
  --display-name="High Memory Usage" \
  --condition-display-name="Memory above 80%" \
  --condition-filter='resource.type="k8s_container" AND metric.type="kubernetes.io/container/memory/used_bytes"' \
  --condition-threshold-value=429496729 \
  --condition-threshold-duration=300s \
  --condition-threshold-comparison=COMPARISON_GT
```

## Wrapping Up

Heap allocation profiles reveal the memory behavior that metrics alone cannot show. The in-use profile tells you what is consuming memory, and the allocation profile tells you what is creating garbage collection pressure. Compare profiles over time to detect leaks, focus on the widest self-allocation bars to find optimization targets, and apply language-specific strategies to reduce unnecessary allocations. Regular review of heap profiles prevents memory problems from reaching production users.
