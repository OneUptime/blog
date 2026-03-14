# How to Use BCC Tools (eBPF) for Performance Analysis on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, BCC, EBPF, Performance, Tracing, Linux, Monitoring

Description: Learn how to install and use BCC tools on RHEL to perform eBPF-based performance analysis and troubleshooting.

---

BCC (BPF Compiler Collection) provides a set of tools built on eBPF (extended Berkeley Packet Filter) for dynamic tracing and performance analysis. On RHEL, BCC tools let you trace kernel and application events with minimal overhead.

## Prerequisites

- A RHEL system with an active subscription
- Root or sudo access
- Kernel 5.14 or later (included in RHEL)

## Installing BCC Tools

Install the BCC tools package:

```bash
sudo dnf install bcc-tools -y
```

The tools are installed in `/usr/share/bcc/tools/`. Add this to your PATH:

```bash
export PATH=$PATH:/usr/share/bcc/tools
```

## Key BCC Tools

### execsnoop - Trace New Processes

Track every new process execution:

```bash
sudo execsnoop
```

This shows the command, PID, parent PID, and return value for every `exec()` call.

### opensnoop - Trace File Opens

Monitor file opens system-wide:

```bash
sudo opensnoop
```

Filter by process name:

```bash
sudo opensnoop -n httpd
```

### biolatency - Block I/O Latency

Show disk I/O latency as a histogram:

```bash
sudo biolatency
```

Press Ctrl+C to see the histogram. This helps identify slow disk operations.

### biosnoop - Trace Block I/O

Trace individual disk I/O operations:

```bash
sudo biosnoop
```

This shows each I/O request with latency, device, and process information.

### tcplife - TCP Connection Tracking

Monitor TCP connections with duration and data transfer:

```bash
sudo tcplife
```

### tcpconnect - Trace Outbound TCP Connections

Track all outbound TCP connection attempts:

```bash
sudo tcpconnect
```

### tcpaccept - Trace Inbound TCP Connections

Track all accepted TCP connections:

```bash
sudo tcpaccept
```

### cachestat - Page Cache Hit/Miss

Monitor page cache hit rates:

```bash
sudo cachestat
```

### funccount - Count Function Calls

Count kernel function calls matching a pattern:

```bash
sudo funccount 'tcp_send*'
```

### trace - Dynamic Tracing

Trace a specific kernel function with arguments:

```bash
sudo trace 'do_sys_open "%s", arg2'
```

### hardirqs and softirqs - Interrupt Tracing

Monitor hardware interrupt latency:

```bash
sudo hardirqs
```

Monitor software interrupt time:

```bash
sudo softirqs
```

## CPU Analysis Tools

### cpudist - CPU On/Off Time

Show CPU on-time distribution:

```bash
sudo cpudist
```

### runqlat - Scheduler Run Queue Latency

Show how long tasks wait in the run queue:

```bash
sudo runqlat
```

High values indicate CPU saturation.

### profile - CPU Profiling

Profile CPU stack traces:

```bash
sudo profile -f 30
```

This samples stack traces for 30 seconds.

## Memory Analysis Tools

### memleak - Memory Leak Detection

Trace outstanding memory allocations:

```bash
sudo memleak -p 12345
```

### oomkill - OOM Killer Tracing

Monitor OOM killer events:

```bash
sudo oomkill
```

## Listing All Available Tools

See all BCC tools:

```bash
ls /usr/share/bcc/tools/
```

Each tool has a man page:

```bash
man execsnoop-bpfcc
```

## Conclusion

BCC tools on RHEL provide powerful eBPF-based analysis with minimal overhead. Start with execsnoop, biolatency, and tcplife for a quick system overview. Use the specialized tools to drill down into specific performance issues.
