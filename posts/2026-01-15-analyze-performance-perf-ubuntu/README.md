# How to Analyze System Performance with perf on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, perf, Performance, Profiling, Linux, Tutorial

Description: Complete guide to using Linux perf tool for system performance analysis on Ubuntu.

---

Performance analysis is crucial for understanding how your applications and system behave under various workloads. The Linux `perf` tool is one of the most powerful profiling utilities available, providing deep insights into CPU usage, cache behavior, system calls, and much more. In this comprehensive guide, we will explore how to use `perf` on Ubuntu to analyze and optimize system performance.

## Understanding perf and Hardware Counters

### What is perf?

`perf` (Performance Counters for Linux) is a powerful profiling tool built into the Linux kernel. It provides a unified interface to access hardware performance counters, software counters, and tracepoints. Originally developed by kernel developers to analyze kernel performance, it has evolved into a comprehensive tool for profiling both kernel and user-space applications.

### Hardware Performance Counters

Modern CPUs contain Performance Monitoring Units (PMUs) that track various hardware events at the processor level. These counters operate with minimal overhead since they are implemented in hardware. Common hardware counters include:

- **CPU cycles**: The number of clock cycles consumed
- **Instructions**: The number of instructions executed
- **Cache references/misses**: L1, L2, and L3 cache hit and miss counts
- **Branch predictions**: Successful and failed branch predictions
- **TLB misses**: Translation Lookaside Buffer miss events
- **Bus cycles**: Memory bus utilization

### Software Counters and Tracepoints

Beyond hardware counters, `perf` can also monitor:

- **Software events**: Page faults, context switches, CPU migrations
- **Tracepoints**: Predefined instrumentation points in the kernel
- **Dynamic probes**: User-defined probes in kernel or user space

## Installing perf Tools on Ubuntu

Before using `perf`, you need to install the appropriate packages. The `perf` tool is included in the `linux-tools` package, which must match your kernel version.

### Step 1: Check Your Kernel Version

```bash
# Display the current kernel version
uname -r

# Example output: 6.5.0-35-generic
```

### Step 2: Install linux-tools Package

```bash
# Install perf tools for your specific kernel version
sudo apt update
sudo apt install linux-tools-$(uname -r) linux-tools-generic

# This installs:
# - linux-tools-$(uname -r): Kernel-specific perf binary
# - linux-tools-generic: Generic tools package that pulls in dependencies
```

### Step 3: Verify Installation

```bash
# Check if perf is installed correctly
perf --version

# Example output: perf version 6.5.13

# List available events to verify hardware counter access
perf list
```

### Step 4: Configure Kernel Parameters (Optional)

For full functionality, you may need to adjust kernel parameters:

```bash
# Allow non-root users to collect kernel-level profiles
# WARNING: This has security implications - only enable in trusted environments
echo 0 | sudo tee /proc/sys/kernel/perf_event_paranoid

# Make the change persistent across reboots
echo 'kernel.perf_event_paranoid = 0' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Paranoid levels:
# -1: Allow all users to access all events
#  0: Allow all users to access non-kernel events
#  1: Allow all users to access CPU events (default)
#  2: Disallow all profiling (only kernel profiling allowed)
```

## perf stat: Analyzing Hardware Counters

The `perf stat` command collects and displays hardware counter statistics for a program or workload. It is the simplest way to get an overview of how a program utilizes hardware resources.

### Basic Usage

```bash
# Profile a simple command
perf stat ls -la /tmp

# Example output:
#  Performance counter stats for 'ls -la /tmp':
#
#              1.24 msec task-clock                #    0.712 CPUs utilized
#                 2      context-switches          #    1.613 K/sec
#                 0      cpu-migrations            #    0.000 /sec
#               112      page-faults               #   90.323 K/sec
#         3,847,291      cycles                    #    3.103 GHz
#         2,156,892      instructions              #    0.56  insn per cycle
#           421,234      branches                  #  339.705 M/sec
#            18,456      branch-misses             #    4.38% of all branches
#
#       0.001742891 seconds time elapsed
```

### Specifying Events

