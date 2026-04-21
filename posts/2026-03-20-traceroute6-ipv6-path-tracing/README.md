# How to Use traceroute6 for IPv6 Path Tracing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Traceroute6, Network Diagnostics, Routing, Troubleshooting, Linux

Description: Use traceroute6 to trace the path IPv6 packets take through the network, diagnose routing issues, and identify where connectivity problems occur.

## Introduction

`traceroute6` sends UDP packets by default, or ICMPv6/TCP packets when selected, with incrementing hop limits to map the path from your host to a destination. Each hop that decrements the limit to zero sends back an ICMPv6 Time Exceeded message, revealing its address. This is essential for diagnosing IPv6 routing issues.

## Basic Usage

```bash
# Trace path to an IPv6 host

traceroute6 2001:4860:4860::8888

# On modern systems using traceroute with -6
traceroute -6 ipv6.google.com

# Using ICMPv6 (may require root/CAP_NET_RAW, useful when UDP is blocked)
sudo traceroute6 -I 2001:4860:4860::8888

# Trace to a hostname (resolves AAAA record)
traceroute6 ipv6.google.com
```

## traceroute6 Options

```bash
# Use ICMP instead of UDP (useful when UDP probes are filtered)
sudo traceroute6 -I 2001:4860:4860::8888

# Set maximum hops (default: 30)
traceroute6 -m 20 ipv6.google.com

# Set initial hop limit
traceroute6 -f 5 ipv6.google.com

# Set packet size
traceroute6 ipv6.google.com 100

# Set number of probes per hop (default: 3)
traceroute6 -q 5 ipv6.google.com

# Don't resolve IP addresses to hostnames (faster)
traceroute6 -n 2001:4860:4860::8888

# Set wait time for response (seconds)
traceroute6 -w 3 ipv6.google.com

# Use TCP traceroute (may require root/CAP_NET_RAW, useful for firewall traversal)
sudo traceroute6 -T -p 80 ipv6.google.com
```

## Interpreting Output

```text
traceroute to ipv6.google.com (2607:f8b0:4004:c1b::65e), 30 hops max, 80 byte packets
 1  2001:db8::1 (2001:db8::1)  0.487 ms  0.421 ms  0.398 ms
 2  2001:db8:1::1 (2001:db8:1::1)  2.1 ms  1.9 ms  2.0 ms
 3  2001:db8:2::1 (2001:db8:2::1)  5.2 ms  5.1 ms  5.0 ms
 4  * * *
 5  2607:f8b0::1 (2607:f8b0::1)  12.4 ms  12.3 ms  12.1 ms
 6  2607:f8b0:4004:c1b::65e (lga34s25-in-x65e.1e100.net)  12.8 ms  12.6 ms  12.5 ms
```

Key interpretation:
- Each numbered line is a hop (router or final host) on the path
- Three timing values are RTT for three probes
- `* * *` = No response before timeout (probe or reply filtered, rate-limited, or ignored)
- High RTT that starts at a hop and continues onward can indicate congestion or long physical distance; a single high intermediate hop can be ICMPv6 rate limiting or control-plane deprioritization

## Diagnosing IPv6 Routing Issues

```bash
#!/bin/bash
# ipv6-traceroute-analysis.sh

TARGET="${1:-2001:4860:4860::8888}"

echo "=== Tracing IPv6 path to $TARGET ==="
traceroute6 -n -q 2 -m 20 "$TARGET" 2>&1

echo ""
echo "=== Checking for routing anomalies ==="

# Count the last hop number printed
HOPS=$(traceroute6 -n -q 1 "$TARGET" 2>/dev/null | awk '/^[[:space:]]*[0-9]+/ {hop=$1} END {print hop+0}')
echo "Last hop printed: $HOPS"

# Compare traces to different targets
echo ""
echo "=== Last hop addresses (first 3 destinations) ==="
for dest in "2001:4860:4860::8888" "2606:4700:4700::1111" "2620:fe::fe"; do
    last_hop=$(traceroute6 -n -q 1 "$dest" 2>/dev/null | tail -1 | awk '{print $2}')
    echo "$dest → last seen: $last_hop"
done
```

## Tracing from a Specific Source Address

```bash
# Replace 2001:db8::10 with a source IPv6 address assigned to your host
sudo traceroute6 -s 2001:db8::10 2001:4860:4860::8888

# Useful when server has multiple IPv6 addresses
# and you want to test a specific one
```

## Comparing IPv4 vs IPv6 Paths

```bash
# Compare paths to the same destination
echo "=== IPv6 path ==="
traceroute6 -n ipv6.google.com 2>&1 | head -15

echo ""
echo "=== IPv4 path ==="
traceroute -4 -n google.com 2>&1 | head -15
```

## Using Scamper's Paris-Style Traceroute for ECMP Paths

Standard traceroute can give inconsistent results with ECMP (Equal-Cost Multi-Path) routing. Scamper supports Paris-style traceroute methods that keep probe flow identifiers consistent:

```bash
# Install scamper
sudo apt install -y scamper

# Trace IPv6 path with Paris-style UDP probes
sudo scamper -O text -I "trace -P udp-paris 2001:4860:4860::8888"
```

## Analyzing Results for Common Issues

```bash
# Loop detection: same IP appearing multiple times
traceroute6 -n 2001:4860:4860::8888 2>/dev/null | \
    awk '/^[[:space:]]*[0-9]+/ {print $2}' | sort | uniq -d | grep -v "^\*$"

# Excessive hops (>20 for an internet destination can indicate a loop or misconfiguration)
HOPS=$(traceroute6 -n -m 30 -q 1 2001:4860:4860::8888 2>/dev/null | awk '/^[[:space:]]*[0-9]+/ {hop=$1} END {print hop+0}')
if [ "$HOPS" -gt 20 ]; then
    echo "WARNING: More than 20 hops, possible routing issue"
fi

# Check the first few hops to see where the path leaves your network
traceroute6 -n -q 1 -m 5 2001:4860:4860::8888 2>/dev/null
```

## Conclusion

`traceroute6` is essential for diagnosing IPv6 routing issues, identifying where packets are dropped, and understanding the path through ISP and internet infrastructure. Use `-n` to skip DNS resolution for faster output, `-I` for ICMPv6 mode when UDP is blocked, and `-s` to test specific source addresses. `* * *` at early hops often indicates filtering or rate limiting; at later hops, it may be a router configured to not respond to traceroute probes.
