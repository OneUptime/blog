# How to Create Flame Graph Generation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Performance, Profiling, Flame Graphs, Debugging

Description: Generate and interpret flame graphs for CPU and memory profiling to identify performance bottlenecks and optimize application code.

---

Flame graphs transform raw profiling data into a visual map of where your application spends its time. A single glance at a flame graph can reveal the function call responsible for a latency spike that would take hours to find by reading logs. This guide covers capturing profiles, generating flame graphs, and interpreting them to fix real performance problems.

## What Flame Graphs Show

Flame graphs were invented by Brendan Gregg to visualize stack traces from profiling data. Each horizontal bar represents a function in the call stack:

| Visual Element | Meaning |
|----------------|---------|
| **Bar width** | Time spent in that function (including children) |
| **Bar height** | Stack depth (caller above, callee below) |
| **Bar color** | Random warm colors (no semantic meaning by default) |
| **Plateau (flat top)** | Function doing actual work (not calling others) |

The x-axis is not time - it is sorted alphabetically to group identical stacks together. The y-axis shows stack depth from bottom (entry point) to top (leaf functions).

### Flame Graph vs Call Tree

A call tree shows every path through your code separately. Flame graphs merge identical stacks:

```
Call Tree:                          Flame Graph:
main -> A -> B -> C (30%)           |------------- main -------------|
main -> A -> B -> D (20%)           |-------- A --------|
main -> A -> E (25%)                |--- B ---|-- E --|
main -> F (25%)                     |- C |- D |
                                    |    F    |
```

This merging makes patterns visible. Wide plateaus at the top indicate where CPU time actually goes.

## Capturing Profiles with perf (Linux)

The `perf` tool is the standard Linux profiler. It samples the CPU at regular intervals and records which function was executing.

### Basic CPU Profiling

Record CPU samples for a running process:

```bash
# Record CPU samples for 30 seconds on process 12345
perf record -F 99 -p 12345 -g -- sleep 30

# Record CPU samples for a command
perf record -F 99 -g -- ./my-application

# Record all CPUs system-wide
perf record -F 99 -a -g -- sleep 30
```

The flags break down as follows:

| Flag | Purpose |
|------|---------|
| `-F 99` | Sample at 99 Hz (samples per second) |
| `-p PID` | Attach to existing process |
| `-g` | Capture call graphs (stack traces) |
| `-a` | System-wide profiling |
| `-- sleep 30` | Duration to profile |

### Generating Flame Graphs from perf Data

Clone Brendan Gregg's FlameGraph repository and convert the perf data:

```bash
# Clone the FlameGraph tools
git clone https://github.com/brendangregg/FlameGraph.git
cd FlameGraph

# Convert perf data to folded stacks
perf script | ./stackcollapse-perf.pl > out.folded

# Generate the SVG flame graph
./flamegraph.pl out.folded > flamegraph.svg
```

The pipeline has three stages:

1. `perf script` converts binary perf data to human-readable stack traces
2. `stackcollapse-perf.pl` folds identical stacks and counts occurrences
3. `flamegraph.pl` renders the SVG visualization

### Customizing the Flame Graph Output

The `flamegraph.pl` script accepts many options:

```bash
# Set title and dimensions
./flamegraph.pl --title "API Server CPU Profile" \
                --width 1600 \
                --height 32 \
                out.folded > api-cpu.svg

# Use different color palette
./flamegraph.pl --color java out.folded > java-cpu.svg
./flamegraph.pl --color mem out.folded > memory.svg

# Reverse the stack (icicle graph)
./flamegraph.pl --inverted out.folded > icicle.svg
```

| Option | Effect |
|--------|--------|
| `--title "text"` | Sets the title at the top |
| `--width N` | SVG width in pixels |
| `--height N` | Height per frame in pixels |
| `--color PALETTE` | Color scheme (hot, mem, java, js, perl) |
| `--inverted` | Flip to icicle graph format |
| `--reverse` | Reverse stack order |
| `--minwidth N` | Hide frames narrower than N pixels |