```bash
# Monitor specific hardware events
perf stat -e cycles,instructions,cache-references,cache-misses ./my_program

# Monitor multiple event groups for better accuracy
perf stat -e '{cycles,instructions}','{cache-references,cache-misses}' ./my_program

# List all available events
perf list

# Common event categories:
# - Hardware events: cycles, instructions, cache-misses, branch-misses
# - Software events: page-faults, context-switches, cpu-migrations
# - Cache events: L1-dcache-loads, L1-dcache-load-misses, LLC-loads
```

### Profiling Running Processes

```bash
# Attach to a running process by PID
perf stat -p 1234

# Profile for a specific duration (10 seconds)
perf stat -p 1234 sleep 10

# Profile all processes on a specific CPU
perf stat -C 0 sleep 5

# Profile with detailed statistics
perf stat -d ./my_program
# -d provides additional cache and memory statistics
```

### Repeating Measurements

```bash
# Run the same workload multiple times and show statistics
perf stat -r 10 ./my_program

# Output includes mean, standard deviation, and variance
# Useful for benchmarking with statistical significance
```

### Analyzing CPU Cache Behavior

```bash
# Comprehensive cache analysis
perf stat -e L1-dcache-loads,L1-dcache-load-misses,\
L1-icache-load-misses,LLC-loads,LLC-load-misses ./my_program

# Calculate cache miss ratios
# L1 data cache miss ratio = L1-dcache-load-misses / L1-dcache-loads
# LLC (Last Level Cache) miss ratio = LLC-load-misses / LLC-loads

# A high cache miss ratio indicates poor memory access patterns
# Consider restructuring data for better cache locality
```

## perf record and perf report: Detailed Profiling

While `perf stat` provides summary statistics, `perf record` captures detailed profiling data that can be analyzed with `perf report`.

### Recording Profile Data

```bash
# Record performance data for a command
perf record ./my_program

# This creates a perf.data file in the current directory

# Record with call graph information (essential for understanding call chains)
perf record -g ./my_program
# -g enables call-graph (stack chain/backtrace) recording

# Record with specific sampling frequency
perf record -F 99 ./my_program
# -F 99 samples at 99 Hz (samples per second)
# Lower frequencies reduce overhead; higher frequencies improve resolution
```

### Recording Options

```bash
# Record all CPUs system-wide
sudo perf record -a -g sleep 30
# -a: System-wide collection from all CPUs
# Captures activity across all processes for 30 seconds

# Record specific events
perf record -e cycles:u,instructions:u ./my_program
# :u suffix means user-space only (excludes kernel)
# :k suffix means kernel-space only

# Record with timestamps for correlation with other data
perf record -T ./my_program

# Save to a custom output file
perf record -o profile_run1.data ./my_program
```

### Analyzing with perf report

```bash
# View the recorded data in an interactive TUI
perf report

# Show annotated source code (requires debug symbols)
perf report --stdio

# Navigation in TUI:
# - Arrow keys: Navigate
# - Enter: Expand/collapse or annotate
# - a: Annotate selected function
# - h: Show help
# - q: Quit

# Filter by specific criteria
perf report --sort=dso,symbol
# Sort by dynamic shared object (library) then symbol name

# Show only user-space code
perf report --exclude-kernel

# Export to a text file for further analysis
perf report --stdio > profile_report.txt
```

### Understanding perf report Output

```bash
# Example perf report output:
#
# Overhead  Command     Shared Object       Symbol
# ........  ..........  ..................  .............................
#   42.15%  my_program  my_program          [.] compute_heavy_function
#   21.38%  my_program  libc-2.35.so        [.] __memcpy_avx_unaligned
#   12.94%  my_program  [kernel.kallsyms]   [k] copy_user_generic_string
#    8.27%  my_program  my_program          [.] process_data
#
# Column meanings:
# - Overhead: Percentage of samples in this function
# - Command: The process name
# - Shared Object: The binary or library containing the code
# - Symbol: Function name ([.] = user-space, [k] = kernel)
```

### Annotating Source Code

```bash
# Compile your program with debug symbols
gcc -g -O2 -o my_program my_program.c

# Record and annotate
perf record -g ./my_program
perf annotate compute_heavy_function

# This shows assembly with source line mapping
# Helps identify exactly which instructions are hot spots
```

## perf top: Live Performance Analysis

`perf top` provides a real-time view of system performance, similar to the `top` command but for CPU profiling.

### Basic Usage

