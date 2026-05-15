# How to Use BCC Tools (eBPF) for Performance Analysis on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, BCC, eBPF, Performance, Tracing, Linux, Monitoring

Description: Learn how to install and use BCC tools on RHEL to perform eBPF-based performance analysis and troubleshooting.

---

BCC (BPF Compiler Collection) provides a set of tools built on eBPF (extended Berkeley Packet Filter) for dynamic tracing and performance analysis. On RHEL, BCC tools let you trace kernel and application events with minimal overhead.

## Prerequisites

- A RHEL system with an active subscription
- Root or sudo access
- Kernel 5.14 or later (included in RHEL 9)

## Installing BCC Tools

Install the BCC tools package:

```bash
sudo dnf install bcc-tools -y
```

The tools are installed in `/usr/share/bcc/tools/`. Add this to your PATH for root shell sessions:

```bash
export PATH=$PATH:/usr/share/bcc/tools
```

## Key BCC Tools

### execsnoop - Trace New Processes

Track every new process execution:

```bash
sudo /usr/share/bcc/tools/execsnoop
```

This shows the command, PID, parent PID, and return value for every `exec()` call.

### opensnoop - Trace File Opens

Monitor file opens system-wide:

```bash
sudo /usr/share/bcc/tools/opensnoop
```

Filter by process name:

```bash
sudo /usr/share/bcc/tools/opensnoop -n httpd
```

### biolatency - Block I/O Latency

Show disk I/O latency as a histogram:

```bash
sudo /usr/share/bcc/tools/biolatency
```

Press Ctrl+C to see the histogram. This helps identify slow disk operations.

### biosnoop - Trace Block I/O

Trace individual disk I/O operations:

```bash
sudo /usr/share/bcc/tools/biosnoop
```

This shows each I/O request with latency, device, and process information.

### tcplife - TCP Connection Tracking

Monitor TCP connections with duration and data transfer:

```bash
sudo /usr/share/bcc/tools/tcplife
```

### tcpconnect - Trace Outbound TCP Connections

Track all outbound TCP connection attempts:

```bash
sudo /usr/share/bcc/tools/tcpconnect
```

### tcpaccept - Trace Inbound TCP Connections

Track all accepted TCP connections:

```bash
sudo /usr/share/bcc/tools/tcpaccept
```

### cachestat - Page Cache Hit/Miss

Monitor page cache hit rates:

```bash
sudo /usr/share/bcc/tools/cachestat
```

### funccount - Count Function Calls

Count kernel function calls matching a pattern:

```bash
sudo /usr/share/bcc/tools/funccount 'tcp_send*'
```

### trace - Dynamic Tracing

Trace a specific kernel function with arguments:

```bash
sudo /usr/share/bcc/tools/trace 'do_sys_open "%s", arg2@user'
```

### hardirqs and softirqs - Interrupt Tracing

Monitor hardware interrupt latency:

```bash
sudo /usr/share/bcc/tools/hardirqs
```

Monitor software interrupt time:

```bash
sudo /usr/share/bcc/tools/softirqs
```

## CPU Analysis Tools

### cpudist - CPU On/Off Time

Show CPU on-time distribution:

```bash
sudo /usr/share/bcc/tools/cpudist
```

### runqlat - Scheduler Run Queue Latency

Show how long tasks wait in the run queue:

```bash
sudo /usr/share/bcc/tools/runqlat
```

High values indicate CPU saturation.

### profile - CPU Profiling

Profile CPU stack traces:

```bash
sudo /usr/share/bcc/tools/profile -f 30
```

This samples stack traces for 30 seconds.

## Memory Analysis Tools

### memleak - Memory Leak Detection

Trace outstanding memory allocations:

```bash
sudo /usr/share/bcc/tools/memleak -p 12345
```

### oomkill - OOM Killer Tracing

Monitor OOM killer events:

```bash
sudo /usr/share/bcc/tools/oomkill
```

## Listing All Available Tools

See all BCC tools:

```bash
ls /usr/share/bcc/tools/
```

Tool-specific examples are available in the `doc` directory:

```bash
less /usr/share/bcc/tools/doc/execsnoop_example.txt
```

Some tools also have RHEL man pages with a `bcc-` prefix:

```bash
man bcc-execsnoop
```

## Conclusion

BCC tools on RHEL provide powerful eBPF-based analysis with minimal overhead. Start with execsnoop, biolatency, and tcplife for a quick system overview. Use the specialized tools to drill down into specific performance issues.
