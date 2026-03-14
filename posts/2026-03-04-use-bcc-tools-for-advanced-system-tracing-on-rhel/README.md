# How to Use bcc Tools for Advanced System Tracing on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, BCC, EBPF, Tracing, Performance

Description: Use BCC (BPF Compiler Collection) tools on RHEL for advanced system tracing, performance analysis, and debugging with pre-built eBPF-based utilities.

---

BCC (BPF Compiler Collection) provides a rich set of pre-built eBPF-based tracing tools for analyzing system performance. These tools cover disk I/O, networking, CPU scheduling, memory allocation, and more, all with minimal overhead.

## Install BCC Tools

```bash
# Install the bcc-tools package
sudo dnf install -y bcc-tools python3-bcc

# The tools are installed in /usr/share/bcc/tools/
ls /usr/share/bcc/tools/
```

## Disk and File I/O Tracing

```bash
# biolatency - histogram of block I/O latency
sudo /usr/share/bcc/tools/biolatency

# biosnoop - trace block I/O with latency per request
sudo /usr/share/bcc/tools/biosnoop

# ext4slower - trace ext4 operations slower than 10ms
sudo /usr/share/bcc/tools/ext4slower 10

# filelife - trace short-lived files (created and deleted)
sudo /usr/share/bcc/tools/filelife

# filetop - top-like display for file reads/writes
sudo /usr/share/bcc/tools/filetop
```

## Network Tracing

```bash
# tcpconnect - trace active TCP connections
sudo /usr/share/bcc/tools/tcpconnect

# tcpaccept - trace passive TCP connections (incoming)
sudo /usr/share/bcc/tools/tcpaccept

# tcpretrans - trace TCP retransmissions
sudo /usr/share/bcc/tools/tcpretrans

# tcplife - trace TCP connections with duration and throughput
sudo /usr/share/bcc/tools/tcplife
```

## CPU and Scheduling

```bash
# execsnoop - trace new process execution
sudo /usr/share/bcc/tools/execsnoop

# runqlat - scheduler run queue latency histogram
sudo /usr/share/bcc/tools/runqlat

# cpudist - on-CPU time per task histogram
sudo /usr/share/bcc/tools/cpudist

# offcputime - summarize time threads spend off-CPU
sudo /usr/share/bcc/tools/offcputime 5
```

## Memory Tracing

```bash
# memleak - trace memory allocations and detect leaks
sudo /usr/share/bcc/tools/memleak -p $(pgrep myapp)

# cachestat - page cache hit/miss statistics
sudo /usr/share/bcc/tools/cachestat

# oomkill - trace OOM killer events
sudo /usr/share/bcc/tools/oomkill
```

## System Call Tracing

```bash
# syscount - count system calls by type
sudo /usr/share/bcc/tools/syscount

# opensnoop - trace open() system calls
sudo /usr/share/bcc/tools/opensnoop

# Trace opens for a specific process
sudo /usr/share/bcc/tools/opensnoop -p 1234

# killsnoop - trace kill() signals
sudo /usr/share/bcc/tools/killsnoop
```

## Function Tracing

```bash
# funccount - count kernel function calls
sudo /usr/share/bcc/tools/funccount 'tcp_*' -i 5

# funclatency - time a kernel function
sudo /usr/share/bcc/tools/funclatency do_sys_open

# trace - general-purpose function tracer
sudo /usr/share/bcc/tools/trace 'do_sys_open "%s", arg2'
```

## Practical Example: Finding Slow Disk I/O

```bash
# Find which processes cause I/O latency over 100ms
sudo /usr/share/bcc/tools/biosnoop | awk '$NF > 100 {print}'

# Get a histogram of I/O sizes
sudo /usr/share/bcc/tools/bitesize
```

BCC tools provide deep visibility into RHEL system behavior with negligible overhead, making them essential for performance analysis and troubleshooting.