```bash
# Start live profiling (requires root for system-wide)
sudo perf top

# Output updates every few seconds showing:
# - Overhead percentage
# - Shared object (binary/library)
# - Symbol (function name)
```

### Filtering and Options

```bash
# Profile only user-space code
perf top -U

# Profile only kernel code
sudo perf top -K

# Profile a specific process
perf top -p 1234

# Profile specific CPU cores
perf top -C 0,1,2,3

# Change sampling frequency
perf top -F 999
# Higher frequency gives more precise data but uses more CPU

# Enable call-graph display
sudo perf top -g

# Show specific events
perf top -e cache-misses
```

### Interactive Commands in perf top

```bash
# While perf top is running:
# - h: Display help
# - s: Annotate selected symbol (show assembly)
# - d: Enter a new refresh delay
# - e: Enter a new event to profile
# - E: Expand/collapse call chain
# - q: Quit

# Example workflow:
# 1. Run 'sudo perf top -g'
# 2. Observe which functions consume most CPU
# 3. Press 's' on a hot function to see assembly
# 4. Press 'a' to annotate with source (if debug info available)
```

## Generating Flame Graphs

Flame graphs are a powerful visualization technique invented by Brendan Gregg for understanding profiled stack traces. They provide an intuitive way to identify performance bottlenecks.

### Installing Flame Graph Tools

```bash
# Clone the FlameGraph repository
git clone https://github.com/brendangregg/FlameGraph.git ~/FlameGraph

# Add to PATH (optional)
export PATH=$PATH:~/FlameGraph
```

### Creating CPU Flame Graphs

```bash
# Step 1: Record with call-graph support
# Use -g for frame pointer-based unwinding
perf record -F 99 -g ./my_program

# Alternative: Use DWARF-based unwinding (more reliable but slower)
perf record -F 99 --call-graph dwarf ./my_program

# Step 2: Generate the folded stack traces
perf script | ~/FlameGraph/stackcollapse-perf.pl > out.folded

# Step 3: Generate the SVG flame graph
~/FlameGraph/flamegraph.pl out.folded > flamegraph.svg

# Step 4: View in a web browser
firefox flamegraph.svg
# or
xdg-open flamegraph.svg
```

### Flame Graph One-Liner

```bash
# Complete pipeline in one command
perf record -F 99 -g ./my_program && \
perf script | ~/FlameGraph/stackcollapse-perf.pl | \
~/FlameGraph/flamegraph.pl > flamegraph.svg
```

### Understanding Flame Graphs

```
# Flame graph anatomy:
#
#          +---------------------------+
#          |      function_d (20%)     |
#          +-------------+-------------+
#          |function_c   | function_e  |
#          |   (15%)     |    (5%)     |
# +--------+-------------+-------------+--------+
# |           function_b (60%)                  |
# +--------+------------------------------------+
# |           function_a (80%)                  |
# +---------------------------------------------+
# |               main (100%)                   |
# +---------------------------------------------+
#
# Reading flame graphs:
# - X-axis: Stack profile population (wider = more samples)
# - Y-axis: Stack depth (bottom = root, top = leaf functions)
# - Color: Random (for visual distinction)
# - Width: Proportional to time spent in that function (including children)
#
# Identifying issues:
# - Wide plateaus at the top indicate functions consuming CPU time
# - Narrow spikes indicate deep call stacks
# - Compare before/after optimization with differential flame graphs
```

### Off-CPU Flame Graphs

```bash
# Capture off-CPU time (time spent waiting/blocked)
# Requires BPF tools for best results

# Using perf with scheduler tracepoints
sudo perf record -e sched:sched_switch -a -g sleep 30

# Generate off-CPU flame graph
sudo perf script | ~/FlameGraph/stackcollapse-perf.pl | \
~/FlameGraph/flamegraph.pl --color=io --title="Off-CPU Time" > offcpu.svg
```

## CPU Profiling in Depth

### Identifying CPU-Bound Code

```bash
# Record CPU cycles with maximum detail
perf record -e cycles:pp -g ./my_program
# :pp suffix enables precise event sampling (PEBS on Intel)

# Analyze instruction-level hotspots
perf annotate --stdio

# Check instruction mix
perf stat -e instructions,cycles,\
fp_arith_inst_retired.scalar_single,\
fp_arith_inst_retired.scalar_double ./my_program
```

