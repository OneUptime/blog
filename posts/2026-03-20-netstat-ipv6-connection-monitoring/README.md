# How to Use netstat for IPv6 Connection Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, netstat, Connection Monitoring, Network Diagnostics, Linux

Description: Use netstat to monitor IPv6 TCP and UDP connections, view listening services, and check routing table entries for IPv6 on Linux and macOS.

## Introduction

`netstat` is the traditional tool for displaying network connections, routing tables, and interface statistics. While `ss` is now preferred on Linux, `netstat` remains widely used and is the primary tool on macOS. The `-6` flag (Linux) or protocol-specific options filter output to IPv6 connections.

## Basic IPv6 netstat Commands

```bash
# Show all IPv6 TCP connections (Linux)

netstat -t6

# Show all IPv6 connections with numeric addresses
netstat -tn6

# Show IPv6 listening sockets
netstat -tln6

# Show IPv6 UDP sockets
netstat -un6

# Show all IPv6 sockets
netstat -an6 | grep ":::"

# Show IPv6 with process names (requires root on Linux)
sudo netstat -tnlp6

# macOS: Show IPv6 connections
netstat -f inet6
```

## Reading netstat IPv6 Output

```text
Active Internet connections (servers and established)
Proto  Recv-Q  Send-Q  Local Address          Foreign Address  State
tcp6        0       0  :::22                  :::*             LISTEN
tcp6        0       0  :::80                  :::*             LISTEN
tcp6        0       0  :::443                 :::*             LISTEN
tcp6        0       0  ::1:25                 :::*             LISTEN
tcp6        0  114688  2001:db8::1:443        2001:db8::100:52100  ESTABLISHED
udp6        0       0  :::53                  :::*
```

Address notation:
- `:::22` - listening on all IPv6 addresses, port 22
- `::1:25` - listening on IPv6 loopback, port 25
- `2001:db8::1:443` - established connection on specific IPv6 address

## IPv6 Routing Table

```bash
# Show IPv6 routing table (Linux)
netstat -r6

# Show IPv6 routing table with numeric addresses
netstat -rn6

# macOS IPv6 routing table
netstat -rn -f inet6

# Show only IPv6 routes
netstat -rn6 | grep -v "^lo\|^Kernel\|^Destination"
```

Example output:
```text
Destination    Gateway    Flags  Netif  Expire
::/0           fe80::1    UG     eth0
::1            ::1        UH     lo0
2001:db8::/64  link#2     U      eth0
fe80::/10      link#2     U      eth0
ff00::/8       link#2     U      eth0
```

## Monitoring IPv6 Interface Statistics

```bash
# Show interface statistics including IPv6
netstat -i6

# Verbose interface statistics
netstat -s6  # IPv6 protocol statistics

# Show packets per interface
netstat -in6

# macOS: IPv6 stats per interface
netstat -I en0 -s -f inet6
```

## Script: IPv6 Connection Report

```bash
#!/bin/bash
# ipv6-netstat-report.sh

echo "=== IPv6 Connection Report ==="
echo "Time: $(date)"

echo ""
echo "--- Listening IPv6 Services ---"
if command -v ss &>/dev/null; then
    # Prefer ss on Linux
    ss -tlnp6 2>/dev/null | grep -v "^Netid"
else
    # Fall back to netstat
    netstat -tln6 2>/dev/null | grep ":::"
fi

echo ""
echo "--- Active IPv6 Connections ---"
if command -v ss &>/dev/null; then
    ss -tn6 state established 2>/dev/null
else
    netstat -tn6 2>/dev/null | grep ESTABLISHED
fi

echo ""
echo "--- IPv6 Routing Table ---"
if command -v ip &>/dev/null; then
    ip -6 route show
else
    netstat -rn -f inet6 2>/dev/null || netstat -rn6 2>/dev/null
fi

echo ""
echo "--- IPv6 Protocol Statistics ---"
netstat -s6 2>/dev/null | grep -A 20 "^Ip6:"
```

## macOS IPv6 Monitoring

```bash
# macOS: all IPv6 connections
netstat -f inet6

# macOS: IPv6 listening sockets
netstat -anf inet6 | grep LISTEN

# macOS: IPv6 routing table
netstat -rn -f inet6

# macOS: IPv6 interface stats
netstat -I en0 -f inet6
```

## Conclusion

`netstat -t6`, `-u6`, and `-rn6` provide IPv6 connection, UDP socket, and routing information on Linux. On macOS, use `netstat -f inet6`. While Linux users should prefer `ss` for better performance and features, `netstat` remains valuable for its portability and familiarity. Use `netstat -s6` for IPv6 protocol-level statistics including packet counts, errors, and fragmentation data.
