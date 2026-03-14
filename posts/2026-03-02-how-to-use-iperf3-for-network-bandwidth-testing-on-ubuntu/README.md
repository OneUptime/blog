# How to Use iperf3 for Network Bandwidth Testing on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, Iperf3, Bandwidth Testing, Performance

Description: A practical guide to using iperf3 on Ubuntu to measure network throughput, test bidirectional bandwidth, and identify bottlenecks between hosts.

---

When a network feels slow, the first question is usually "how much bandwidth am I actually getting?" Tools like `speedtest-cli` test your internet connection against a remote server, but they don't help you understand throughput between two specific machines in your infrastructure. That's where `iperf3` comes in - it lets you run controlled bandwidth tests between any two hosts you control.

## Installing iperf3

iperf3 is available directly from Ubuntu repositories:

```bash
sudo apt update
sudo apt install iperf3 -y
```

Install iperf3 on both the server and client machines. The same binary handles both roles.

## Basic Server and Client Setup

iperf3 operates in a client-server model. One machine runs in server mode and listens for connections; the other connects as a client and sends traffic.

On the server machine:

```bash
# Start iperf3 server on default port 5201
iperf3 -s

# Run as daemon in the background
iperf3 -s -D

# Specify a custom port
iperf3 -s -p 9000
```

On the client machine:

```bash
# Basic TCP test to the server
iperf3 -c 192.168.1.10

# Test for 30 seconds instead of the default 10
iperf3 -c 192.168.1.10 -t 30
```

## Reading iperf3 Output

A basic test produces output like this:

```text
Connecting to host 192.168.1.10, port 5201
[  5] local 192.168.1.20 port 54321 connected to 192.168.1.10 port 5201
[ ID] Interval           Transfer     Bitrate
[  5]   0.00-1.00   sec  1.10 GBytes  9.44 Gbits/sec
[  5]   1.00-2.00   sec  1.12 GBytes  9.61 Gbits/sec
...
- - - - - - - - - - - - - - - - - - - - - - -
[ ID] Interval           Transfer     Bitrate
[  5]   0.00-10.00  sec  11.1 GBytes  9.54 Gbits/sec          sender
[  5]   0.00-10.00  sec  11.1 GBytes  9.53 Gbits/sec          receiver
```

The "sender" line shows throughput from the client perspective; "receiver" shows from the server perspective. On a 10GbE link, getting 9.5+ Gbits/sec is normal.

## TCP Tests with Parallel Streams

A single TCP stream doesn't always saturate a high-bandwidth link because TCP's congestion window limits per-stream throughput. Use multiple parallel streams for more accurate tests:

```bash
# Run 4 parallel TCP streams
iperf3 -c 192.168.1.10 -P 4

# 8 parallel streams for high-bandwidth testing
iperf3 -c 192.168.1.10 -P 8 -t 30
```

This is essential when testing 10GbE or 25GbE links where a single stream may only show 3-5 Gbits/sec due to single-core limitations.

## UDP Bandwidth Testing

TCP tests measure maximum throughput but UDP tests are better for measuring packet loss and jitter at specific bandwidths - important for VoIP and streaming applications:

```bash
# UDP test targeting 100 Mbps
iperf3 -c 192.168.1.10 -u -b 100M

# UDP test at 1 Gbps
iperf3 -c 192.168.1.10 -u -b 1G -t 30

# UDP test with 1400 byte packets (common for real traffic simulation)
iperf3 -c 192.168.1.10 -u -b 500M -l 1400
```

UDP output includes additional jitter and packet loss statistics:

```text
[ ID] Interval           Transfer     Bitrate         Jitter    Lost/Total Datagrams
[  5]   0.00-10.00  sec   596 MBytes   500 Mbits/sec  0.025 ms  0/427225 (0%)
```

Zero packet loss at 500 Mbps with 0.025ms jitter indicates a healthy path.

## Bidirectional Testing

Test bandwidth in both directions simultaneously:

```bash
# Test both directions simultaneously (requires iperf3 3.7+)
iperf3 -c 192.168.1.10 --bidir

# Reverse test - server sends, client receives
iperf3 -c 192.168.1.10 -R
```

The reverse test (`-R`) is useful when you suspect asymmetric bandwidth limitations, common on WAN links or hosts with separate ingress/egress policing.

## Adjusting TCP Window Size

TCP window size affects throughput, especially over high-latency links. The bandwidth-delay product (BDP) determines the ideal window size:

```bash
# Set TCP window size to 256KB
iperf3 -c 192.168.1.10 -w 256K

# For high latency WAN links (100ms RTT, 1Gbps target)
# BDP = 1Gbps * 100ms = 12.5MB, so set window to at least 12MB
iperf3 -c 192.168.1.10 -w 12M -t 60
```

If you're not hitting expected throughput on a WAN link, try increasing the window size. The default TCP window scaling on Ubuntu handles this automatically for most cases, but explicit tuning helps for high-BDP paths.

## Testing Specific Network Interfaces

When a host has multiple NICs, you can bind iperf3 to a specific interface:

```bash
# Bind to a specific source IP (and thus interface)
iperf3 -c 192.168.1.10 -B 192.168.1.20

# Server bound to specific interface
iperf3 -s -B 192.168.1.10
```

This is useful when testing bonded interfaces, VLAN subinterfaces, or when a host has dedicated storage and management networks.

## JSON Output for Scripting

For automated testing and integration with monitoring systems:

```bash
# Output results as JSON
iperf3 -c 192.168.1.10 -J

# Save results to a file
iperf3 -c 192.168.1.10 -J > bandwidth_results.json

# Extract just the summary bitrate with jq
iperf3 -c 192.168.1.10 -J | jq '.end.sum_received.bits_per_second / 1000000 | floor | tostring + " Mbps"'
```

## Running Automated Bandwidth Tests

A simple wrapper script for periodic bandwidth monitoring:

```bash
#!/bin/bash
# bandwidth-monitor.sh - Test bandwidth and log results

SERVER="192.168.1.10"
PORT=5201
THRESHOLD_MBPS=900  # Alert if below 900 Mbps on a 1GbE link
LOG_FILE="/var/log/bandwidth-tests.log"

# Run test and capture JSON output
RESULT=$(iperf3 -c "$SERVER" -p "$PORT" -t 20 -P 2 -J 2>&1)

if echo "$RESULT" | grep -q '"error"'; then
  echo "$(date): ERROR - Could not connect to $SERVER" >> "$LOG_FILE"
  exit 1
fi

# Extract average bitrate in Mbps
BPS=$(echo "$RESULT" | jq '.end.sum_received.bits_per_second')
MBPS=$(echo "scale=1; $BPS / 1000000" | bc)

echo "$(date): Bandwidth to $SERVER: ${MBPS} Mbps" >> "$LOG_FILE"

# Alert if below threshold
if (( $(echo "$MBPS < $THRESHOLD_MBPS" | bc -l) )); then
  echo "$(date): ALERT - Bandwidth ${MBPS}Mbps below threshold ${THRESHOLD_MBPS}Mbps" >> "$LOG_FILE"
fi
```

## Testing Through Firewalls

If port 5201 is blocked, you can run iperf3 on an allowed port:

```bash
# Server on port 443 (often allowed through firewalls)
iperf3 -s -p 443

# Client connecting on port 443
iperf3 -c remote-server.example.com -p 443
```

Note: Running iperf3 on port 443 doesn't make it use HTTPS - it still uses plain TCP. This only helps bypass simple port-based firewall rules.

## Common Troubleshooting

**Low single-stream throughput on 10GbE:**
```bash
# Try multiple parallel streams
iperf3 -c 192.168.1.10 -P 8
```

**Server doesn't accept connections:**
```bash
# Check if iperf3 is listening
ss -tlnp | grep 5201

# Check firewall
sudo ufw allow 5201/tcp
```

**High packet loss in UDP tests:**
```bash
# Reduce target bandwidth until loss drops to zero
# Then that's your actual sustainable UDP throughput
iperf3 -c 192.168.1.10 -u -b 200M  # Try lower values
```

**Inconsistent results:**
```bash
# Run a longer test to average out burstiness
iperf3 -c 192.168.1.10 -t 60 -P 4

# Check CPU usage during the test - iperf3 is CPU-intensive
top -b -n 1 | head -20
```

## What Results Tell You

- Getting 940+ Mbps on a 1GbE link - near line rate, healthy
- Getting 600-800 Mbps on 1GbE - acceptable, check for duplex mismatch with `ethtool eth0`
- Getting below 500 Mbps on 1GbE - investigate switch ports, cables, and driver settings
- Consistently low UDP bandwidth with high jitter - check for switch buffer issues or QoS misconfiguration

iperf3 is most useful when you have baseline numbers to compare against. Run tests after provisioning new servers and after any network changes to catch regressions immediately rather than waiting for user complaints.