### Branch Prediction Analysis

```bash
# Profile branch prediction behavior
perf stat -e branches,branch-misses ./my_program

# A high branch miss rate (>5%) indicates:
# - Unpredictable conditional branches
# - Consider restructuring code or using branchless algorithms

# Record branch events for detailed analysis
perf record -e branch-misses:pp ./my_program
perf report
```

### Pipeline Stalls and IPC

```bash
# Analyze Instructions Per Cycle (IPC)
perf stat -e cycles,instructions ./my_program

# Good IPC values:
# - Modern CPUs can achieve 2-4 IPC under ideal conditions
# - IPC < 1 indicates pipeline stalls (memory, branches, etc.)

# Detailed stall analysis (Intel-specific events)
perf stat -e cpu/event=0xa2,umask=0x01/,\
cpu/event=0xa3,umask=0x04/ ./my_program
# These are stall cycle counters (check your CPU documentation)
```

### Per-Function CPU Analysis

```bash
# Get per-function timing with call graph
perf record -g --call-graph dwarf ./my_program
perf report --sort=symbol --children

# --children shows cumulative time including called functions
# Helps identify both direct hotspots and problematic callers
```

## Memory Profiling

### Cache Performance Analysis

```bash
# Comprehensive cache analysis
perf stat -e \
cache-references,cache-misses,\
L1-dcache-loads,L1-dcache-load-misses,\
L1-icache-load-misses,\
LLC-loads,LLC-load-misses ./my_program

# Record cache miss events for detailed analysis
perf record -e cache-misses ./my_program
perf report

# Calculate key metrics:
# - L1 data cache miss ratio: L1-dcache-load-misses / L1-dcache-loads
# - L1 instruction cache miss ratio: L1-icache-load-misses / total
# - LLC (L3) miss ratio: LLC-load-misses / LLC-loads
#
# If LLC miss ratio is high, memory bandwidth may be the bottleneck
```

### Memory Bandwidth Analysis

```bash
# Monitor memory controller events (Intel example)
perf stat -e \
offcore_response.all_reads.l3_miss.local_dram,\
offcore_response.all_reads.l3_miss.remote_dram \
./my_program

# For simpler memory bandwidth estimation
perf stat -e LLC-load-misses,LLC-store-misses ./my_program
# Each LLC miss typically means a memory access (~64 bytes)
# Memory bandwidth ≈ (LLC-load-misses + LLC-store-misses) * 64 / time
```

### Memory Access Patterns with perf mem

```bash
# Record memory load and store samples
perf mem record ./my_program

# Report memory access patterns
perf mem report

# Shows:
# - Memory access latency distribution
# - Data source (L1, L2, L3, local memory, remote memory)
# - Symbol and address information
```

### NUMA Analysis

```bash
# On multi-socket systems, analyze NUMA behavior
numactl --hardware  # View NUMA topology

# Profile with NUMA-aware events
perf stat -e node-loads,node-load-misses,\
node-stores,node-store-misses ./my_program

# High remote NUMA access indicates memory placement issues
# Consider numactl --membind or --cpunodebind for optimization
```

## I/O Analysis

### Block I/O Tracing

```bash
# Trace block I/O operations
sudo perf record -e block:block_rq_issue,block:block_rq_complete -a sleep 10

# Analyze block I/O patterns
sudo perf script

# Example output shows:
# - Timestamp
# - Process name and PID
# - I/O operation (read/write)
# - Block device
# - Sector and size
```

### Storage Latency Analysis

```bash
# Record I/O latency using tracepoints
sudo perf record -e block:block_rq_issue,block:block_rq_complete \
-a -g sleep 30

# Create a script to calculate I/O latencies
sudo perf script | awk '
/block_rq_issue/ { issue[$5] = $4 }
/block_rq_complete/ {
    if ($5 in issue) {
        latency = $4 - issue[$5]
        print "Latency:", latency * 1000, "ms"
        delete issue[$5]
    }
}'
```

### File System Operations

```bash
# Trace ext4 file system operations
sudo perf record -e 'ext4:*' -a sleep 10
sudo perf script

# Trace specific operations like fsync
sudo perf record -e 'syscalls:sys_enter_fsync' -a sleep 10

# Profile application I/O
perf record -e syscalls:sys_enter_read,syscalls:sys_enter_write \
./my_program
```

