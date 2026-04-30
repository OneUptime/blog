# How to Use ip -6 Commands for IPv6 Troubleshooting

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, ip command, Linux, Network Troubleshooting, Routing, Interface Management

Description: Use the Linux ip command with the -6 flag to diagnose IPv6 address configuration, routing tables, neighbor discovery, and interface status issues.

## Introduction

The `ip` command is the modern replacement for `ifconfig`, `route`, and `arp` on Linux. The `-6` flag restricts output and operations to IPv6. Mastering `ip -6` commands is fundamental for IPv6 network troubleshooting on Linux systems.

## IPv6 Address Management

```bash
# Show all IPv6 addresses on all interfaces

ip -6 addr show

# Show only global scope addresses (excludes link-local, loopback)
ip -6 addr show scope global

# Show addresses on a specific interface
ip -6 addr show dev eth0

# Show only link-local addresses
ip -6 addr show scope link

# Show addresses with additional details
ip -6 -details addr show

# Show only temporary IPv6 addresses
ip -6 addr show dev eth0 temporary

# Add an IPv6 address manually
sudo ip -6 addr add 2001:db8::10/64 dev eth0

# Delete an IPv6 address
sudo ip -6 addr del 2001:db8::10/64 dev eth0

# Show brief summary
ip -6 -brief addr show
```

## IPv6 Routing Table

```bash
# Show the IPv6 main routing table
ip -6 route show

# Show default route only
ip -6 route show default

# Show routes for a specific prefix
ip -6 route show 2001:db8::/32

# Show route that would be used for a specific destination
ip -6 route get 2001:4860:4860::8888

# Show route lookup for a specific source address
ip -6 route get 2001:4860:4860::8888 from 2001:db8::10

# Add a static route
sudo ip -6 route add 2001:db8:100::/48 via 2001:db8::1

# Add default route
sudo ip -6 route add default via fe80::1 dev eth0

# Delete a route
sudo ip -6 route del 2001:db8:100::/48

# Show cloned routes from the cache table (if any)
ip -6 route show cache

# Show routes from all tables
ip -6 route show table all
```

## IPv6 Neighbor Discovery (replaces ARP)

```bash
# Show the neighbor cache (IPv6 equivalent of ARP table)
ip -6 neigh show

# Show only REACHABLE neighbors
ip -6 neigh show | grep REACHABLE

# Show neighbors on a specific interface
ip -6 neigh show dev eth0

# Add a static neighbor entry
sudo ip -6 neigh add 2001:db8::1 lladdr 52:54:00:ab:cd:ef dev eth0

# Delete a neighbor entry
sudo ip -6 neigh del 2001:db8::1 dev eth0

# Flush all neighbor cache entries on an interface
sudo ip -6 neigh flush dev eth0

# States explained:
# REACHABLE: Recently verified reachable
# STALE: Not recently verified
# DELAY: In delay period before probe
# PROBE: Sending probes to verify
# FAILED: Unreachable
```

## IPv6 Link and Interface Status

```bash
# Show interface status with statistics
ip -6 -s link show

# Show detailed stats for an interface
ip -6 -s link show dev eth0

# Show IPv6 forwarding status
cat /proc/sys/net/ipv6/conf/all/forwarding
cat /proc/sys/net/ipv6/conf/eth0/forwarding

# Enable IPv6 forwarding (make permanent in sysctl.conf)
sudo sysctl -w net.ipv6.conf.all.forwarding=1
```

## Diagnostic Workflow

```bash
#!/bin/bash
# ipv6-diagnostic.sh

INTERFACE="${1:-eth0}"
echo "=== IPv6 Diagnostics for interface: $INTERFACE ==="

echo ""
echo "--- IPv6 Addresses ---"
ip -6 addr show dev "$INTERFACE" 2>/dev/null || echo "No IPv6 on $INTERFACE"

echo ""
echo "--- IPv6 Routes ---"
ip -6 route show dev "$INTERFACE" 2>/dev/null

echo ""
echo "--- Default IPv6 Route ---"
ip -6 route show default

echo ""
echo "--- Neighbor Cache ---"
ip -6 neigh show dev "$INTERFACE" 2>/dev/null

echo ""
echo "--- Route to Google IPv6 ---"
ip -6 route get 2001:4860:4860::8888 2>/dev/null || echo "No route to Google IPv6"

echo ""
echo "--- Interface Statistics ---"
ip -6 -s link show dev "$INTERFACE" 2>/dev/null | grep -A3 "RX\|TX"
```

## Checking IPv6 Configuration Issues

```bash
# Check if IPv6 is disabled on an interface
cat /proc/sys/net/ipv6/conf/eth0/disable_ipv6
# 1 = disabled, 0 = enabled

# Re-enable IPv6 on an interface
sudo sysctl -w net.ipv6.conf.eth0.disable_ipv6=0

# Check accept_ra (Router Advertisement processing)
cat /proc/sys/net/ipv6/conf/eth0/accept_ra
# 0 = do not accept RAs
# 1 = accept RAs if forwarding is disabled
# 2 = accept RAs even if forwarding is enabled

# Check autoconf (SLAAC)
cat /proc/sys/net/ipv6/conf/eth0/autoconf
# 1 = autoconfigure addresses from RA prefix information

# Check privacy extensions (temporary addresses)
cat /proc/sys/net/ipv6/conf/eth0/use_tempaddr
# 0 = no temporary addresses
# 1 = enable temporary addresses but prefer public addresses
# 2 = prefer temporary addresses over public addresses
```

## Monitoring IPv6 Events

```bash
# Watch for IPv6 events in real-time (address additions, route changes)
ip -6 monitor

# Monitor specific events
ip -6 monitor address route neigh

# Watch in background and capture events
ip -6 monitor route >> /tmp/ipv6-route-changes.log &
```

## Conclusion

The `ip -6` command set provides complete visibility into IPv6 address configuration, routing tables, and neighbor discovery. For troubleshooting: check addresses with `ip -6 addr show scope global`, verify default route with `ip -6 route show default`, test routing with `ip -6 route get <destination>`, and inspect the neighbor cache with `ip -6 neigh show`. These four commands answer most IPv6 connectivity questions.
