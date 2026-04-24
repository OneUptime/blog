# How to Profile Network Performance with perf and Flamegraphs on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Perf, Flamegraph, Linux, Network Performance, Profiling, Kernel

Description: Learn how to use Linux perf and Flamegraph to identify CPU bottlenecks in the network stack, NIC drivers, and application code during high-throughput network workloads.

## Why Profile Network Performance?

When network throughput plateaus below the theoretical maximum, the bottleneck could be:
- The kernel TCP stack consuming excessive CPU
- NIC driver interrupt handling
- Application code that's slow to read/write sockets
- Memory copies in the network path

Linux `perf` captures CPU stack traces at high frequency, and Flamegraphs visualize where time is spent - helping pinpoint the functions contributing most to the bottleneck.

## Step 1: Install Prerequisites

```bash
# Install perf (Linux performance profiler)

sudo apt-get install -y linux-tools-$(uname -r) linux-tools-generic

# Install other required tools
sudo apt-get install -y binutils git iperf3

# Verify perf is working
sudo perf stat -e task-clock -- echo "hello"

# Install Flamegraph scripts
sudo git clone https://github.com/brendangregg/FlameGraph /opt/flamegraph
export PATH=/opt/flamegraph:$PATH
```

## Step 2: Start a Network Workload

Run the network workload you want to profile while capturing:

```bash
# Terminal 1 (remote host): Start iperf3 server
iperf3 -s -p 5201

# Terminal 2 (system being profiled): Start iperf3 client
# Use a non-loopback address so traffic traverses the NIC
iperf3 -c SERVER_IP -p 5201 -t 60 -P 4 &

# Note the iperf3 client PID for targeted profiling
CLIENT_PID=$!
echo "iperf3 client PID: $CLIENT_PID"
```

## Step 3: Capture perf Data

```bash
# System-wide capture for 30 seconds at 99 Hz
# (use 99 Hz instead of 100 Hz to avoid lockstep with timer ticks)
sudo perf record -F 99 -a -g -- sleep 30

# Or capture only the target process
sudo perf record -F 99 -p $CLIENT_PID -g -- sleep 30

# Kernel-only profiling (to find kernel TCP stack bottlenecks)
sudo perf record -F 99 -a -g --all-kernel -- sleep 30

# Verify capture
ls -lh perf.data
```

## Step 4: Generate a Flamegraph

```bash
# Convert perf data to folded stack format
sudo perf script | /opt/flamegraph/stackcollapse-perf.pl --all > /tmp/stacks.folded

# Generate the flamegraph SVG
/opt/flamegraph/flamegraph.pl /tmp/stacks.folded > /tmp/network-flamegraph.svg

# Open in browser
# On desktop: xdg-open /tmp/network-flamegraph.svg
# On server: copy to local machine
scp user@server:/tmp/network-flamegraph.svg .
```

## Step 5: Interpret Network Flamegraphs

Key patterns to look for in a network flamegraph:

```text
Common bottlenecks:

1. Wide "tcp_sendmsg" or "tcp_recvmsg" bars
   → CPU spent in TCP send/receive path
   → Check offload settings, packet size, and syscall rate

2. Wide "ixgbe_poll" or "mlx5_rx" (driver names)
   → NIC driver consuming CPU
   → Inspect RSS configuration, ring sizes, and NIC stats

3. Wide "memcpy" or "copy_user"
   → Memory copies in network path
   → For eligible send-side workloads, consider zero-copy (`sendfile`, `splice`)

4. Wide "skb_copy" or "skb_clone"
   → Socket buffer copies
   → Investigate packet cloning or fan-out in the data path

5. Wide "__napi_poll"
   → NAPI polling overhead
   → Inspect RSS/IRQ affinity, interrupt moderation, and batching settings
```

## Step 6: Profile Specific Network Events

```bash
# Profile network-specific events
# Record receive-path tracepoint activity
sudo perf record -g -e net:netif_receive_skb -a -- sleep 10
sudo perf report --stdio | head -30

# Count common socket I/O system calls in iperf3
sudo perf stat -e syscalls:sys_enter_read,syscalls:sys_enter_write,syscalls:sys_enter_sendmsg,syscalls:sys_enter_recvmsg -p $CLIENT_PID -- sleep 10

# Count context switches and cache misses
sudo perf stat -e context-switches,cache-misses -p $CLIENT_PID -- sleep 10
```

## Step 7: Profile with eBPF (Advanced)

For more targeted analysis with BCC/eBPF tools:

```bash
# Install bcc tools
sudo apt-get install -y bpfcc-tools

# Ubuntu/Debian package installs *-bpfcc command names

# Trace TCP session lifespan
sudo tcplife-bpfcc -p $CLIENT_PID

# Count call stacks reaching tcp_sendmsg
sudo stackcount-bpfcc -p $CLIENT_PID 'tcp_sendmsg'

# CPU stack profile for the target process
sudo profile-bpfcc -p $CLIENT_PID 10
```

## Conclusion

Using `perf record -F 99 -a -g` during a network workload and visualizing with FlameGraph reveals which kernel or application functions consume CPU during network operations. Wide TCP or driver bars show where CPU time is concentrated; from there, check offload settings, RSS/IRQ configuration, ring sizing, and application I/O patterns. This profiling approach is essential for squeezing the last percentages of performance from high-throughput network paths.
