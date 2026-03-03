# How to Use perf for CPU Performance Profiling on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Performance Tuning, Linux, Profiling, System Administration

Description: Learn how to use the Linux perf tool on Ubuntu to profile CPU performance, identify hot code paths, analyze hardware counters, and generate flame graphs for performance optimization.

---

`perf` is the Linux performance analysis tool built directly into the kernel. Unlike application-level profilers that rely on sampling or instrumentation, `perf` uses hardware performance counters and kernel tracepoints to give you accurate, low-overhead profiling data. It can profile a single application, a specific function, or the entire system.

## Installing perf

`perf` needs to match your kernel version:

```bash
# Install for the current kernel
sudo apt install linux-tools-$(uname -r) linux-tools-common -y

# Verify installation
perf --version
```

If you get a version mismatch error, also install the generic tools:

```bash
sudo apt install linux-tools-generic -y
```

## Checking perf Access

`perf` requires certain privileges:

```bash
# Check paranoia level (0=most permissive, 4=most restrictive)
cat /proc/sys/kernel/perf_event_paranoid
```

For development environments, lower the restriction:

```bash
# Allow user-level profiling (temporary)
sudo sysctl kernel.perf_event_paranoid=1

# Permanent
echo 'kernel.perf_event_paranoid=1' | sudo tee /etc/sysctl.d/99-perf.conf
```

## Recording Performance Data

The main workflow is: record data, then analyze it.

```bash
# Record CPU performance data for a command
perf record ./myprogram

# Record with call graph information (crucial for flame graphs)
perf record -g ./myprogram

# Record a running process by PID
sudo perf record -p 1234 sleep 10

# Record system-wide for 10 seconds
sudo perf record -a sleep 10
```

Data is saved to `perf.data` in the current directory.

## Viewing Reports

```bash
# Interactive report (press 'a' to annotate, 'h' for help)
perf report

# Non-interactive text output
perf report --stdio

# Non-interactive with call graph
perf report --call-graph --stdio | head -100
```

The report shows percentages of CPU time per symbol (function):

```text
# Overhead  Command    Shared Object      Symbol
# ........  .......    .............      ......
    45.23%  myprogram  myprogram          [.] compute_matrix
    23.11%  myprogram  libc.so.6          [.] malloc
    12.44%  myprogram  myprogram          [.] hash_lookup
```

## Counting Hardware Events

List available events:

```bash
# List all available events
perf list

# List only hardware events
perf list hardware

# List only software events
perf list software

# List cache events
perf list cache
```

Count specific hardware events:

```bash
# Count cache misses and cache references
perf stat -e cache-misses,cache-references ./myprogram

# Count branch mispredictions
perf stat -e branch-misses,branch-instructions ./myprogram

# Full default stat (most useful starting point)
perf stat ./myprogram
```

Example output:

```text
 Performance counter stats for './myprogram':

      2,345,678      cache-misses              #    4.32% of all cache refs
     54,231,098      cache-references
     12,456,789      branch-misses             #    2.15% of all branches
    579,345,678      branch-instructions
         5.2345 seconds time elapsed
```

High cache miss rates (above 5-10%) or branch misprediction rates (above 2-5%) are areas to focus optimization on.

## CPU-Wide Statistics

```bash
# Collect stats for all CPUs for 5 seconds
sudo perf stat -a sleep 5

# Per-CPU breakdown
sudo perf stat -a -A sleep 5
```

## Profiling a Running Service

```bash
# Find the PID
PID=$(pgrep nginx | head -1)

# Record for 30 seconds with call graph
sudo perf record -g -p $PID sleep 30

# Report
sudo perf report --stdio | head -50
```

## Flame Graphs

Flame graphs are the most useful visualization for perf data. They show call stacks with width proportional to CPU time spent.

### Setting Up Flame Graphs

