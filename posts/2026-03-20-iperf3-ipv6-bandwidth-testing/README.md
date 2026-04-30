# How to Use iperf3 for IPv6 Bandwidth Testing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, iperf3, Bandwidth Testing, Network Performance, Network Diagnostics

Description: Test IPv6 network bandwidth and throughput using iperf3 with TCP and UDP modes, including server setup, client commands, and interpreting results.

## Introduction

`iperf3` is the standard tool for measuring network bandwidth between two hosts. It supports IPv6 natively, and the `-6` flag forces the use of IPv6. IPv6 bandwidth testing helps verify that your network infrastructure performs as expected over IPv6, identify any throughput differences between IPv4 and IPv6 paths, and validate QoS policies.

## Setting Up iperf3 Server

```bash
# Start iperf3 server on the default listen address and port

iperf3 -s

# Start server bound to a specific IPv6 address
iperf3 -s -B 2001:db8::1

# Start server on a specific port
iperf3 -s -p 5202

# Start server in daemon mode
iperf3 -s -D

# Start server with JSON output
iperf3 -s --json

# Server bound to IPv6 loopback (for local testing)
iperf3 -s -B ::1
```

## Running IPv6 Bandwidth Tests

```bash
# Basic TCP test over IPv6
iperf3 -c 2001:db8::1 -6

# TCP test to a hostname (uses AAAA record)
iperf3 -c ipv6.example.com -6

# 30-second test
iperf3 -c 2001:db8::1 -6 -t 30

# Multiple parallel streams (simulate real traffic)
iperf3 -c 2001:db8::1 -6 -P 4

# Reverse test (server sends, client receives)
iperf3 -c 2001:db8::1 -6 -R

# Bidirectional test
iperf3 -c 2001:db8::1 -6 --bidir
```

## UDP Tests Over IPv6

```bash
# UDP bandwidth test (1 Gbps target)
iperf3 -c 2001:db8::1 -6 -u -b 1G

# UDP test for jitter/packet loss measurement
iperf3 -c 2001:db8::1 -6 -u -b 100M -t 30

# Small UDP packets (latency-sensitive applications)
iperf3 -c 2001:db8::1 -6 -u -b 10M -l 100

# Large UDP packets (throughput test)
iperf3 -c 2001:db8::1 -6 -u -b 1G -l 8192
```

## Understanding iperf3 Output

```text
Connecting to host 2001:db8::1, port 5201
[  5] local 2001:db8::100 port 52100 connected to 2001:db8::1 port 5201
[ ID] Interval           Transfer     Bitrate         Retr  Cwnd
[  5]   0.00-1.00   sec   113 MBytes   948 Mbits/sec    0    419 KBytes
[  5]   1.00-2.00   sec   112 MBytes   940 Mbits/sec    0    419 KBytes
...
- - - - - - - - - - - - - - - - - - - - - - - -
[ ID] Interval           Transfer     Bitrate         Retr
[  5]   0.00-10.00  sec  1.10 GBytes   943 Mbits/sec    0   sender
[  5]   0.00-10.04  sec  1.09 GBytes   937 Mbits/sec        receiver
```

Key metrics:
- **Bitrate**: Achieved throughput in Mbits/sec
- **Retr**: TCP retransmissions (high = network issues)
- **Cwnd**: TCP congestion window size
- For UDP: also shows **Jitter** and **Lost/Total Datagrams**

## Comparing IPv4 vs IPv6 Performance

```bash
#!/bin/bash
# compare-ipv4-ipv6-bandwidth.sh

SERVER_IPV4="192.168.1.1"
SERVER_IPV6="2001:db8::1"
DURATION=10

echo "=== IPv4 vs IPv6 Bandwidth Comparison ==="

echo ""
echo "IPv4 TCP test:"
iperf3 -c "$SERVER_IPV4" -t $DURATION --json 2>/dev/null | \
    python3 -c "
import json, sys
d = json.load(sys.stdin)
bps = d['end']['sum_sent']['bits_per_second']
print(f'  Throughput: {bps/1e6:.1f} Mbits/sec')
print(f'  Retransmits: {d[\"end\"][\"sum_sent\"][\"retransmits\"]}')
"

echo ""
echo "IPv6 TCP test:"
iperf3 -c "$SERVER_IPV6" -6 -t $DURATION --json 2>/dev/null | \
    python3 -c "
import json, sys
d = json.load(sys.stdin)
bps = d['end']['sum_sent']['bits_per_second']
print(f'  Throughput: {bps/1e6:.1f} Mbits/sec')
print(f'  Retransmits: {d[\"end\"][\"sum_sent\"][\"retransmits\"]}')
"
```

## MTU and Jumbo Frame Testing

```bash
# TCP test with an MSS that fits a 1500-byte IPv6 path MTU
iperf3 -c 2001:db8::1 -6 -M 1440

# TCP test with an MSS that fits a 9000-byte IPv6 jumbo-frame path MTU
iperf3 -c 2001:db8::1 -6 -M 8940

# Zero-copy mode for maximum performance
iperf3 -c 2001:db8::1 -6 -Z
```

## Conclusion

`iperf3` with the `-6` flag provides accurate IPv6 bandwidth measurement. Run TCP tests to measure throughput and retransmissions, UDP tests to measure jitter and packet loss. Always compare IPv4 and IPv6 results on the same path - significant differences indicate IPv6-specific network issues such as MTU mismatches, different routing paths, or hardware offload problems.
