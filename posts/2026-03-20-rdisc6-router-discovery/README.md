# How to Use rdisc6 for Router Discovery Diagnostics - Router Discovery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Rdisc6, Router Discovery, NDP, Router Advertisement, Network Diagnostics

Description: Use rdisc6 to send Router Solicitation messages and analyze Router Advertisement responses for IPv6 default gateway and prefix configuration diagnostics.

## Introduction

`rdisc6` sends IPv6 Router Solicitation messages and displays the Router Advertisement (RA) responses from routers on the local link. It reveals IPv6 prefixes being advertised, router preferences, MTU settings, and flags that control how hosts configure their IPv6 addresses. This is essential for diagnosing SLAAC and DHCPv6 configuration issues.

## Installation

```bash
# Ubuntu/Debian (part of ndisc6 package)

sudo apt install -y ndisc6

# Fedora / RHEL-compatible distributions (if available in enabled repos)
sudo dnf install -y ndisc6
```

## Basic Usage

```bash
# Send Router Solicitation and display received RA
rdisc6 eth0

# Increase retry count (useful if the first RA is missed)
rdisc6 -r 5 eth0

# Wait longer for RA (milliseconds)
rdisc6 -w 5000 eth0

# Use a specific source IPv6 address
rdisc6 -s fe80::10 eth0

# Verbose output (already the default)
rdisc6 -v eth0
```

## Understanding Router Advertisement Output

```text
Soliciting ff02::2 (ff02::2) on eth0...

Hop limit                 :   64 (      0x40)
Stateful address conf.    :   No
Stateful other conf.      :   No
Mobile home agent         :   No
Router preference         :   medium
Neighbor discovery proxy  :   No
Router lifetime           : 1800 (0x00000708) seconds
Reachable time            : unspecified (0x00000000)
Retransmit time           : unspecified (0x00000000)
 Prefix                   : 2001:db8:cafe::/64
  On-link                 :  Yes
  Autonomous address conf.:  Yes
  Valid time              : 86400 seconds
  Pref. time              : 14400 seconds
 Source link-layer address: 52:54:00:ab:cd:ef
 from fe80::5054:ff:feab:cdef
```

Key fields:
- **Hop limit**: Default IPv6 hop limit hosts should use on the link
- **Stateful address conf.**: `M` flag - if Yes, use DHCPv6 for addresses
- **Stateful other conf.**: `O` flag - if Yes, other configuration is available via DHCPv6
- **Router lifetime**: How long this router is valid as default gateway (0=not a default router)
- **Prefix**: IPv6 prefix for SLAAC address generation
- **Autonomous address conf.**: `A` flag - if Yes, generate address via SLAAC

## Diagnosing SLAAC Issues

```bash
# Check what prefixes are being advertised
rdisc6 eth0 2>/dev/null | grep "Prefix\|Autonomous\|Stateful"

# Expected for SLAAC:
# Prefix: 2001:db8::/64
# Autonomous address conf.: Yes

# If Autonomous = No, that prefix won't be used for SLAAC
# If no prefix is advertised, hosts can't generate global addresses
```

## Diagnosing DHCPv6 Triggers

```bash
# Check M and O flags in Router Advertisement
rdisc6 eth0 2>/dev/null | grep "Stateful"

# M flag = 1 means use DHCPv6 for addresses
# O flag = 1 means other configuration is available via DHCPv6
# If M = 1, the O flag is redundant
# Output:
# Stateful address conf.    :   Yes  → DHCPv6 needed for addresses
# Stateful other conf.      :   Yes  → DHCPv6 available for other config
```

## Capturing and Analyzing All RAs

```bash
# Monitor for all Router Advertisements on the network
sudo tcpdump -n -i eth0 icmp6 and ip6[40] == 134 -v

# Decode the RA fields (134 = RA type)
sudo tcpdump -n -i eth0 icmp6 and ip6[40] == 134 -vvv 2>/dev/null

# With rdisc6, retry up to 5 times and wait longer for replies
rdisc6 -m -r 5 -w 10000 eth0 2>/dev/null
```

## Diagnosing "No Default Route" Issues

```bash
#!/bin/bash
# diagnose-ipv6-gateway.sh

echo "=== IPv6 Router Discovery Diagnostics ==="

# 1. Current default route
echo "Current default route:"
ip -6 route show default

# 2. Discover routers via rdisc6
echo ""
echo "Discovering IPv6 routers..."
RA_OUTPUT=$(rdisc6 -r 2 -w 3000 eth0 2>/dev/null)

if [ -z "$RA_OUTPUT" ]; then
    echo "ERROR: No Router Advertisement received!"
    echo "  - Check if a router is present on the link"
    echo "  - Check if RA guard/filtering is blocking RAs"
    echo "  - Try: sudo ip6tables -L INPUT -n (check for local RA blocking)"
else
    echo "Router Advertisement received!"
    echo "$RA_OUTPUT" | grep -Ei "Prefix|lifetime|Stateful|from"
fi

# 3. Check current RA acceptance settings
echo ""
echo "RA acceptance (accept_ra):"
for iface in $(ls /proc/sys/net/ipv6/conf/ | grep -v "^all$\|^default$\|^lo$"); do
    val=$(cat /proc/sys/net/ipv6/conf/$iface/accept_ra 2>/dev/null)
    echo "  $iface: $val (0=ignore, 1=accept, 2=accept+forwarding)"
done
```

## Checking RA Guard in Network

```bash
# Some switches implement RA Guard which blocks RAs from unauthorized ports
# Test by sending RA from a port that should be guarded:

# Check if RA is blocked by capturing on a different host
# (This requires physical access or a packet capture tool)

# On the same host, check if RAs are being filtered by ip6tables
sudo ip6tables -L FORWARD -n | grep "ICMPv6\|icmpv6"
sudo ip6tables -L INPUT -n | grep "ICMPv6\|icmpv6"

# Check radvd config if this host is expected to advertise RAs
grep -E "IgnoreIfMissing|interface" /etc/radvd.conf 2>/dev/null
```

## Verifying RA-Assigned Addresses Were Created

```bash
# Show prefixes advertised in Router Advertisements
rdisc6 -q eth0 2>/dev/null

# Show global IPv6 addresses currently configured on the interface
ip -6 addr show dev eth0 scope global

# Default routes learned from RA are marked as proto ra
ip -6 route show default proto ra
```

## Conclusion

`rdisc6` is the diagnostic tool for understanding what IPv6 configuration your routers are advertising. Use it to verify that SLAAC prefixes are being distributed, check whether DHCPv6 is required (M/O flags), and diagnose why hosts aren't getting IPv6 default routes (Router lifetime = 0 or no RA received). When hosts have no IPv6 default route, `rdisc6` quickly reveals whether the problem is a misconfigured router or a blocked Router Advertisement.
