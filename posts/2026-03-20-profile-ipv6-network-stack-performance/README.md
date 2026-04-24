# How to Profile IPv6 Network Stack Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Profiling, Linux, Perf, eBPF, Networking, Performance

Description: Profile the Linux IPv6 network stack using perf, eBPF/bpftrace, and kernel tracepoints to identify bottlenecks in packet processing pipelines.

## Introduction

When IPv6 throughput or latency is unexpectedly poor, profiling the kernel network stack reveals where CPU time is spent. Tools like `perf`, `bpftrace`, and `ss` provide deep visibility into packet processing paths.

## Step 1: Measure Overall Network Stack CPU Usage

```bash
# Profile system-wide CPU hotspots for 10 seconds during a network load

sudo timeout 10s perf top -a -g

# Or use perf stat to count events
sudo perf stat -e \
  net:net_dev_xmit,net:netif_receive_skb,\
  napi:napi_poll,skb:kfree_skb \
  -a -- sleep 5
```

## Step 2: Trace IPv6 Packet Processing with perf

```bash
# Record a performance profile during an iperf3 IPv6 test
sudo perf record -a -g -F 99 -- sleep 30 &
iperf3 -6 -c 2001:db8::1 -t 25 -P 4
wait

# Generate a flame graph
sudo perf script | \
  stackcollapse-perf.pl | \
  flamegraph.pl > ipv6_flamegraph.svg

# Top functions in the IPv6 receive path
sudo perf report --stdio --sort comm,dso,sym | \
  grep -E "ipv6_rcv|ip6_|tcp_v6|napi|ixgbe"
```

## Step 3: Trace IPv6 Drops with kernel tracepoints

```bash
# Install bpftrace (Ubuntu/Debian)
sudo apt-get install bpftrace

# Trace IPv6 packet drops in real time
sudo bpftrace -e '
tracepoint:skb:kfree_skb /args->protocol == 0x86DD/ {
    @drops[kstack] = count();
}
interval:s:5 {
    print(@drops);
    clear(@drops);
}'
```

## Step 4: Monitor Socket-Level Performance

```bash
# Show per-socket IPv6 statistics with extended info
ss -6 -t -i -o -e

# Key fields to watch:
# rtt: average RTT
# cwnd: congestion window size
# timer:(..., ..., retrans): active timer and retransmission count
# rcv_space: TCP receive-buffer autotuning helper value

# Show all IPv6 TCP sockets with queue depths
ss -6 -t -n -H | awk '{print $1, $2, $3, $4, $5}'
# Columns: state, recv-Q, send-Q, local, peer
```

## Step 5: Use eBPF to Profile IPv6 Receive-Handler Latency

```python
#!/usr/bin/env python3
# ipv6_rx_latency.py - measure time spent in the IPv6 receive handler

import time
from bcc import BPF

bpf_program = r"""
#include <uapi/linux/ptrace.h>

BPF_HASH(start, u64, u64);
BPF_HISTOGRAM(rx_latency_us);

int trace_ipv6_rcv_entry(struct pt_regs *ctx) {
    u64 pid_tgid = bpf_get_current_pid_tgid();
    u64 ts = bpf_ktime_get_ns();
    start.update(&pid_tgid, &ts);
    return 0;
}

int trace_ipv6_rcv_return(struct pt_regs *ctx) {
    u64 pid_tgid = bpf_get_current_pid_tgid();
    u64 *tsp = start.lookup(&pid_tgid);
    if (!tsp)
        return 0;

    u64 delta_us = (bpf_ktime_get_ns() - *tsp) / 1000;
    rx_latency_us.increment(delta_us ? bpf_log2l(delta_us) : 0);
    start.delete(&pid_tgid);
    return 0;
}
"""

b = BPF(text=bpf_program)
b.attach_kprobe(event="ipv6_rcv", fn_name="trace_ipv6_rcv_entry")
b.attach_kretprobe(event="ipv6_rcv", fn_name="trace_ipv6_rcv_return")

print("Tracing IPv6 receive-handler latency... Ctrl-C to stop")
try:
    time.sleep(30)
except KeyboardInterrupt:
    pass

print("\nIPv6 receive-handler latency histogram (microseconds):")
b["rx_latency_us"].print_log2_hist("usec")
```

## Step 6: Profile Retransmission Causes

```bash
# Check TCP retransmission statistics
netstat -s | grep -i "retransmit\|segment"

# Trace retransmission events with bpftrace
sudo bpftrace -e '
tracepoint:tcp:tcp_retransmit_skb {
    @[comm] = count();
}
END { print(@); }'

# Monitor dropped packets at the NIC level
ethtool -S eth0 | grep -i "drop\|miss\|error"
```

## Conclusion

IPv6 network stack profiling combines `perf` flame graphs for CPU hotspots, `bpftrace` for kernel-level event tracing, and `ss` for socket-level visibility. Identifying whether bottlenecks are in the NIC driver, softirq processing, or socket receive path guides targeted optimization. Feed profiling results into OneUptime dashboards to correlate stack performance with application-level latency.