```bash
# Install dependencies
sudo apt install perl git -y

# Get FlameGraph scripts
git clone https://github.com/brendangregg/FlameGraph /opt/flamegraph
```

### Generating a Flame Graph

```bash
# Record with stack traces
sudo perf record -F 99 -g -p $(pgrep myapp) sleep 30

# Convert to folded format
sudo perf script > /tmp/out.perf
/opt/flamegraph/stackcollapse-perf.pl /tmp/out.perf > /tmp/out.folded

# Generate SVG
/opt/flamegraph/flamegraph.pl /tmp/out.folded > /tmp/flamegraph.svg
```

Open `flamegraph.svg` in a browser. Wide bars at the bottom of the graph represent where most time is spent - those are your optimization targets.

## Tracing with perf trace

`perf trace` is similar to strace but with much lower overhead:

```bash
# Trace syscalls for a command
perf trace ls /tmp

# Trace a running process
sudo perf trace -p 1234

# Summary of syscall counts and time
sudo perf trace -s -p 1234 sleep 10
```

## Using perf top (Real-Time Profiling)

Like `top` but shows functions instead of processes:

```bash
# System-wide real-time profiling
sudo perf top

# Profile a specific process
sudo perf top -p $(pgrep myapp)

# Increase sampling frequency (higher overhead)
sudo perf top -F 1000
```

Press `a` to annotate assembly for the selected function, showing which instructions are hottest.

## Analyzing Cache Performance

```bash
# Detailed cache miss analysis
perf stat -e \
  L1-dcache-loads,L1-dcache-load-misses,\
  L1-icache-loads,L1-icache-load-misses,\
  LLC-loads,LLC-load-misses \
  ./myprogram
```

This shows cache miss rates at each level of the hierarchy - L1, L2, and LLC (Last Level Cache). High LLC miss rates indicate working set doesn't fit in cache.

## Benchmarking with perf stat

Compare two implementations:

```bash
# Baseline
perf stat -r 5 ./original_program 2> stats_original.txt

# Optimized version
perf stat -r 5 ./optimized_program 2> stats_optimized.txt

# Compare
diff stats_original.txt stats_optimized.txt
```

The `-r 5` runs the program 5 times and shows variance - essential for meaningful benchmarks.

## Saving and Sharing perf Data

```bash
# Archive perf.data with all referenced libraries for analysis on another machine
perf archive

# Inject build IDs for better symbol resolution
perf inject --build-id -i perf.data -o perf.data.new

# Annotate with source code (requires debug symbols)
perf annotate --stdio
```

## Getting Symbol Names

Without debug symbols, perf shows raw addresses. Install debug symbols for common libraries:

```bash
# Enable debug symbol repositories
sudo apt install ubuntu-dbgsym-keyring -y
echo "deb http://ddebs.ubuntu.com $(lsb_release -cs) main restricted universe multiverse" | \
  sudo tee /etc/apt/sources.list.d/ddebs.list

sudo apt update

# Install libc debug symbols
sudo apt install libc6-dbgsym -y

# Install kernel debug symbols
sudo apt install linux-image-$(uname -r)-dbgsym -y
```

## One-Line Quick Profiles

```bash
# Profile a command and show top 10 functions
perf record -g ./myapp && perf report --stdio --no-children | head -30

# CPU cycles per function for a short workload
perf stat -e cycles,instructions,cache-misses ./myapp

# Quick flame graph (all in one)
sudo perf record -F 99 -g -p $(pgrep myapp) sleep 10 && \
  sudo perf script | /opt/flamegraph/stackcollapse-perf.pl | \
  /opt/flamegraph/flamegraph.pl > /tmp/quick_flame.svg
```

`perf` has a learning curve, but once you understand the record/report workflow and can generate flame graphs, you have a profiling capability that commercial tools can rarely match in terms of accuracy and system-level insight. The key is starting with `perf stat` to understand the problem space, then using `perf record` with call graphs to find the specific code paths that need attention.
