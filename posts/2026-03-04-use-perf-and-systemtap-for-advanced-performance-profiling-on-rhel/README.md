# How to Use perf and SystemTap for Advanced Performance Profiling on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, perf, SystemTap, Performance, Profiling, Linux

Description: Use perf and SystemTap on RHEL to profile CPU usage, trace system calls, and identify performance bottlenecks in applications and the kernel.

---

RHEL provides powerful profiling tools for diagnosing performance issues. `perf` is a hardware-level profiler, while SystemTap allows custom kernel probes without modifying source code.

## Using perf

### Install perf

```bash
# Install perf
sudo dnf install -y perf
```

### CPU Profiling

```bash
# Profile the entire system for 10 seconds
sudo perf record -a -g -- sleep 10

# Generate a report from the recorded data
sudo perf report

# Quick summary of what functions are using the most CPU
sudo perf top
```

### Trace Specific Events

```bash
# Count system calls for a specific process
sudo perf stat -e 'syscalls:*' -p $(pgrep nginx) -- sleep 5

# Record context switches
sudo perf record -e context-switches -a -- sleep 10
sudo perf report

# Count cache misses
sudo perf stat -e cache-misses,cache-references -a -- sleep 5
```

### Flame Graphs

```bash
# Record with call stacks
sudo perf record -a -g -F 99 -- sleep 30

# Export the data for flame graph generation
sudo perf script > perf.data.txt

# Use Brendan Gregg's FlameGraph tools
git clone https://github.com/brendangregg/FlameGraph.git
./FlameGraph/stackcollapse-perf.pl perf.data.txt | \
  ./FlameGraph/flamegraph.pl > flamegraph.svg
```

## Using SystemTap

### Install SystemTap

```bash
# Install SystemTap and kernel debug info
sudo dnf install -y systemtap systemtap-runtime
sudo dnf debuginfo-install -y kernel-$(uname -r)

# Test the installation
sudo stap -e 'probe begin { printf("SystemTap works\n"); exit() }'
```

### Trace Disk I/O

```bash
# Trace block I/O with latency
sudo stap -e '
probe ioblock.request {
  printf("%s %s %d sectors on %s\n",
    execname(), bio_rw_str(rw), size, devname)
}
' -T 10
```

### Trace System Calls by Process

```bash
# Count system calls made by a specific process
sudo stap -e '
probe syscall.* {
  if (pid() == target())
    printf("%s(%s)\n", name, argstr)
}
' -x $(pgrep myapp) -T 5
```

### Monitor File Opens

```bash
# Watch which files are being opened
sudo stap -e '
probe syscall.openat {
  printf("%s[%d] opened %s\n", execname(), pid(), filename)
}
' -T 10
```

Start with `perf` for general profiling. Use SystemTap when you need custom probes or detailed tracing of specific kernel or application behavior.