## Tracing System Calls

### Recording System Calls

```bash
# Record all system calls made by a program
perf record -e 'syscalls:sys_enter_*' ./my_program

# This can generate a lot of data, so filter specific calls:
perf record -e syscalls:sys_enter_read,\
syscalls:sys_enter_write,\
syscalls:sys_enter_open ./my_program

# View the recorded system calls
perf script
```

### System Call Statistics

```bash
# Count system calls by type
perf stat -e 'syscalls:sys_enter_*' ./my_program 2>&1 | \
grep -v "^$" | sort -t: -k2 -rn | head -20

# Profile system call overhead
perf record -e syscalls:sys_enter_read -g ./my_program
perf report
# Shows call stacks leading to read() system calls
```

### Tracing Specific System Calls

```bash
# Trace memory allocation (brk, mmap)
perf trace -e brk,mmap,munmap ./my_program

# Trace network operations
perf trace -e socket,connect,accept,send,recv ./my_program

# Trace file operations with timestamps
perf trace -T -e open,close,read,write ./my_program

# perf trace output example:
#      0.000 ( 0.012 ms): my_program/1234 open(filename: "/etc/hosts") = 3
#      0.015 ( 0.003 ms): my_program/1234 read(fd: 3, buf: 0x7fff..., count: 4096) = 234
#      0.020 ( 0.001 ms): my_program/1234 close(fd: 3) = 0
```

### Comparing with strace

```bash
# perf trace is often more efficient than strace
# strace uses ptrace which has high overhead

# Compare overhead:
time strace -c ./my_program    # High overhead
time perf trace -s ./my_program  # Lower overhead

# perf trace uses kernel tracepoints instead of ptrace
# Better for production systems and performance-sensitive profiling
```

## Interpreting Results

### Key Metrics to Watch

```bash
# Essential performance indicators:

# 1. IPC (Instructions Per Cycle)
perf stat -e cycles,instructions ./my_program
# IPC = instructions / cycles
# Good: > 1.0, Excellent: > 2.0, Poor: < 0.5

# 2. Cache Miss Rate
perf stat -e cache-references,cache-misses ./my_program
# Miss rate = cache-misses / cache-references
# Good: < 5%, Concerning: > 10%

# 3. Branch Misprediction Rate
perf stat -e branches,branch-misses ./my_program
# Miss rate = branch-misses / branches
# Good: < 2%, Concerning: > 5%

# 4. Context Switch Rate
perf stat -e context-switches ./my_program
# High rate indicates lock contention or I/O blocking
```

### Common Performance Patterns

```bash
# Pattern 1: Memory-bound workload
# Symptoms: Low IPC, high cache misses, high LLC misses
# Solutions: Improve data locality, use prefetching, restructure data

# Pattern 2: Branch-heavy code
# Symptoms: High branch miss rate, moderate IPC
# Solutions: Use branchless algorithms, improve branch predictability

# Pattern 3: Lock contention
# Symptoms: High context switches, time in futex calls
# Solutions: Reduce lock granularity, use lock-free structures

# Pattern 4: I/O bound
# Symptoms: Low CPU utilization, time in syscalls
# Solutions: Async I/O, buffering, memory-mapped files
```

### Comparing Before and After

```bash
# Create baseline measurement
perf stat -r 5 -o baseline.txt ./my_program_v1

# After optimization
perf stat -r 5 -o optimized.txt ./my_program_v2

# Differential flame graphs
perf record -g ./my_program_v1
mv perf.data perf_v1.data

perf record -g ./my_program_v2
mv perf.data perf_v2.data

# Generate differential flame graph (shows changes)
perf script -i perf_v1.data | ~/FlameGraph/stackcollapse-perf.pl > v1.folded
perf script -i perf_v2.data | ~/FlameGraph/stackcollapse-perf.pl > v2.folded
~/FlameGraph/difffolded.pl v1.folded v2.folded | \
~/FlameGraph/flamegraph.pl > diff.svg
# Red = regression, Blue = improvement
```

## Common Use Cases

### Use Case 1: Finding CPU Hotspots

