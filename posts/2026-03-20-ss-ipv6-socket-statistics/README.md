# How to Use ss Command for IPv6 Socket Statistics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, ss, Socket Statistics, Linux, Network Diagnostics, Connection Monitoring

Description: Use the ss command to display IPv6 socket statistics, monitor active IPv6 connections, find listening services, and diagnose connection issues on Linux.

## Introduction

`ss` (socket statistics) is the modern replacement for `netstat` on Linux systems. It displays TCP, UDP, and Unix domain socket information with faster performance and more detailed output. For IPv6, `ss` shows active connections, listening ports, and socket states with full IPv6 address support.

## Basic IPv6 Socket Commands

```bash
# Show active IPv6 TCP connections

ss -t6

# Show IPv6 TCP listening sockets
ss -tl6

# Show all IPv6 UDP sockets
ss -ua6

# Show all IPv6 TCP and UDP sockets, including listening sockets
ss -tua6

# Show IPv6 TCP sockets with process information
ss -tp6

# Show IPv6 TCP sockets with numeric addresses (no DNS resolution)
ss -tn6

# Show IPv6 TCP listening sockets with process names
ss -tlnp6
```

## Filtering IPv6 Connections

```bash
# Show IPv6 TCP connections on port 443
ss -tn6 'dport == :443 or sport == :443'

# Show IPv6 connections to a specific address
ss -tn6 dst '[2001:db8::1]'

# Show IPv6 connections from a specific source
ss -tn6 src '[2001:db8::100]'

# Show only ESTABLISHED IPv6 connections
ss -tn6 state established

# Show only TIME_WAIT IPv6 connections
ss -tn6 state time-wait

# Show only SYN_RECV (connections being established)
ss -tn6 state syn-recv

# Show all non-established states
ss -tn6 state all exclude established
```

## Understanding ss Output for IPv6

```text
Netid  State   Recv-Q  Send-Q  Local Address:Port  Peer Address:Port
tcp    ESTAB   0       0       [2001:db8::1]:443   [2001:db8::100]:52340
tcp    LISTEN  0       128     [::]:22             [::]:*
tcp    LISTEN  0       128     [::1]:25            [::]:*
udp    UNCONN  0       0       [::]:53             [::]:*
```

Key fields:
- `[::]:22` - listening on all IPv6 addresses (wildcard)
- `[::1]:25` - listening on IPv6 loopback only
- `[2001:db8::1]:443` - connected from specific global IPv6 address
- `Recv-Q` / `Send-Q` - queued receive/send bytes for established sockets; for LISTEN sockets, current and maximum backlog counts

## Monitoring IPv6 Service Ports

```bash
# Find what's listening on IPv6 port 80
ss -tlnp6 'sport == :80'

# Check if nginx/apache is listening on IPv6
ss -tlnp6 | grep ':80\|:443'

# Show all TCP and UDP services listening on IPv6
ss -tulnp6

# Show listening on specific IPv6 address
ss -tlnp6 src '[2001:db8::1]'

# Find IPv6 connections to remote port 25 (outbound SMTP)
ss -tn6 'dport == :25'
```

## Script: IPv6 Connection Summary

```bash
#!/bin/bash
# ipv6-connection-summary.sh

echo "=== IPv6 Socket Summary ==="

echo ""
echo "Listening services (IPv6):"
ss -tulnp6 | grep -v "^Netid" | awk '{
    gsub(/\[/, "", $5); gsub(/\]/, "", $5)
    split($5, a, ":")
    port = a[length(a)]
    addr = $5; sub(":"port"$", "", addr)
    printf "  Port %-6s  Address: %s\n", port, addr
}' | sort -k2 -n | uniq

echo ""
echo "Active IPv6 TCP connections: $(ss -tn6 state established | grep -c ESTAB)"
echo "IPv6 TIME_WAIT connections: $(ss -tn6 state time-wait | grep -c TIME-WAIT)"

echo ""
echo "Top 5 destination addresses (IPv6):"
ss -tn6 state established | awk 'NR>1 {print $6}' | \
    sed 's/\[//;s/\]:[0-9]*//' | \
    sort | uniq -c | sort -rn | head -5
```

## Checking Dual-Stack Socket Behavior

```bash
# Check if a service is listening on both IPv4 and IPv6
# A socket on [::] with IPV6_V6ONLY=0 accepts IPv4 too
ss -tlnp | grep ':80'
# If you see both [::]:80 and 0.0.0.0:80 → separate sockets
# If you see only [::]:80 → may be dual-stack (IPV6_V6ONLY=0)

# Check via /proc
cat /proc/net/tcp6  # Raw IPv6 TCP socket table (deprecated; prefer ss for normal use)
```

## Conclusion

`ss -t6`, `ss -ua6`, and `ss -tl6` are the essential commands for IPv6 socket monitoring on Linux. The `-6` flag restricts output to IPv6 sockets, `-n` prevents DNS resolution, and `-p` shows the owning process. Filter expressions like `'dport == :443'` and `state established` narrow results to exactly what you need. Use `ss` instead of `netstat` for better performance and more detailed socket information.
