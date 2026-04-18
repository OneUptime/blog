# How to Troubleshoot TCP Throughput Problems Using Window Analysis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TCP, Networking, Throughput, Troubleshooting, Window Analysis, Performance

Description: Systematically troubleshoot slow TCP throughput by analyzing window sizes, retransmissions, and congestion events to identify the specific bottleneck.

## Introduction

TCP throughput problems have multiple possible causes: small windows, packet loss, congestion, MTU mismatches, or application processing delays. Window analysis helps narrow down the cause by examining how the receive window changes during a transfer. This guide walks through a systematic diagnosis process.

## Step 1: Baseline Measurement

```bash
# Measure current throughput (install iperf3 on both ends)

# Server side: iperf3 -s
iperf3 -c 10.20.0.5 -t 30

# Key metrics to note:
# - Sender/receiver bit rate
# - Retr: number of retransmissions
# - Cwnd: congestion window size
# - Send window size

# Example output:
# [ 5] 0.00-30.00 sec  3.27 GBytes  939 Mbits/sec  23   sender
#                                              ^retr^
```

## Step 2: Measure RTT

```bash
# Accurate RTT measurement
ping -c 100 10.20.0.5 | tail -3
# min/avg/max/mdev = 4.2/4.6/5.1/0.2 ms

# During active transfer (should be similar):
# If much higher during transfer: congestion/queue buildup (bufferbloat)
```

## Step 3: Calculate Theoretical Maximum

```bash
# With current window and RTT, what's the maximum possible?
python3 -c "
window = 1048576   # Check from ss output during transfer
rtt = 0.0046       # seconds (4.6ms from ping)
max_bps = (window / rtt) * 8 / 1e6
print(f'Window: {window/1024:.0f} KB, RTT: {rtt*1000:.1f} ms')
print(f'Theoretical max: {max_bps:.1f} Mbps')
"
```

## Step 4: Window Analysis During Transfer

```bash
# Monitor window sizes and retransmissions simultaneously
# Terminal 1: run iperf3
iperf3 -c 10.20.0.5 -t 60 -i 1   # Report every second

# Terminal 2: capture window sizes
tcpdump -i eth0 -n 'tcp and dst 10.20.0.5 and port 5201' -w /tmp/iperf.pcap &
sleep 60
kill %1

# Analyze window progression
tshark -r /tmp/iperf.pcap -T fields \
  -e frame.time_relative \
  -e tcp.window_size_value \
  -e tcp.analysis.retransmission \
  | grep -v "^$" | head -100
```

## Identifying the Bottleneck

```bash
# Pattern 1: Window plateaus at small value (< BDP)
# → Buffer size is the bottleneck
# Fix: increase tcp_rmem max

# Pattern 2: Window grows but retransmissions cause drops
# → Packet loss/congestion is the bottleneck
# Fix: switch to BBR, check for network congestion

# Pattern 3: Window full events frequent
# → Receiver application is slow
# Fix: optimize receiver, add threads, check disk I/O

# Pattern 4: Window grows, then shrinks regularly (sawtooth)
# → Normal CUBIC congestion control behavior
# Fix: switch to BBR for more stable behavior

# Quick diagnostic summary
ss -tin state established "( dst 10.20.0.5 dport = :5201 )" | \
  grep -E "cwnd|ssthresh|rtt|retrans|rcv_space|snd_wnd"
```

## Testing with Explicit Window Sizes

```bash
# Test with different window sizes to isolate the bottleneck
iperf3 -c 10.20.0.5 -t 10 -w 64K    # 64KB window
iperf3 -c 10.20.0.5 -t 10 -w 1M     # 1MB window
iperf3 -c 10.20.0.5 -t 10 -w 8M     # 8MB window

# If throughput increases proportionally with window: buffer is bottleneck
# If throughput plateaus: network/application is bottleneck
```

## Conclusion

TCP throughput analysis follows a clear path: measure baseline, calculate theoretical maximum, compare to actual, and look at window behavior to identify whether buffers, packet loss, or the application is limiting throughput. The ss command and tcpdump provide all the data you need. Once identified, the fix is targeted: buffer tuning for window-limited paths, congestion control changes for lossy networks, or application optimization for processing bottlenecks.