## Capturing Profiles with async-profiler (Java/JVM)

For Java applications, async-profiler captures accurate stack traces without the safepoint bias that affects other JVM profilers.

### Installing async-profiler

```bash
# Download the latest release
wget https://github.com/async-profiler/async-profiler/releases/download/v3.0/async-profiler-3.0-linux-x64.tar.gz
tar xzf async-profiler-3.0-linux-x64.tar.gz
cd async-profiler-3.0-linux-x64
```

### Basic Profiling Commands

Profile a running Java process:

```bash
# Profile for 30 seconds and generate flame graph
./asprof -d 30 -f cpu-profile.html <pid>

# Profile CPU with specific event
./asprof -e cpu -d 30 -f cpu.svg <pid>

# Profile memory allocations
./asprof -e alloc -d 30 -f alloc.svg <pid>

# Profile lock contention
./asprof -e lock -d 30 -f locks.svg <pid>
```

### Event Types in async-profiler

| Event | What It Captures |
|-------|------------------|
| `cpu` | CPU cycles (default) |
| `alloc` | Heap allocations |
| `lock` | Lock contention |
| `wall` | Wall clock time (includes waiting) |
| `itimer` | CPU time via itimer |
| `ctimer` | CPU time via clock_gettime |

### Generating Flame Graphs Directly

async-profiler can generate flame graphs directly without external tools:

```bash
# Generate interactive HTML flame graph
./asprof -d 60 -f profile.html <pid>

# Generate SVG flame graph
./asprof -d 60 -f profile.svg <pid>

# Generate collapsed stacks for custom processing
./asprof -d 60 -o collapsed -f stacks.txt <pid>
```

The HTML output includes interactive features like search and zoom that SVG lacks.

### Profiling from Application Startup

Attach the profiler as a Java agent:

```bash
# Start application with profiling agent
java -agentpath:/path/to/libasyncProfiler.so=start,event=cpu,file=startup.html \
     -jar myapp.jar

# Profile for first 60 seconds only
java -agentpath:/path/to/libasyncProfiler.so=start,event=cpu,duration=60,file=startup.html \
     -jar myapp.jar
```

## Capturing Profiles in Node.js

Node.js has multiple profiling approaches depending on your needs.

### Using 0x for Easy Flame Graphs

The 0x tool wraps Node.js profiling into a single command:

```bash
# Install 0x globally
npm install -g 0x

# Profile your application
0x app.js

# Profile with custom port
0x -- node --max-old-space-size=4096 app.js
```

After the application exits (or you press Ctrl+C), 0x generates an interactive flame graph in your browser.

### Using the V8 Profiler Directly

For more control, use the V8 profiler API:

```javascript
const v8Profiler = require('v8-profiler-next');
const fs = require('fs');

// Set a meaningful title for the profile
v8Profiler.setGenerateType(1);

function startProfiling(title) {
  v8Profiler.startProfiling(title, true);
  console.log(`Started profiling: ${title}`);
}

function stopProfiling(title) {
  const profile = v8Profiler.stopProfiling(title);

  // Export to cpuprofile format (Chrome DevTools compatible)
  profile.export((error, result) => {
    if (error) {
      console.error('Export failed:', error);
      return;
    }

    const filename = `${title}-${Date.now()}.cpuprofile`;
    fs.writeFileSync(filename, result);
    console.log(`Profile saved: ${filename}`);

    profile.delete();
  });
}

// Profile a specific operation
async function profileOperation(name, operation) {
  startProfiling(name);

  try {
    return await operation();
  } finally {
    stopProfiling(name);
  }
}

// Usage example
profileOperation('database-queries', async () => {
  await runDatabaseQueries();
});
```

### Converting cpuprofile to Flame Graph

