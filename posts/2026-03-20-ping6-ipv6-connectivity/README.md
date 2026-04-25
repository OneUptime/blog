# How to Use ping6 for IPv6 Connectivity Testing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Ping6, Connectivity Testing, Network Diagnostics, Linux, Troubleshooting

Description: Use ping6 (and ping -6) to test IPv6 connectivity, diagnose network reachability, and interpret ICMPv6 responses for IPv6 troubleshooting.

## Introduction

`ping6` (or, on modern Linux, `ping -6`) sends ICMPv6 Echo Request packets to test IPv6 connectivity. It is the first tool to reach for when diagnosing IPv6 network issues, validating that a host is reachable, and measuring round-trip latency over IPv6.

## Basic Usage

```bash
# Ping an IPv6 address

ping6 2001:db8::1

# On modern Linux, use ping with -6 flag
ping -6 2001:db8::1

# Ping by hostname (uses AAAA record)
ping6 ipv6.google.com

# Ping IPv6 loopback
ping6 ::1
```

## Ping Options

```bash
# Send a specific number of pings
ping6 -c 4 2001:db8::1

# Set packet size (data payload)
ping6 -s 1200 2001:db8::1

# Set hop limit (TTL equivalent)
ping6 -t 5 2001:db8::1

# Set interval between pings (seconds)
ping6 -i 0.5 2001:db8::1

# Flood ping (requires root) - for performance testing
sudo ping6 -f -c 1000 2001:db8::1

# Verbose output
ping6 -v 2001:db8::1
```

## Pinging Link-Local Addresses

Link-local addresses often require specifying the interface or scope ID:

```bash
# Using % notation for scope ID
ping6 fe80::1%eth0

# Using -I flag to specify interface
ping6 -I eth0 fe80::1

# List your link-local addresses first
ip -6 addr show scope link | grep inet6

# Ping a neighbor's link-local address
# Find neighbors with Neighbor Discovery
ip -6 neigh show | grep "REACHABLE"
```

## Interpreting ping6 Output

```bash
# Successful output
PING ipv6.google.com (2a00:1450:4009:c04::64) 56 data bytes
64 bytes from 2a00:1450:4009:c04::64: icmp_seq=1 ttl=114 time=6.3 ms
64 bytes from 2a00:1450:4009:c04::64: icmp_seq=2 ttl=114 time=6.1 ms

--- ipv6.google.com ping statistics ---
2 packets transmitted, 2 received, 0% packet loss, time 1001ms
rtt min/avg/max/mdev = 6.1/6.2/6.3/0.1 ms
```

Key fields:
- `ttl`: Remaining hop limit shown by Linux `ping`; the initial value depends on the sender and is decremented at each hop
- `time`: Round-trip time in milliseconds
- `icmp_seq`: Sequence number (gaps indicate lost packets)

## Common Error Messages and Causes

```bash
# "Network is unreachable"
ping6 2001:db8::1
# PING 2001:db8::1(2001:db8::1) 56 data bytes
# connect: Network is unreachable
# → No IPv6 default route. Check: ip -6 route show default

# "Destination unreachable: Address unreachable"
# → The destination address could not be reached, often due to neighbor resolution failure or another link-specific problem

# "Destination unreachable: No route"
# → No IPv6 route to the destination

# "Name or service not known"
ping6 ipv6.example.com
# → No AAAA record was found, or DNS resolution failed

# No response (timeout)
# → Firewall blocking ICMPv6, or host is down
```

## Diagnosing IPv6 Connectivity Issues

```bash
#!/bin/bash
# ipv6-connectivity-check.sh

echo "=== IPv6 Connectivity Diagnostics ==="

# 1. Check IPv6 is configured
echo -n "IPv6 configured: "
ip -6 addr show scope global | grep -q "inet6" && echo "YES" || echo "NO"

# 2. Check default route
DEFAULT_ROUTE=$(ip -6 route show default | head -1)
echo -n "Default IPv6 route: "
[ -n "$DEFAULT_ROUTE" ] && echo "$DEFAULT_ROUTE" || echo "NONE"

# 3. Ping loopback
echo -n "IPv6 loopback: "
ping6 -c 1 -W 1 ::1 &>/dev/null && echo "OK" || echo "FAIL"

# 4. Ping link-local gateway
GATEWAY=$(awk '/^default/ {for (i=1; i<=NF; i++) if ($i=="via") {print $(i+1); exit}}' <<<"$DEFAULT_ROUTE")
IFACE=$(awk '/^default/ {for (i=1; i<=NF; i++) if ($i=="dev") {print $(i+1); exit}}' <<<"$DEFAULT_ROUTE")
if [ -n "$GATEWAY" ] && [ -n "$IFACE" ]; then
    echo -n "Gateway $GATEWAY: "
    ping6 -c 1 -W 2 "$GATEWAY%$IFACE" &>/dev/null && echo "OK" || echo "FAIL"
fi

# 5. Ping internet IPv6
echo -n "Google IPv6 (2001:4860:4860::8888): "
ping6 -c 1 -W 3 2001:4860:4860::8888 &>/dev/null && echo "OK" || echo "FAIL"

# 6. Hostname resolution and IPv6 reachability
echo -n "Hostname resolves and responds over IPv6: "
ping6 -c 1 -W 3 ipv6.google.com &>/dev/null && echo "OK" || echo "FAIL"
```

## Using ping6 to Test Path MTU

```bash
# Test with different payload sizes to estimate path MTU
# ping6 -s sets ICMPv6 payload size; 1452 bytes of payload is 1500 bytes on the wire
for size in 1400 1420 1440 1452 1453; do
    result=$(ping6 -c 1 -s $size -M probe 2001:db8::1 2>&1)
    if echo "$result" | grep -q "1 received"; then
        echo "Payload $size: OK"
    else
        echo "Payload $size: TOO BIG or LOST"
    fi
done
```

## Conclusion

`ping6` (or `ping -6`) is the foundation of IPv6 connectivity testing. Use `-c` for fixed packet counts, `-I interface` for link-local pings, and interpret the `ttl` field as the remaining hop limit reported in the reply. When ping6 fails with "Network is unreachable," check the IPv6 default route with `ip -6 route show default` before investigating further.