```bash
#!/bin/bash
# Script: find_hotspots.sh
# Purpose: Identify CPU-intensive functions in an application

PROGRAM=$1
DURATION=${2:-30}  # Default 30 seconds

echo "Recording CPU profile for $DURATION seconds..."
perf record -F 99 -g -p $(pgrep -f "$PROGRAM") -- sleep $DURATION

echo "Generating report..."
perf report --stdio --sort=overhead,symbol | head -50

echo "Creating flame graph..."
perf script | ~/FlameGraph/stackcollapse-perf.pl | \
~/FlameGraph/flamegraph.pl > hotspots.svg

echo "Done! Open hotspots.svg in a browser."
```

### Use Case 2: Memory Leak Investigation

```bash
#!/bin/bash
# Script: memory_profile.sh
# Purpose: Track memory allocation patterns

PROGRAM=$1

echo "Tracing memory allocations..."
perf record -e syscalls:sys_enter_mmap,syscalls:sys_enter_brk,\
syscalls:sys_enter_munmap -g "$PROGRAM"

echo "Analyzing allocation patterns..."
perf script | awk '
/sys_enter_mmap/ { mmap_count++; mmap_stack[$0]++ }
/sys_enter_brk/  { brk_count++ }
/sys_enter_munmap/ { munmap_count++ }
END {
    print "mmap calls:", mmap_count
    print "brk calls:", brk_count
    print "munmap calls:", munmap_count
    print "\nMost common mmap call sites:"
    for (s in mmap_stack) print mmap_stack[s], s
}' | sort -rn | head -20
```

### Use Case 3: Database Query Performance

```bash
#!/bin/bash
# Script: profile_database.sh
# Purpose: Profile database server during query execution

DB_PID=$(pgrep -x postgres | head -1)  # Adjust for your database

echo "Profiling database (PID: $DB_PID)..."

# Record while running your workload
perf record -F 99 -g -p $DB_PID &
PERF_PID=$!

# Run your database workload here
echo "Run your queries now. Press Enter when done."
read

kill $PERF_PID
wait $PERF_PID 2>/dev/null

# Analyze
perf report --stdio | head -100
```

### Use Case 4: Web Server Latency Analysis

```bash
#!/bin/bash
# Script: profile_webserver.sh
# Purpose: Analyze web server request handling

SERVER_PID=$(pgrep -x nginx)  # Adjust for your server

# Profile system-wide during load test
sudo perf record -a -g -e cycles,cache-misses &
PERF_PID=$!

# Run load test
echo "Running load test..."
ab -n 10000 -c 100 http://localhost/

# Stop profiling
sudo kill $PERF_PID
wait $PERF_PID 2>/dev/null

# Generate flame graph
sudo perf script | ~/FlameGraph/stackcollapse-perf.pl | \
~/FlameGraph/flamegraph.pl --title="Web Server Load Test" > webserver.svg

sudo perf stat report
```

### Use Case 5: Comparing Algorithm Performance

```bash
#!/bin/bash
# Script: compare_algorithms.sh
# Purpose: Compare performance of two implementations

ALGO1=$1
ALGO2=$2

echo "=== Profiling $ALGO1 ==="
perf stat -r 10 -e cycles,instructions,cache-misses,branch-misses \
    ./$ALGO1 2>&1 | tee algo1_stats.txt

echo ""
echo "=== Profiling $ALGO2 ==="
perf stat -r 10 -e cycles,instructions,cache-misses,branch-misses \
    ./$ALGO2 2>&1 | tee algo2_stats.txt

echo ""
echo "=== Summary ==="
echo "$ALGO1:"
grep "cycles\|instructions\|cache-misses\|branch-misses" algo1_stats.txt | head -4
echo ""
echo "$ALGO2:"
grep "cycles\|instructions\|cache-misses\|branch-misses" algo2_stats.txt | head -4
```

### Use Case 6: Container Profiling

```bash
#!/bin/bash
# Script: profile_container.sh
# Purpose: Profile an application running in a Docker container

CONTAINER_NAME=$1

# Get the main process PID in the container
CONTAINER_PID=$(docker inspect --format '{{.State.Pid}}' $CONTAINER_NAME)

echo "Profiling container $CONTAINER_NAME (PID: $CONTAINER_PID)..."

# Profile the container's namespace
sudo perf record -g -p $CONTAINER_PID -- sleep 30

# Generate report
sudo perf report --stdio | head -50

# For flame graph
sudo perf script | ~/FlameGraph/stackcollapse-perf.pl | \
~/FlameGraph/flamegraph.pl --title="Container: $CONTAINER_NAME" > container.svg
```