The cpuprofile format can be converted to flame graphs:

```bash
# Using flamebearer (interactive HTML)
npm install -g flamebearer
flamebearer profile.cpuprofile

# Using speedscope (web-based viewer)
npm install -g speedscope
speedscope profile.cpuprofile

# Using flamegraph.pl with conversion
npm install -g cpuprofilify
cpuprofilify profile.cpuprofile | flamegraph.pl > profile.svg
```

## Capturing Profiles in Python

Python profiling requires handling the GIL (Global Interpreter Lock) correctly.

### Using py-spy for Sampling Profiles

py-spy samples a running Python process without modifying code:

```bash
# Install py-spy
pip install py-spy

# Generate flame graph SVG
py-spy record -o profile.svg --pid 12345

# Record for specific duration
py-spy record -o profile.svg --pid 12345 --duration 30

# Profile a command directly
py-spy record -o profile.svg -- python app.py

# Generate speedscope format for interactive viewing
py-spy record -o profile.speedscope --format speedscope --pid 12345
```

### py-spy Output Formats

| Format | Use Case |
|--------|----------|
| `svg` | Static flame graph image |
| `speedscope` | Interactive web viewer |
| `raw` | Raw samples for custom processing |

### Using cProfile with flameprof

For programmatic profiling within Python:

```python
import cProfile
import pstats
from io import StringIO

def profile_function(func, *args, **kwargs):
    """Profile a function and return results."""
    profiler = cProfile.Profile()
    profiler.enable()

    try:
        result = func(*args, **kwargs)
    finally:
        profiler.disable()

    # Save for flame graph conversion
    profiler.dump_stats('profile.pstats')

    # Print summary
    stream = StringIO()
    stats = pstats.Stats(profiler, stream=stream)
    stats.sort_stats('cumulative')
    stats.print_stats(20)
    print(stream.getvalue())

    return result

# Convert pstats to flame graph
# pip install flameprof
# flameprof profile.pstats > profile.svg
```

Convert the pstats output to a flame graph:

```bash
# Install flameprof
pip install flameprof

# Generate flame graph
flameprof profile.pstats > profile.svg

# Generate with options
flameprof --width 1200 --title "API Handler" profile.pstats > profile.svg
```

## Capturing Profiles in Go

Go has built-in profiling through the pprof package.

### Enabling pprof HTTP Endpoint

Add the pprof HTTP handler to your application:

```go
package main

import (
    "log"
    "net/http"
    _ "net/http/pprof"  // Import for side effects
)

func main() {
    // Start pprof server on separate port
    go func() {
        log.Println("pprof server starting on :6060")
        log.Println(http.ListenAndServe("localhost:6060", nil))
    }()

    // Your application code
    startMainServer()
}
```

### Collecting Profiles

Use the go tool pprof to collect and visualize profiles:

```bash
# Collect 30-second CPU profile
go tool pprof http://localhost:6060/debug/pprof/profile?seconds=30

# Collect heap profile
go tool pprof http://localhost:6060/debug/pprof/heap

# Collect goroutine profile
go tool pprof http://localhost:6060/debug/pprof/goroutine

# Collect block profile (contention)
go tool pprof http://localhost:6060/debug/pprof/block
```

### Generating Flame Graphs from Go Profiles

Use pprof's built-in web interface:

```bash
# Start interactive web UI with flame graph
go tool pprof -http=:8080 profile.pb.gz

# Generate SVG flame graph directly
go tool pprof -svg profile.pb.gz > profile.svg

# Generate using external tools
go tool pprof -raw profile.pb.gz | stackcollapse-go.pl | flamegraph.pl > profile.svg
```

### Programmatic Profiling in Go

For programmatic control over profiling:

