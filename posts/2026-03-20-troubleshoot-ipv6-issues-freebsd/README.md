# How to Troubleshoot IPv6 Issues on FreeBSD

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, FreeBSD, Troubleshooting, Network Diagnostics, Ping6

Description: A systematic guide to diagnosing and resolving IPv6 connectivity problems on FreeBSD, including address assignment, routing, NDP, and DNS issues.

## Step 1: Check IPv6 Addresses

```bash
# Show all IPv6 addresses on all interfaces

ifconfig -a | grep inet6

# Check a specific interface
ifconfig em0 | grep inet6

# Expected: at minimum a link-local address
# inet6 fe80::1234:5678:9abc:def0%em0 prefixlen 64 scopeid 0x1

# If no link-local: IPv6 may be disabled on this interface
# or automatic link-local configuration may be disabled
# Fix: enable IPv6 in rc.conf
```

## Step 2: Test Basic Connectivity

```bash
# Test loopback
ping6 ::1

# Test link-local gateway (requires %em0 zone ID)
ping6 fe80::1%em0

# Test global IPv6 connectivity
ping6 -c 4 2001:4860:4860::8888

# Test with DNS (tests both IPv6 and DNS)
ping6 ipv6.google.com
```

## Step 3: Check Routing

```bash
# View IPv6 routing table
netstat -rn -f inet6

# Check for default route
netstat -rn -f inet6 | grep default
# Expected: default   fe80::1%em0   UG   em0

# If no default route, add manually
route -6 add default fe80::1%em0

# Or from rc.conf:
echo 'ipv6_defaultrouter="fe80::1%em0"' >> /etc/rc.conf
service routing restart
```

## Step 4: Check NDP (Neighbor Discovery)

```bash
# Show NDP table (IPv6 equivalent of ARP)
ndp -a

# Look for gateway in NDP table
ndp -an | grep 'fe80::1'

# If gateway is not in NDP table, trigger neighbor discovery
ping6 -c 1 fe80::1%em0

# Capture NDP traffic to diagnose
tcpdump -i em0 -n icmp6
# Look for NS (type 135) and NA (type 136) messages
```

## Step 5: Diagnose SLAAC Issues

```bash
# Check if rtsold is running
service rtsold status
pgrep rtsold

# Start rtsold once if not enabled in rc.conf
service rtsold onestart

# Check if RAs are being received
tcpdump -i em0 -n 'icmp6 and ip6[40] == 134'
# Type 134 = Router Advertisement

# Send manual RS to solicit RA
rtsol -D em0

# Check kernel sysctl for RA acceptance
sysctl net.inet6.ip6.accept_rtadv
# This controls the default; the active setting is per-interface
# Check per-interface:
ifconfig em0 | grep -i accept_rtadv
```

## Step 6: Check Firewall (pf/ipfw)

```bash
# Check if pf is blocking IPv6
pfctl -s rules | grep -Ei 'inet6|ipv6|icmp6'

# Check if essential ICMPv6 is allowed
# NDP requires type 135, 136 to pass
tcpdump -i em0 icmp6   # Monitor ICMPv6 traffic

# If ipfw is running
ipfw list | grep -Ei 'ipv6|icmp6'
```

## Common Issues and Fixes

```bash
# Issue: No IPv6 address at all
# Check: Is IPv6 enabled on the interface?
ifconfig em0 | grep -Ei 'inet6|IFDISABLED|AUTO_LINKLOCAL'
# Fix: Enable in rc.conf and restart network
echo 'ifconfig_em0_ipv6="inet6 accept_rtadv"' >> /etc/rc.conf
service netif restart em0

# Issue: Global address missing (only link-local)
# Check: Is the router sending RAs?
tcpdump -i em0 -n 'icmp6 and (ip6[40] == 133 or ip6[40] == 134)'

# Issue: IPv6 present but no connectivity
# Check: Default route exists?
netstat -rn -f inet6 | grep default

# Issue: Connectivity works but DNS fails for AAAA records
# Check: DNS server configured?
cat /etc/resolv.conf | grep nameserver
# Fix: Add IPv6-capable DNS
echo 'nameserver 2001:4860:4860::8888' >> /etc/resolv.conf
```

## Summary

Troubleshoot FreeBSD IPv6 in order: (1) check `ifconfig -a | grep inet6` for addresses, (2) `ping6 ::1` for loopback, (3) `ping6 fe80::1%em0` for gateway, (4) `ping6 2001:4860:4860::8888` for external, (5) `netstat -rn -f inet6 | grep default` for routing. For SLAAC issues, check `rtsold` status and capture RAs with `tcpdump`. NDP issues visible with `ndp -an` and ICMPv6 captures.
