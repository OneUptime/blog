# How to Use perf and SystemTap for Advanced Performance Profiling on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Performance

Description: Step-by-step guide on use perf and systemtap for advanced performance profiling on rhel 9 with practical examples and commands.

---

Advanced performance profiling on RHEL 9 requires tools like perf and SystemTap to identify bottlenecks at the system and application level.

## Install Performance Tools

```bash
sudo dnf install -y perf systemtap systemtap-runtime kernel-debuginfo kernel-devel
```

## Using perf for CPU Profiling

### Record CPU Performance Data

```bash
# Profile the entire system for 30 seconds
sudo perf record -a -g -- sleep 30

# Profile a specific command
sudo perf record -g -- ./my_application

# Profile a running process
sudo perf record -p $(pgrep nginx) -g -- sleep 60
```

### Analyze perf Data

```bash
# View the report
sudo perf report

# Show a text summary
sudo perf report --stdio

# Display call graph
sudo perf report --call-graph
```

### perf stat for Event Counting

```bash
# Count hardware events
sudo perf stat -a -- sleep 10

# Count specific events
sudo perf stat -e cache-misses,cache-references,instructions,cycles -- ./my_app

# Per-CPU statistics
sudo perf stat -a -A -- sleep 5
```

### perf top for Real-Time Monitoring

```bash
# Real-time CPU function profiling
sudo perf top

# Monitor specific events
sudo perf top -e cache-misses
```

## Using SystemTap for Deep Profiling

### Basic SystemTap Scripts

```bash
# List available probe points
stap -l 'kernel.function("*")' | head -20

# Trace system calls
sudo stap -e 'probe syscall.open { printf("%s(%d) opened %s\n", execname(), pid(), argstr) }'
```

### Monitor Disk I/O

```bash
sudo stap -e '
probe vfs.read.return {
  if (bytes_read > 0)
    printf("%s(%d) read %d bytes\n", execname(), pid(), bytes_read)
}'
```

### Track Process Creation

```bash
sudo stap -e '
probe process.create {
  printf("New process: %s(%d) created by %s(%d)\n",
    execname(), pid(), pexecname(), ppid())
}'
```

### Monitor Network Activity

```bash
sudo stap -e '
probe netdev.transmit {
  printf("%s sent %d bytes on %s\n", execname(), length, dev_name)
}'
```

## Combining perf and SystemTap

```bash
# Use perf for high-level profiling
sudo perf record -a -g -- sleep 30
sudo perf report --stdio > /tmp/perf-report.txt

# Use SystemTap for deep dives into specific functions
sudo stap -e '
probe kernel.function("schedule") {
  printf("%s(%d) context switch\n", execname(), pid())
}' -T 10
```

## Flame Graphs

Generate flame graphs from perf data:

```bash
sudo perf record -a -g -- sleep 30
sudo perf script > /tmp/perf.data.txt

# Use flamegraph tools
git clone https://github.com/brendangregg/FlameGraph.git
cd FlameGraph
./stackcollapse-perf.pl /tmp/perf.data.txt | ./flamegraph.pl > flamegraph.svg
```

## Conclusion

perf provides efficient CPU and hardware event profiling, while SystemTap enables deep kernel and application tracing. Use perf for initial analysis and SystemTap for targeted investigation of specific subsystems on RHEL 9.