```go
package main

import (
    "os"
    "runtime/pprof"
    "time"
)

func profileCPU(filename string, duration time.Duration) error {
    f, err := os.Create(filename)
    if err != nil {
        return err
    }
    defer f.Close()

    if err := pprof.StartCPUProfile(f); err != nil {
        return err
    }

    time.Sleep(duration)
    pprof.StopCPUProfile()

    return nil
}

func profileHeap(filename string) error {
    f, err := os.Create(filename)
    if err != nil {
        return err
    }
    defer f.Close()

    return pprof.WriteHeapProfile(f)
}

// Usage
func main() {
    // Profile CPU for 30 seconds
    go profileCPU("cpu.prof", 30*time.Second)

    // Take heap snapshot
    profileHeap("heap.prof")

    // Your application code
    runApplication()
}
```

## Reading and Interpreting Flame Graphs

Understanding what flame graphs reveal requires practice. Here are the key patterns to look for.

### Pattern: Wide Plateau

A wide flat-topped bar means that function is consuming significant CPU without calling other functions:

```
|------------------process_request------------------|
|---------------parse_json--------------|
|----------JSON.parse----------|
```

In this example, `JSON.parse` is the hotspot. The fix might be:
- Parsing only needed fields
- Using a streaming parser
- Caching parsed results

### Pattern: Recursive Towers

Tall narrow stacks indicate recursion or deep call chains:

```
|main|
| A  |
| B  |
| C  |
| D  |
| E  |
```

Look for:
- Inefficient recursive algorithms
- Middleware chains that could be flattened
- Unnecessary abstraction layers

### Pattern: Many Small Siblings

Many narrow bars at the same level indicate the parent is calling many different functions:

```
|----------process_request----------|
| A | B | C | D | E | F | G | H | I |
```

This often appears in:
- Request handlers calling many validators
- Initialization code loading many modules
- Event handlers triggering many callbacks

### Pattern: Duplicate Stacks

Same sequence appearing multiple times indicates repeated work:

```
|---handler---|---handler---|---handler---|
|---parse-----|---parse-----|---parse-----|
|---validate--|---validate--|---validate--|
```

Look for:
- Missing caching
- N+1 query patterns
- Redundant computations

### Reading CPU vs Memory Flame Graphs

| Aspect | CPU Flame Graph | Memory Flame Graph |
|--------|-----------------|-------------------|
| **X-axis** | Time on CPU | Bytes allocated |
| **What wide means** | Function runs long | Function allocates much |
| **What to fix** | Algorithm efficiency | Allocation reduction |
| **Common hotspots** | Parsing, serialization | Object creation, buffers |

## Differential Flame Graphs

Differential flame graphs compare two profiles to show what changed. This is invaluable for:
- Comparing before/after optimization
- Identifying regression causes
- Analyzing different code paths

### Generating a Differential Flame Graph

Use the difffolded.pl script to compare two folded stack files:

```bash
# Capture baseline profile
perf record -F 99 -g -p 12345 -o baseline.data -- sleep 30
perf script -i baseline.data | ./stackcollapse-perf.pl > baseline.folded

# Capture comparison profile (after change)
perf record -F 99 -g -p 12345 -o comparison.data -- sleep 30
perf script -i comparison.data | ./stackcollapse-perf.pl > comparison.folded

# Generate differential flame graph
./difffolded.pl baseline.folded comparison.folded | ./flamegraph.pl > diff.svg
```

### Reading Differential Flame Graphs

| Color | Meaning |
|-------|---------|
| **Red** | Function takes MORE time in comparison |
| **Blue** | Function takes LESS time in comparison |
| **White/Gray** | No significant change |

Width still represents absolute time in the comparison profile. Color shows the delta.

### Example Workflow: Diagnosing a Regression

