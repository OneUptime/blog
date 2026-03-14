# How to Use perf for Network Stack Analysis on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Perf, Network Analysis, Performance, Kernel

Description: Learn how to use the Linux perf tool on Ubuntu to profile and analyze network stack performance, identify bottlenecks in packet processing, and measure network-related CPU overhead.

---

`perf` is the Linux kernel's built-in performance analysis tool. It uses hardware performance counters, kernel tracepoints, and software events to profile CPU usage, cache behavior, system calls, and kernel function call paths. For network troubleshooting, `perf` can show you where the CPU is spending time in the network stack, which kernel functions are handling your packets, and whether packet processing is creating bottlenecks. This guide focuses on the network-specific uses of `perf`.

## Prerequisites

- Ubuntu 22.04 or newer
- Root or sudo access
- Kernel headers matching the running kernel

## Installing perf

```bash
# Install perf for the current kernel
sudo apt update
sudo apt install -y linux-tools-common linux-tools-$(uname -r) linux-tools-generic

# Verify installation
perf --version

# If using a low-latency or real-time kernel, install the matching tools:
sudo apt install -y linux-tools-$(uname -r | sed 's/-[a-z]*$//')
```

## Setting Up for Profiling

```bash
# Allow perf to access kernel symbols (improves output readability)
sudo sysctl -w kernel.perf_event_paranoid=-1
sudo sysctl -w kernel.kptr_restrict=0

# Make permanent
echo "kernel.perf_event_paranoid = -1" | sudo tee -a /etc/sysctl.d/99-perf.conf
echo "kernel.kptr_restrict = 0" | sudo tee -a /etc/sysctl.d/99-perf.conf

# Install debug symbols for better stack traces
sudo apt install -y systemtap-sdt-dev

# Install kernel debug symbols (large download)
# sudo apt install -y linux-image-$(uname -r)-dbgsym
```

## Basic perf Commands

```bash
# Collect a performance profile for 10 seconds
sudo perf record -g sleep 10

# View the profile
sudo perf report

# Quick stats for a command
sudo perf stat curl https://example.com

# Live top-like view
sudo perf top
```

## Profiling Network Stack Performance

### Identifying Where CPU Time Goes During Network Activity

```bash
# Profile all network-related activity for 30 seconds while generating traffic
sudo perf record -g -a -F 99 -- sleep 30 &

# Generate network traffic in another terminal
# For HTTP load test:
# ab -n 10000 -c 100 http://localhost/

# After 30 seconds, view the profile
sudo perf report --stdio | head -100

# Filter for network-related functions
sudo perf report --stdio 2>&1 | grep -A 5 "net_rx\|napi\|sk_buff\|tcp_\|ip_"
```

### Profiling a Specific Process

```bash
# Profile network activity for a specific application
# Replace <PID> with the process ID of your application
sudo perf record -g -p <PID> -- sleep 10
sudo perf report

# Or launch the application under perf
sudo perf record -g -- curl -s https://httpbin.org/get > /dev/null
sudo perf report
```

## Using perf stat for Network Metrics

```bash
# Measure system calls and cache performance during network activity
sudo perf stat -e \
  syscalls:sys_enter_sendto,\
  syscalls:sys_enter_recvfrom,\
  syscalls:sys_enter_sendmsg,\
  syscalls:sys_enter_recvmsg,\
  syscalls:sys_enter_connect,\
  syscalls:sys_enter_accept4 \
  -a sleep 10

# Count network interrupt events
sudo perf stat -e irq:irq_handler_entry -a sleep 10

# Full network performance stats while running iperf
iperf3 -c localhost &
sudo perf stat \
  -e cache-misses,cache-references,LLC-load-misses,cycles,instructions \
  -p $(pgrep iperf3) \
  -- sleep 5
```

## Tracing Network Kernel Functions

`perf trace` captures system calls similar to strace but with lower overhead:

```bash
# Trace network system calls with perf trace (lower overhead than strace)
sudo perf trace -e 'net:*' -- curl https://example.com 2>&1 | head -50

# Trace socket operations for a process
sudo perf trace -p <PID> \
  -e '*socket*,*connect*,*send*,*recv*' 2>&1 | head -50

# Trace with timing
sudo perf trace -T -e 'syscalls:sys_enter_sendto,syscalls:sys_exit_sendto' \
  -- nc -w 3 google.com 80 2>&1
```

## Using perf with Tracepoints for Deep Network Analysis

Linux has hundreds of kernel tracepoints for network events:

```bash
# List available network tracepoints
sudo perf list | grep -E "net:|sock:|tcp:|udp:|skb:"

# Common network tracepoints:
# net:net_dev_queue          - packet queued on device
# net:net_dev_xmit           - packet transmitted
# net:netif_receive_skb      - packet received
# net:napi_poll              - NAPI polling
# sock:inet_sock_set_state   - TCP state transitions
# tcp:tcp_retransmit_skb     - TCP retransmissions
# tcp:tcp_probe              - TCP congestion window probe

# Trace packet receive events
sudo perf record -e net:netif_receive_skb -g -a sleep 5
sudo perf report

# Trace TCP retransmissions (useful for diagnosing packet loss)
sudo perf record -e tcp:tcp_retransmit_skb -a sleep 10
sudo perf script
```

