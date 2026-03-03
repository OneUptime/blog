# How to Benchmark Network Performance with iperf3 on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, iperf3, Network, Benchmarking, Performance

Description: Use iperf3 on Ubuntu to measure network throughput, UDP packet loss, jitter, and bandwidth between hosts with TCP and UDP tests and multi-stream scenarios.

---

iperf3 is the standard tool for measuring network bandwidth between two hosts. It runs a client on one machine and a server on another, streams data between them in both directions, and reports throughput, jitter, packet loss, and other metrics. Whether you are testing a new network switch, troubleshooting slow file transfers, or validating your internet connection speed, iperf3 gives you actual measured data.

## Installing iperf3

```bash
# Install iperf3 on Ubuntu (install on both client and server machines)
sudo apt update
sudo apt install iperf3 -y

# Verify installation
iperf3 --version
```

## Basic Architecture

iperf3 requires two hosts:

- **Server**: Runs `iperf3 -s` and listens for connections
- **Client**: Runs `iperf3 -c SERVER_IP` to initiate the test

Both machines must have iperf3 installed.

## Starting the Server

```bash
# Start iperf3 server on default port 5201
iperf3 -s

# Start on a specific port
iperf3 -s -p 5202

# Run server in background (daemon mode)
iperf3 -s -D

# Run server with verbose output
iperf3 -s -V
```

The server listens and reports when clients connect. By default, it accepts one connection at a time.

## Basic TCP Throughput Test

On the client:

```bash
# Run a basic 10-second TCP throughput test
iperf3 -c SERVER_IP

# Specify test duration (30 seconds)
iperf3 -c SERVER_IP -t 30

# Use a non-default port (must match server)
iperf3 -c SERVER_IP -p 5202
```

Sample output:

```text
Connecting to host 192.168.1.100, port 5201
[  5] local 192.168.1.50 port 52432 connected to 192.168.1.100 port 5201
[ ID] Interval           Transfer     Bitrate         Retr  Cwnd
[  5]   0.00-1.00   sec   113 MBytes   949 Mbits/sec    0    595 KBytes
[  5]   1.00-2.00   sec   113 MBytes   948 Mbits/sec    0    595 KBytes
...
[  5]  0.00-10.00  sec  1.10 GBytes   944 Mbits/sec    0             sender
[  5]  0.00-10.04  sec  1.10 GBytes   940 Mbits/sec                  receiver
```

Key fields:
- `Bitrate`: Measured throughput in Mbits/sec
- `Retr`: TCP retransmissions (high values indicate packet loss or congestion)
- `Cwnd`: TCP congestion window size

## Testing in Both Directions

TCP by default tests upload (client to server). Test download too:

```bash
# Test download (server to client) using reverse mode
iperf3 -c SERVER_IP -R

# Test both directions sequentially
iperf3 -c SERVER_IP --bidir
```

## Multi-Stream TCP Tests

A single TCP stream may not saturate a high-bandwidth connection. Use multiple parallel streams:

```bash
# Use 8 parallel TCP streams
iperf3 -c SERVER_IP -P 8

# 4 parallel streams for 30 seconds
iperf3 -c SERVER_IP -P 4 -t 30
```

Multi-stream tests are essential for 10GbE and above, where a single stream can hit CPU limits long before the network is saturated.

## UDP Tests

UDP testing measures packet loss and jitter - critical for VoIP, video conferencing, and gaming:

```bash
# UDP test with default 1Mbps bandwidth
iperf3 -c SERVER_IP -u

# UDP test at 100Mbps target bandwidth
iperf3 -c SERVER_IP -u -b 100M

# UDP test at 1Gbps (for high-speed networks)
iperf3 -c SERVER_IP -u -b 1G

# UDP test for 30 seconds at 500Mbps
iperf3 -c SERVER_IP -u -b 500M -t 30
```

UDP output includes:

```text
[ ID] Interval           Transfer     Bitrate         Jitter    Lost/Total Datagrams
[  5]   0.00-10.00  sec   119 MBytes   100 Mbits/sec   0.098 ms  0/86088 (0%)
```

- `Jitter`: Variance in packet arrival time (ms) - should be under 1ms for voice quality
- `Lost/Total`: Packet loss percentage - even 1% loss is significant for applications

## Changing the TCP Buffer Size

TCP buffer size affects throughput on high-latency connections (like WAN links):

```bash
# Set socket buffer size to 128KB
iperf3 -c SERVER_IP -w 128K

# Test with 8MB buffer (useful for high-bandwidth, high-latency paths)
iperf3 -c SERVER_IP -w 8M
```

The optimal buffer size for a given link is approximately:
`Bandwidth (bytes/sec) * Round-Trip-Time (seconds)`