```bash
# 1. Capture profile from production (slow)
ssh prod-server "perf record -F 99 -g -p \$(pgrep myapp) -- sleep 60"
scp prod-server:perf.data prod.data

# 2. Capture profile from staging (fast)
ssh staging-server "perf record -F 99 -g -p \$(pgrep myapp) -- sleep 60"
scp staging-server:perf.data staging.data

# 3. Process both profiles
perf script -i prod.data | ./stackcollapse-perf.pl > prod.folded
perf script -i staging.data | ./stackcollapse-perf.pl > staging.folded

# 4. Generate differential flame graph
./difffolded.pl staging.folded prod.folded | ./flamegraph.pl > regression.svg
```

Red sections in the output show what got slower in production.

## Icicle Graphs vs Flame Graphs

Icicle graphs are inverted flame graphs - they grow downward instead of upward.

### Visual Comparison

```
Flame Graph:         Icicle Graph:
     |leaf|               |main|
   |--child--|         |--child--|
|-----main-----|          |leaf|
```

### When to Use Each

| Use Case | Recommended |
|----------|-------------|
| Finding where time goes (leaf functions) | Flame Graph |
| Understanding call hierarchy | Icicle Graph |
| Comparing with call trees | Icicle Graph |
| Presenting to non-technical audience | Icicle Graph |

### Generating Icicle Graphs

Most flame graph tools support icicle generation:

```bash
# Using flamegraph.pl
./flamegraph.pl --inverted out.folded > icicle.svg

# Using speedscope (toggle in UI)
speedscope profile.json
# Click the "Left Heavy" or "Sandwich" view

# Using async-profiler
./asprof -d 30 --reverse -f icicle.html <pid>
```

## Memory Flame Graphs

Memory flame graphs show allocation sites instead of CPU usage. The width represents bytes allocated.

### Capturing Memory Profiles

Different tools capture memory profiles:

```bash
# Linux perf with malloc tracing
perf record -e malloc:* -g -p 12345 -- sleep 30
perf script | ./stackcollapse-perf.pl | ./flamegraph.pl --color=mem > alloc.svg

# async-profiler for JVM
./asprof -e alloc -d 30 -f alloc.svg <pid>

# py-spy does not capture memory; use memray instead
pip install memray
memray run script.py
memray flamegraph memray-script.bin -o memory.html

# Go heap profile
go tool pprof -http=:8080 http://localhost:6060/debug/pprof/heap
```

### Reading Memory Flame Graphs

Wide bars at the top show:
- Functions that allocate many bytes directly
- Allocation hotspots that may cause GC pressure

Look for:
- Buffer allocations in loops
- String concatenation patterns
- Object creation that could be pooled

## Off-CPU Flame Graphs

Off-CPU flame graphs show where threads spend time waiting (blocked on I/O, locks, sleep).

### Capturing Off-CPU Data

```bash
# Using bcc/BPF tools (Linux)
/usr/share/bcc/tools/offcputime -df -p 12345 30 > offcpu.stacks
./flamegraph.pl --color=io --title="Off-CPU Time" offcpu.stacks > offcpu.svg

# Using async-profiler wall clock mode
./asprof -e wall -d 30 -f wall.svg <pid>

# Combining CPU and off-CPU
./asprof -e cpu,wall -d 30 -f combined.html <pid>
```

### Interpreting Off-CPU Patterns

| Pattern | Likely Cause |
|---------|--------------|
| Wide `read`/`write` bars | I/O bound workload |
| Wide `futex` bars | Lock contention |
| Wide `poll`/`epoll` bars | Waiting for network |
| Wide `nanosleep` bars | Explicit sleeps |

## Automated Flame Graph Generation in CI/CD

Integrate flame graph generation into your pipeline for continuous performance monitoring.

### GitHub Actions Example

