# How to Profile Network Latency with eBPF on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, eBPF, Networking, Performance, Latency, Linux

Description: Learn how to use eBPF tools and custom programs to profile and analyze network latency on RHEL, identifying bottlenecks at the kernel level.

---

Network latency issues can be notoriously hard to track down. Traditional tools like ping and traceroute show you the surface, but eBPF lets you look inside the kernel itself to see exactly where packets are spending their time. On RHEL, the eBPF ecosystem is mature enough that you can get production-grade latency profiling without writing a single line of C if you use the right tools.

## What eBPF Brings to Latency Profiling

eBPF (extended Berkeley Packet Filter) programs attach to kernel hooks and run safely in a sandboxed virtual machine. For network latency profiling, this means you can timestamp packets at various points in the network stack and calculate exactly how long each stage takes.

```mermaid
graph LR
    A[Packet Arrives at NIC] --> B[Driver / softirq]
    B --> C[tc / XDP Layer]
    C --> D[Netfilter / nftables]
    D --> E[Socket Receive Buffer]
    E --> F[Application read()]
    style A fill:#f9f,stroke:#333
    style F fill:#9f9,stroke:#333
```

Each of those transitions is a place where latency can hide, and eBPF can instrument every one of them.

## Installing the Required Tools

First, install the BCC tools and bpftrace, which give you ready-made eBPF scripts for latency analysis:

```bash
# Install BCC tools - these are pre-built eBPF programs for common tasks
sudo dnf install -y bcc-tools bpftrace

# Verify the kernel supports BTF (BPF Type Format) - needed for CO-RE programs
ls /sys/kernel/btf/vmlinux
# Should exist on RHEL with stock kernels

# Install kernel development headers if you plan to write custom programs
sudo dnf install -y kernel-devel kernel-headers
```

## Profiling TCP Connection Latency

The `tcpconnlat` tool from BCC measures the time it takes for TCP connections to be established. This is your first stop for diagnosing slow connections:

```bash
# Show all TCP connections that take longer than 1 millisecond to establish
# The threshold is in milliseconds
sudo /usr/share/bcc/tools/tcpconnlat 1

# Example output:
# PID    COMM         IP SADDR            DADDR            DPORT LAT(ms)
# 12345  curl         4  10.0.0.5         93.184.216.34    443   23.45
# 12389  python3      4  10.0.0.5         10.0.0.10        5432  0.82
```

This immediately tells you which connections are slow and to which destinations.

## Measuring TCP Retransmit Latency

Retransmissions are a major source of latency spikes. The `tcpretrans` tool catches them in real time:

```bash
# Monitor TCP retransmissions as they happen
sudo /usr/share/bcc/tools/tcpretrans

# Example output:
# TIME     PID   IP LADDR:LPORT   T> RADDR:RPORT     STATE
# 14:23:01 0     4  10.0.0.5:443  R> 10.0.0.20:54312 ESTABLISHED
```

## Using bpftrace for Custom Latency Measurements

When the pre-built tools are not enough, bpftrace lets you write one-liner and short scripts to measure whatever you need:

```bash
# Measure the time packets spend in the TCP receive path
# This traces tcp_rcv_established and shows a histogram of processing time
sudo bpftrace -e '
kprobe:tcp_rcv_established {
    @start[tid] = nsecs;
}

kretprobe:tcp_rcv_established /@start[tid]/ {
    @usecs = hist((nsecs - @start[tid]) / 1000);
    delete(@start[tid]);
}

interval:s:10 { exit(); }
'
```

This gives you a histogram showing how long the kernel spends processing received TCP segments.

## Profiling Socket Read Latency

Sometimes the latency is not in the network but in how long data sits in the socket buffer before the application reads it:

```bash
# Trace time between data arriving at socket and application calling read()
sudo bpftrace -e '
tracepoint:sock:sock_rcv_queue {
    @queued[args->sk] = nsecs;
}

tracepoint:syscalls:sys_enter_read {
    @read_start[tid] = nsecs;
}

tracepoint:syscalls:sys_exit_read /args->ret > 0 && @read_start[tid]/ {
    @read_latency_us = hist((nsecs - @read_start[tid]) / 1000);
    delete(@read_start[tid]);
}

interval:s:30 { exit(); }
'
```

## Tracing Network Stack Latency with biolatency for Comparison

It is useful to compare network latency with storage latency to understand what is really the bottleneck:

```bash
# Run biolatency to see disk I/O latency distribution
# This helps distinguish network-bound from disk-bound applications
sudo /usr/share/bcc/tools/biolatency -D 10 1

# Meanwhile, measure network round-trip times
sudo bpftrace -e '
kprobe:tcp_sendmsg {
    @send_time[tid] = nsecs;
}

kprobe:tcp_rcv_established /@send_time[tid]/ {
    @rtt_us = hist((nsecs - @send_time[tid]) / 1000);
    delete(@send_time[tid]);
}

interval:s:10 { exit(); }
'
```

## Creating a Comprehensive Latency Dashboard Script

Here is a script that combines multiple eBPF measurements into a single report:

```bash
#!/bin/bash
# network-latency-profile.sh
# Runs multiple eBPF probes for 30 seconds and generates a latency report

DURATION=30
OUTPUT_DIR="/tmp/latency-report-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUTPUT_DIR"

echo "Profiling network latency for ${DURATION} seconds..."

# Capture TCP connection latency in the background
sudo timeout "$DURATION" /usr/share/bcc/tools/tcpconnlat 0.1 \
    > "$OUTPUT_DIR/tcp_conn_latency.txt" 2>&1 &

# Capture TCP retransmissions
sudo timeout "$DURATION" /usr/share/bcc/tools/tcpretrans \
    > "$OUTPUT_DIR/tcp_retrans.txt" 2>&1 &

# Capture per-process network latency histogram
sudo timeout "$DURATION" bpftrace -e '
kprobe:tcp_sendmsg { @start[tid] = nsecs; }
kretprobe:tcp_sendmsg /@start[tid]/ {
    @send_latency_us[comm] = hist((nsecs - @start[tid]) / 1000);
    delete(@start[tid]);
}
' > "$OUTPUT_DIR/send_latency.txt" 2>&1 &

# Wait for all probes to finish
wait

echo "Results saved to $OUTPUT_DIR/"
echo ""
echo "=== TCP Connection Latency ==="
head -20 "$OUTPUT_DIR/tcp_conn_latency.txt"
echo ""
echo "=== TCP Retransmissions ==="
head -20 "$OUTPUT_DIR/tcp_retrans.txt"
echo ""
echo "=== Send Latency by Process ==="
cat "$OUTPUT_DIR/send_latency.txt"
```

## Performance Considerations

Running eBPF programs has minimal overhead, but keep a few things in mind:

- **kprobes are more expensive than tracepoints** - prefer tracepoints when available
- **Storing per-packet data in maps can use a lot of memory** - set reasonable map sizes
- **High-frequency probes (like per-packet tracing) add measurable overhead on 10Gbps+ links** - use sampling or filters

```bash
# Check available tracepoints for networking (prefer these over kprobes)
sudo bpftrace -l 'tracepoint:net:*'
sudo bpftrace -l 'tracepoint:tcp:*'
sudo bpftrace -l 'tracepoint:sock:*'
```

## Conclusion

eBPF gives you a level of network latency visibility that was previously only available through kernel patching or invasive packet captures. On RHEL, the tooling is solid and production-ready. Start with the BCC tools for quick wins, then move to bpftrace for custom analysis, and only write full libbpf programs when you need persistent, production monitoring. The key is to measure at the right layer -- often the latency you are looking for is not where you expect it.
