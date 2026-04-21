# How to Configure TCP Window Scaling for High-BDP Links

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TCP, Window Scaling, Performance, Linux, Sysctl, High Latency

Description: Learn how TCP window scaling works and how to configure it on Linux to allow large TCP windows needed for high throughput on high-bandwidth-delay product connections.

## What Is the TCP Window Size Problem?

The original TCP specification limited the window size to 65,535 bytes (a 16-bit field). This cap was sufficient for 1980s networks but is entirely inadequate for modern links:

```text
Max throughput = Window Size / RTT
= 65,535 bytes / 0.1 seconds (100ms RTT)
= 655,350 bytes/sec = ~5 Mbps

On a 1 Gbps link with 100ms RTT, TCP is limited to just 5 Mbps!
```

TCP Window Scaling (introduced in RFC 1323 and specified today in RFC 7323) extends the window to up to 1 GiB using a multiplier, solving this problem.

## Step 1: Verify Window Scaling Is Enabled

```bash
# Check if TCP window scaling is enabled (should be 1 by default)

sysctl net.ipv4.tcp_window_scaling

# Expected: net.ipv4.tcp_window_scaling = 1

# TCP timestamps are a separate TCP extension, not a prerequisite for window scaling
sysctl net.ipv4.tcp_timestamps
# Usually: net.ipv4.tcp_timestamps = 1
```

## Step 2: Enable Window Scaling If Not Active

```bash
# Enable window scaling
sudo sysctl -w net.ipv4.tcp_window_scaling=1

# Leave TCP timestamps enabled unless you have a specific reason to disable them
sudo sysctl -w net.ipv4.tcp_timestamps=1

# Make persistent
echo "net.ipv4.tcp_window_scaling = 1
net.ipv4.tcp_timestamps = 1" | sudo tee /etc/sysctl.d/99-tcp-window-scaling.conf
```

## Step 3: Set Maximum TCP Buffer Sizes

Window scaling only helps if the buffers are large enough. Set them to match your link's BDP:

```bash
# Calculate BDP:
# For 10 Gbps link with 100ms RTT:
# BDP = 10Gbps × 100ms = 1,000,000,000 bits = 125,000,000 bytes = 125 MB

# Set buffers to roughly 2× BDP for overhead
# max receive buffer = 256 MiB
sudo sysctl -w net.core.rmem_max=268435456
sudo sysctl -w net.ipv4.tcp_rmem="4096 65536 268435456"

sudo sysctl -w net.core.wmem_max=268435456
sudo sysctl -w net.ipv4.tcp_wmem="4096 65536 268435456"
```

## Step 4: Verify Window Scaling in Network Captures

Capture a TCP handshake to see the window scaling factor in the SYN packet:

```bash
# Capture TCP connection establishment
sudo tcpdump -i any -c 10 -w /tmp/tcp-handshake.pcap 'tcp[tcpflags] & tcp-syn != 0'

# Analyze the SYN packet with tshark
tshark -r /tmp/tcp-handshake.pcap -T fields \
  -e tcp.window_size_value \
  -e tcp.options.wscale.shift

# Example output:
# 65535   7       <- SYN window field is unscaled; scale_shift=7 means later window fields can use a 2^7 multiplier, allowing up to 65535 × 128 = ~8MB
```

## Step 5: Check Window Scale Factor on Connections

```bash
# Show window scaling factor for active TCP connections
ss -tin | grep wscale

# Output example:
# cubic wscale:7,7 rto:200 rtt:1.5/0.5 ato:40 mss:1460 pmtu:1500
#              ^^^
# wscale:7,7 means send and receive scale factors are both 7 (2^7=128)
# Max representable window in either scaled direction = 65535 × 128 = 8.4 MB
```

## Step 6: Test Throughput with Window Scaling

```bash
# Test throughput with iperf3 (long RTT simulation using tc netem)
# Simulate 100ms RTT on the loopback interface for testing
sudo tc qdisc add dev lo root netem delay 50ms

# Run iperf3 on loopback
iperf3 -s -p 5201 &
iperf3 -c 127.0.0.1 -p 5201 -t 30

# Without large windows, throughput will be limited
# After buffer tuning, throughput should approach the link limit

# Clean up
sudo tc qdisc del dev lo root netem
```

## Step 7: Disable Window Scaling (Troubleshooting Only)

Some broken firewalls or middleboxes incorrectly modify or drop packets with window scaling. If you suspect this, you can temporarily disable it:

```bash
# Disable window scaling (USE ONLY FOR DEBUGGING)
sudo sysctl -w net.ipv4.tcp_window_scaling=0

# Confirm basic reachability, then test a TCP connection through the same path
ping -c 3 destination
curl --max-time 10 https://destination

# Re-enable after testing
sudo sysctl -w net.ipv4.tcp_window_scaling=1
```

## Conclusion

TCP window scaling is essential for high throughput on connections with significant latency. Verify it's enabled with `sysctl net.ipv4.tcp_window_scaling`, set large socket buffers to accommodate the Bandwidth-Delay Product, and confirm the scaling factor with `ss -tin | grep wscale`. If window scaling causes issues through certain firewalls, disable it temporarily to diagnose, but enable it for production performance.