## Testing Different Network Paths

```bash
# Test via a specific local interface
iperf3 -c SERVER_IP -B 192.168.2.50  # Bind to this local IP

# Test using IPv6
iperf3 -c SERVER_IPV6 -6

# Test through a specific port range (for NAT traversal testing)
iperf3 -c SERVER_IP --cport 5300
```

## JSON Output for Automation

```bash
# Output results as JSON for parsing or logging
iperf3 -c SERVER_IP -J

# Save JSON output to a file
iperf3 -c SERVER_IP -J > /tmp/iperf3_result.json

# Parse with jq
cat /tmp/iperf3_result.json | jq '.end.sum_received.bits_per_second / 1000000'
# Returns Mbps as a number
```

## Running a Comprehensive Network Benchmark

```bash
#!/bin/bash
# network_benchmark.sh - Comprehensive iperf3 benchmark suite

SERVER_IP="${1:?Usage: $0 SERVER_IP}"
DURATION=30
LOG_DIR="/tmp/iperf3_results_$(date +%Y%m%d_%H%M%S)"

mkdir -p "$LOG_DIR"

echo "=== Network Benchmark: $SERVER_IP ==="
echo "Duration: ${DURATION}s per test"
echo "Results: $LOG_DIR"
echo ""

# TCP single stream
echo "1. TCP Single Stream..."
iperf3 -c "$SERVER_IP" -t "$DURATION" -J > "$LOG_DIR/tcp_single.json" 2>&1
bw=$(jq -r '.end.sum_received.bits_per_second / 1000000 | round' "$LOG_DIR/tcp_single.json")
echo "   Throughput: ${bw} Mbps"

# TCP reverse (download)
echo "2. TCP Reverse (Download)..."
iperf3 -c "$SERVER_IP" -t "$DURATION" -R -J > "$LOG_DIR/tcp_reverse.json" 2>&1
bw=$(jq -r '.end.sum_received.bits_per_second / 1000000 | round' "$LOG_DIR/tcp_reverse.json")
echo "   Throughput: ${bw} Mbps"

# TCP 8 parallel streams
echo "3. TCP 8 Parallel Streams..."
iperf3 -c "$SERVER_IP" -t "$DURATION" -P 8 -J > "$LOG_DIR/tcp_parallel.json" 2>&1
bw=$(jq -r '.end.sum_received.bits_per_second / 1000000 | round' "$LOG_DIR/tcp_parallel.json")
echo "   Throughput: ${bw} Mbps"

# UDP at 100Mbps
echo "4. UDP Packet Loss (100Mbps)..."
iperf3 -c "$SERVER_IP" -t "$DURATION" -u -b 100M -J > "$LOG_DIR/udp_100m.json" 2>&1
loss=$(jq -r '.end.sum.lost_percent' "$LOG_DIR/udp_100m.json")
jitter=$(jq -r '.end.sum.jitter_ms' "$LOG_DIR/udp_100m.json")
echo "   Loss: ${loss}%  Jitter: ${jitter}ms"

echo ""
echo "Tests complete. Results in: $LOG_DIR"
```

```bash
chmod +x network_benchmark.sh
./network_benchmark.sh 192.168.1.100
```

## Using iperf3 as a Systemd Service

For a persistent test server:

```bash
sudo nano /etc/systemd/system/iperf3.service
```

```ini
[Unit]
Description=iperf3 Network Performance Test Server
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/iperf3 -s
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable iperf3
sudo systemctl start iperf3

# Allow iperf3 through the firewall
sudo ufw allow 5201/tcp
sudo ufw allow 5201/udp
```

## Interpreting Results

**TCP throughput lower than expected:**
- Check for retransmissions in the output (`Retr` column). High values indicate packet loss or buffer issues.
- Try increasing the TCP window size with `-w`.
- Use multiple parallel streams `-P 4`.

**UDP packet loss:**
- Any loss above 0.1% is significant for voice/video.
- Test with lower target bandwidth to find the loss threshold.
- High jitter (above 20ms) causes audio artifacts in VoIP.

**10GbE not reaching 10Gbps:**
- A single TCP stream rarely saturates 10GbE due to CPU limits. Use `-P 8` or more.
- Enable hardware offloads: `sudo ethtool -K eth0 tso on gso on gro on`.
- Check MTU settings - jumbo frames (9000 MTU) significantly improve 10GbE throughput.

**Results vary run to run:**
- Run tests for 30+ seconds and average multiple runs.
- Check for other traffic on the link with `iftop` or `nload`.

iperf3 is the baseline tool for any network troubleshooting or capacity planning exercise. Measure before you make changes, then measure again to confirm your changes had the expected effect.
