# How to Diagnose Slow Network Performance Using TCP Window Size

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TCP, Networking, Performance, Window Size, tcpdump, Wireshark, Troubleshooting

Description: Learn how to diagnose slow TCP connections by analyzing TCP window size, window scaling, zero-window events, and buffer settings using tcpdump and ss.

---

TCP window size controls how much data can be in flight between sender and receiver without acknowledgment. A misconfigured or under-sized window is one of the most common causes of poor TCP throughput, especially on high-latency or high-bandwidth links. This guide shows how to measure, analyze, and fix TCP window size issues.

---

## Understanding TCP Window Size

The TCP receive window limits how much unacknowledged data the sender can transmit:

```text
Throughput (bytes/sec) = Window Size / Round Trip Time (RTT)

Example:
- Window = 65,535 bytes
- RTT = 100ms
- Max throughput = 65535 / 0.1 = ~655 KB/s (~5.2 Mbps)

With window scaling:
- Window = 4,194,304 bytes (4 MiB)
- RTT = 100ms
- Max throughput = 4,194,304 / 0.1 = ~41.9 MB/s (~335 Mbps)
```

---

## Checking TCP Window Size with ss

```bash
# Show TCP connections with window sizes

ss -tni

# Output includes fields such as:
# wscale:7,7   rcv_space:43690   rcv_ssthresh:87380   snd_wnd:65535

# Show detailed TCP info for active connections
ss -tnip | head -20

# Monitor a specific port
watch -n1 'ss -tni dst :443'
```

---

## Analyzing Window Size with tcpdump

```bash
# Capture TCP traffic and show window sizes
sudo tcpdump -i eth0 -nn tcp and host 10.0.0.1

# With verbose output (shows win= field)
sudo tcpdump -i eth0 -vv tcp and port 8080

# Save to pcap for Wireshark analysis
sudo tcpdump -i eth0 -w /tmp/tcp_capture.pcap tcp and host 10.0.0.1
```

### Reading tcpdump Output

```text
10:00:01.123456 IP 10.0.0.2.54321 > 10.0.0.1.80: Flags [P.], seq 1:1461, ack 1, win 502, length 1460

# win 502 = raw advertised TCP window field; actual window is 502 * 2^shift_count
# only after window scaling is negotiated, and SYN/SYN-ACK windows are never scaled
```

---

## Detecting Zero Window Events

A zero window means the receiver is advertising a window of 0, so the sender must stop sending new data. A Zero Window Probe (ZWP) is a separate probe packet sent by the sender while waiting for the window to reopen:

```bash
# Filter for zero window in tcpdump
sudo tcpdump -i eth0 -vv 'tcp[14:2] = 0'

# In Wireshark filter:
# tcp.window_size == 0
# OR
# tcp.analysis.zero_window
```

### Zero Window Causes

| Cause | Description |
|-------|-------------|
| Slow application | App not reading from socket fast enough |
| Insufficient socket buffers | OS buffer too small |
| High CPU on receiver | Processing delay fills buffer |
| Memory pressure | OS limiting socket memory allocation |

---

## Checking TCP Window Scaling

Window scaling (RFC 7323) extends window size beyond 65535 bytes. Verify it's enabled:

```bash
# Check kernel TCP window scaling setting
sysctl net.ipv4.tcp_window_scaling
# Should be: net.ipv4.tcp_window_scaling = 1

# Enable if disabled
sudo sysctl -w net.ipv4.tcp_window_scaling=1

# Make permanent
echo "net.ipv4.tcp_window_scaling = 1" | sudo tee -a /etc/sysctl.conf
```

---

## Tuning TCP Buffer Sizes

```bash
# View current TCP buffer settings
sysctl net.ipv4.tcp_rmem  # receive min/default/max
sysctl net.ipv4.tcp_wmem  # send min/default/max
sysctl net.ipv4.tcp_mem   # overall memory pages

# Example output:
# net.ipv4.tcp_rmem = 4096 87380 6291456

# Increase buffers for high-BDP links (high bandwidth * high latency)
sudo sysctl -w net.ipv4.tcp_rmem="4096 87380 33554432"
sudo sysctl -w net.ipv4.tcp_wmem="4096 65536 33554432"
sudo sysctl -w net.core.rmem_max=33554432
sudo sysctl -w net.core.wmem_max=33554432
```

---

## Using Wireshark for Window Analysis

Key Wireshark statistics for window size:

1. **Statistics → TCP Stream Graph → Window Scaling** - visualizes window size over time
2. **Statistics → TCP Stream Graph → Throughput** - shows actual throughput
3. Look for: **[TCP ZeroWindow]**, **[TCP Window Full]**, **[TCP Window Update]** annotations

---

## Bandwidth-Delay Product (BDP)

The optimal window size equals the BDP of the link:

```bash
# Measure RTT
ping -c 20 remote.host.com | tail -1
# rtt min/avg/max = 45.123/46.456/48.789 ms

# Calculate BDP
# Link bandwidth = 1 Gbps = 125 MB/s
# RTT = 46 ms = 0.046 s
# BDP = 125,000,000 * 0.046 = ~5.75 MB

# Your TCP window should be at least 5.75 MB for full throughput
```

---

## Quick Diagnostics Script

```bash
#!/bin/bash
echo "=== TCP Window Diagnostics ==="
echo "Window Scaling: $(sysctl -n net.ipv4.tcp_window_scaling)"
echo "Rmem: $(sysctl -n net.ipv4.tcp_rmem)"
echo "Wmem: $(sysctl -n net.ipv4.tcp_wmem)"
echo ""
echo "=== Active TCP Connections with Window Info ==="
ss -tni | grep -A1 "ESTAB" | head -40
echo ""
echo "=== Zero Window packets observed over the next 5s ==="
sudo timeout 5 tcpdump -i any -nn 'tcp[14:2] = 0' 2>/dev/null | head -10
```

---

## Best Practices

1. **Enable TCP window scaling** - essential for any link with BDP > 64KB
2. **Use BBR or CUBIC** congestion control on Linux when appropriate for better congestion control behavior
3. **Set socket buffers** appropriately for your workload
4. **Monitor Zero Window events** - they indicate bottlenecks at the receiver
5. **Capture both sides** of a slow connection to determine if sender or receiver is limiting throughput

---

## Conclusion

TCP window size is a fundamental performance parameter. Diagnose slow connections by checking `ss` output for window values, capturing traffic to find Zero Window events, verifying window scaling is enabled, and tuning kernel TCP buffer sizes to match your network's bandwidth-delay product.

---

*Monitor application and network performance with [OneUptime](https://oneuptime.com) - end-to-end observability with real-time alerting.*