```yaml
name: Performance Profile

on:
  pull_request:
    branches: [main]

jobs:
  profile:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup profiling tools
        run: |
          git clone https://github.com/brendangregg/FlameGraph.git
          sudo apt-get install -y linux-tools-common linux-tools-generic

      - name: Run application under load
        run: |
          # Start application
          ./app &
          APP_PID=$!
          sleep 5

          # Generate load
          wrk -t4 -c100 -d30s http://localhost:8080/ &

          # Profile during load
          sudo perf record -F 99 -g -p $APP_PID -o perf.data -- sleep 30

          # Stop application
          kill $APP_PID

      - name: Generate flame graph
        run: |
          sudo perf script -i perf.data | \
            ./FlameGraph/stackcollapse-perf.pl | \
            ./FlameGraph/flamegraph.pl --title "PR #${{ github.event.number }}" \
            > flamegraph.svg

      - name: Upload flame graph
        uses: actions/upload-artifact@v4
        with:
          name: flamegraph
          path: flamegraph.svg
```

### Comparing Against Baseline

```bash
#!/bin/bash
# compare-profiles.sh

BASELINE_BRANCH="main"
CURRENT_BRANCH=$(git branch --show-current)

# Profile baseline
git checkout $BASELINE_BRANCH
./run-benchmark.sh
mv profile.folded baseline.folded

# Profile current
git checkout $CURRENT_BRANCH
./run-benchmark.sh
mv profile.folded current.folded

# Generate differential flame graph
./FlameGraph/difffolded.pl baseline.folded current.folded | \
  ./FlameGraph/flamegraph.pl --title "Diff: $BASELINE_BRANCH vs $CURRENT_BRANCH" \
  > diff-flamegraph.svg

# Check for significant regressions
REGRESSION=$(./analyze-diff.py baseline.folded current.folded)
if [ "$REGRESSION" -gt 10 ]; then
  echo "Performance regression detected: ${REGRESSION}%"
  exit 1
fi
```

## Flame Graph Tools Comparison

| Tool | Languages | Output Formats | Interactive | Ease of Use |
|------|-----------|----------------|-------------|-------------|
| **FlameGraph (Gregg)** | Any (via stackcollapse) | SVG | No | Medium |
| **speedscope** | Many formats | HTML | Yes | High |
| **async-profiler** | JVM | SVG, HTML, text | HTML only | High |
| **0x** | Node.js | HTML | Yes | High |
| **py-spy** | Python | SVG, speedscope | Via speedscope | High |
| **pprof (Go)** | Go | SVG, HTML, text | HTML only | High |
| **flamebearer** | Node.js | HTML | Yes | High |

## Summary

Flame graphs turn profiling data into actionable insights:

| Task | Tool/Command |
|------|--------------|
| Profile Linux process | `perf record -F 99 -g -p PID` |
| Profile JVM application | `asprof -d 30 -f profile.html PID` |
| Profile Node.js | `0x app.js` |
| Profile Python | `py-spy record -o profile.svg --pid PID` |
| Profile Go | `go tool pprof http://localhost:6060/debug/pprof/profile` |
| Generate flame graph | `stackcollapse-*.pl | flamegraph.pl > graph.svg` |
| Generate differential | `difffolded.pl base.folded new.folded | flamegraph.pl` |
| Generate icicle graph | `flamegraph.pl --inverted` |

Start by capturing a CPU profile during normal operation to establish a baseline. When performance degrades, capture another profile and generate a differential flame graph. The red sections point directly to what got slower.

Flame graphs work best as part of a continuous profiling strategy. Generate them automatically in CI, compare pull requests against main, and investigate regressions before they reach production.

---

**Related Reading:**
- [Basics of Profiling: Turning CPU and Memory Hotspots into Action](https://oneuptime.com/blog/post/2025-09-09-basics-of-profiling/view)
- [How to Profile Node.js Applications with V8 Inspector and Chrome DevTools](https://oneuptime.com/blog/post/2026-01-06-nodejs-profiling-v8-inspector-chrome-devtools/view)
- [Three Pillars of Observability: Logs, Metrics, Traces](https://oneuptime.com/blog/post/2025-08-20-three-pillars-of-observability-logs-metrics-traces/view)
