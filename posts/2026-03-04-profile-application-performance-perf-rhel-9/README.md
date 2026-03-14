# How to Profile Application Performance with perf on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Perf, Performance, Profiling, Linux, Debugging

Description: Learn how to use the perf tool on RHEL to profile application performance and identify CPU bottlenecks.

---

The `perf` tool is a powerful performance profiling utility included in the Linux kernel. On RHEL, perf provides hardware performance counters, tracepoints, and software events for profiling applications and the kernel.

## Prerequisites

- A RHEL system with an active subscription
- Root or sudo access
- A workload to profile

## Installing perf

Install perf:

```bash
sudo dnf install perf -y
```

Verify the installation:

```bash
perf version
```

## Basic CPU Profiling

Profile the entire system for 10 seconds:

```bash
sudo perf record -ag -- sleep 10
```

- `-a` profiles all CPUs
- `-g` records call graphs (stack traces)

Profile a specific command:

```bash
perf record -g -- ./my-application
```

Profile a running process by PID:

```bash
sudo perf record -g -p 12345 -- sleep 30
```

## Viewing Profiling Results

View the recorded profile interactively:

```bash
perf report
```

This opens an interactive TUI showing functions sorted by CPU time.

Generate a text report:

```bash
perf report --stdio
```

Show only the top 20 functions:

```bash
perf report --stdio --sort comm,dso,symbol | head -40
```

## Using perf stat for Summary Statistics

Get a quick summary of performance counters:

```bash
perf stat ./my-application
```

This shows instructions, cycles, cache misses, branches, and IPC (instructions per cycle).

Count specific events:

```bash
perf stat -e cycles,instructions,cache-misses,branch-misses ./my-application
```

Profile system-wide for 10 seconds:

```bash
sudo perf stat -a -- sleep 10
```

## Using perf top for Real-Time Profiling

Monitor the system in real time:

```bash
sudo perf top
```

This shows functions using the most CPU in real time, similar to `top` but at the function level.

Filter by process:

```bash
sudo perf top -p 12345
```

## Recording Call Graphs

Record with frame pointer call graphs:

```bash
perf record -g --call-graph fp -- ./my-application
```

For applications compiled without frame pointers, use DWARF:

```bash
perf record -g --call-graph dwarf -- ./my-application
```

Or use LBR (Last Branch Record) on supported hardware:

```bash
perf record -g --call-graph lbr -- ./my-application
```

## Listing Available Events

View all available hardware and software events:

```bash
perf list
```

List hardware events:

```bash
perf list hw
```

List software events:

```bash
perf list sw
```

List tracepoints:

```bash
perf list tracepoint
```

## Annotating Source Code

If your application has debug symbols, view annotated source:

```bash
perf annotate
```

This shows assembly and source code with per-line CPU time.

Install debug symbols for system libraries:

```bash
sudo dnf install --enablerepo=*debug* kernel-debuginfo
```

## Generating Flame Graphs

Record data and generate a flame graph:

```bash
sudo perf record -ag -- sleep 30
sudo perf script > /tmp/perf.data.txt
```

Use Brendan Gregg's FlameGraph tools:

```bash
git clone https://github.com/brendangregg/FlameGraph.git /tmp/FlameGraph
/tmp/FlameGraph/stackcollapse-perf.pl /tmp/perf.data.txt | /tmp/FlameGraph/flamegraph.pl > /tmp/flamegraph.svg
```

Open the SVG in a browser for an interactive flame graph.

## Conclusion

The perf tool on RHEL is indispensable for understanding CPU performance. Use `perf stat` for quick summaries, `perf record` and `perf report` for detailed profiling, and `perf top` for real-time monitoring. Combine with flame graphs for visual analysis of performance bottlenecks.