## Analyzing TCP State Transitions

```bash
# Trace TCP connection state changes
sudo perf record -e sock:inet_sock_set_state -a sleep 10 &

# Generate some connections
curl https://example.com > /dev/null
curl https://example.com > /dev/null

# Analyze the state transitions
sudo perf script | grep -E "CLOSE|LISTEN|SYN|ESTABLISHED|TIME_WAIT"

# A typical TCP connection shows:
# CLOSED -> SYN_SENT -> ESTABLISHED -> FIN_WAIT1 -> FIN_WAIT2 -> TIME_WAIT -> CLOSED
```

## Measuring Network Interrupt Performance

```bash
# Find the interrupt vector for your network interface
cat /proc/interrupts | grep -E "eth|ens|enp|wlan"

# Profile interrupt handlers
sudo perf top -e irq:irq_handler_entry --sort symbol

# Measure time spent in network IRQ handlers
sudo perf record -e irq:irq_handler_entry,irq:irq_handler_exit \
  -a -g sleep 10
sudo perf report --stdio | grep -A 5 "irq"
```

## Flame Graphs for Network Stack Visualization

Flame graphs provide an intuitive visualization of where time is spent:

```bash
# Install FlameGraph tools
git clone https://github.com/brendangregg/FlameGraph.git /opt/FlameGraph

# Record a profile with stack traces
sudo perf record -F 99 -a -g -- sleep 30 &

# Generate traffic during recording
# curl, ab, or iperf

# Convert to flamegraph
sudo perf script | /opt/FlameGraph/stackcollapse-perf.pl | \
  /opt/FlameGraph/flamegraph.pl > /tmp/flamegraph.svg

# Open in browser
firefox /tmp/flamegraph.svg

# For network-specific flamegraph, filter the input
sudo perf script | /opt/FlameGraph/stackcollapse-perf.pl | \
  grep -E "tcp|net_rx|napi|ip_rcv|xmit|send|recv" | \
  /opt/FlameGraph/flamegraph.pl > /tmp/network-flamegraph.svg
```

## Measuring Network Latency with perf

```bash
# Measure sendto latency distribution
sudo perf record -e syscalls:sys_enter_sendto,syscalls:sys_exit_sendto \
  -a sleep 10
sudo perf script | awk '/sys_enter_sendto/{start=$1} /sys_exit_sendto/{if(start) print ($1-start)*1000000 " us"}'

# For a more complete latency measurement, use the histogram:
sudo perf stat -e syscalls:sys_enter_sendto -I 1000 sleep 30
```

## Analyzing NIC Queue Depths

```bash
# Check for TX/RX queue drops
cat /proc/net/dev | awk 'NR>2{print $1, "rx_drop:"$5, "tx_drop:"$17}'

# Trace packet drops with perf
sudo perf record -e skb:kfree_skb -a -g sleep 5
sudo perf report --stdio | head -30

# kfree_skb events indicate dropped packets
# High counts suggest the NIC queue is full or the kernel is dropping
```

## Practical Network Debugging Workflow

```bash
# Step 1: Get a high-level view of where network time is being spent
sudo perf top --sort comm,symbol

# Step 2: Look for network functions in the output
# Common functions: tcp_sendmsg, ip_finish_output, ksoftirqd, net_rx_action

# Step 3: Record a detailed profile focused on network activity
sudo perf record -g -e 'net:*' -a sleep 30

# Step 4: Generate a report filtered to network calls
sudo perf report --stdio --sort symbol | grep -B2 -A10 "tcp_\|net_\|ip_\|napi"

# Step 5: Identify hotspots and correlate with application metrics
# If tcp_write_xmit is hot, you have high send volume
# If tcp_rcv_established is hot, you have high receive volume
# If napi_poll is hot, you may need to tune interrupt coalescing
```

## Tuning Based on perf Findings

```bash
# If perf shows high time in ksoftirqd (soft interrupt handler):
# Increase ring buffer size
sudo ethtool -G eth0 rx 4096 tx 4096

# If perf shows high interrupt frequency:
# Enable interrupt coalescing
sudo ethtool -C eth0 rx-usecs 100 tx-usecs 100

# If perf shows RSS (Receive Side Scaling) issues:
# Increase the number of RX queues
sudo ethtool -L eth0 combined 4  # Match to CPU count

# Verify current NIC settings
ethtool -l eth0   # Queue counts
ethtool -g eth0   # Ring buffer sizes
ethtool -c eth0   # Interrupt coalescing settings
```

`perf` is a low-overhead tool that can be used safely on production systems when configured correctly. For network troubleshooting, the combination of tracepoints (`net:*`, `tcp:*`), flame graphs, and `perf stat` gives you a complete picture of where your system spends CPU cycles processing network traffic - information that is difficult or impossible to get any other way.