## Advanced Tips and Tricks

### Reducing Profiling Overhead

```bash
# Use lower sampling frequency for production
perf record -F 49 -g ./my_program  # Instead of default 4000

# Profile specific events only
perf record -e cycles:u ./my_program  # User-space only, less data

# Use hardware counter periods instead of frequency
perf record -c 100000 ./my_program  # Sample every 100,000 events
```

### Profiling Multithreaded Applications

```bash
# Record all threads in a process
perf record -g -s ./multithreaded_app
# -s records per-thread counts

# Report with thread breakdown
perf report --sort=tid,symbol

# Profile specific threads
perf record -g -t <thread_id> ./my_program
```

### Remote Profiling

```bash
# Record on remote server
ssh user@server "perf record -g -o /tmp/perf.data ./my_program"

# Copy data locally for analysis
scp user@server:/tmp/perf.data .

# Analyze locally
perf report -i perf.data
```

### Scripting with perf

```bash
# Create custom perf scripts
perf script -g python > my_analysis.py
# Edit and customize the Python script

# Run custom script
perf script -s my_analysis.py

# Available scripting languages:
# - Python
# - Perl
```

## Troubleshooting Common Issues

### Permission Denied Errors

```bash
# Error: "Permission denied" when running perf
# Solution 1: Run as root
sudo perf record ./my_program

# Solution 2: Adjust paranoid level
echo 0 | sudo tee /proc/sys/kernel/perf_event_paranoid

# Solution 3: Add user to 'perf' group (if available)
sudo usermod -a -G perf $USER
```

### No Symbols in Report

```bash
# Problem: Report shows addresses instead of function names

# Solution 1: Install debug symbols
sudo apt install libc6-dbg  # For glibc symbols
sudo apt install linux-image-$(uname -r)-dbgsym  # For kernel symbols

# Solution 2: Compile with debug info
gcc -g -O2 -o my_program my_program.c

# Solution 3: Keep frame pointers
gcc -fno-omit-frame-pointer -g -O2 -o my_program my_program.c
```

### Missing Events

```bash
# Problem: "not supported" error for some events

# Check available events
perf list

# Virtual machines often have limited PMU support
# Use software events instead
perf stat -e task-clock,page-faults,context-switches ./my_program

# Or request generic events
perf stat -e cpu-clock ./my_program
```

## Conclusion

The `perf` tool is an invaluable resource for understanding and optimizing system performance on Ubuntu. From simple statistics with `perf stat` to detailed flame graph analysis, it provides the visibility needed to identify and resolve performance bottlenecks at every level of the stack.

Key takeaways from this guide:

1. **Start simple**: Use `perf stat` to get an overview before diving deep
2. **Use call graphs**: Always record with `-g` for meaningful stack traces
3. **Visualize with flame graphs**: They make complex profiles easy to understand
4. **Measure before and after**: Quantify the impact of your optimizations
5. **Profile in production-like conditions**: Results may vary with different workloads

Remember that profiling is an iterative process. Start with the highest-impact issues first, and re-profile after each optimization to verify improvements and identify the next bottleneck.

## Monitoring with OneUptime

While `perf` excels at deep system-level analysis, you also need continuous monitoring to catch performance issues before they impact users. **OneUptime** provides comprehensive monitoring capabilities that complement your profiling workflow:

- **Real-time Performance Monitoring**: Track application performance metrics continuously, not just during profiling sessions
- **Automated Alerting**: Get notified immediately when performance degrades, so you know when to start profiling
- **Historical Trending**: Identify gradual performance degradation over time that might not be obvious in point-in-time profiles
- **Infrastructure Monitoring**: Monitor CPU, memory, and I/O across your entire infrastructure
- **APM Integration**: Correlate application-level metrics with system-level performance data

By combining the deep analysis capabilities of `perf` with OneUptime's continuous monitoring, you can proactively identify performance issues, optimize your systems, and ensure excellent user experience. Visit [OneUptime](https://oneuptime.com) to learn more about how it can help you maintain peak system performance.
