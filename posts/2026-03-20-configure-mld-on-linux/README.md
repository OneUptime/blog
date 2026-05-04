# How to Configure MLD on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, MLD, Multicast, Linux, Network Configuration

Description: Learn how to configure MLD (Multicast Listener Discovery) on Linux, manage multicast group memberships, and tune MLD parameters using sysctl and ip commands.

## MLD on Linux Overview

Linux supports MLD (both v1 and v2) natively in the kernel. The kernel automatically handles:
- Sending MLD reports when a socket joins a multicast group
- Responding to MLD queries from routers
- Maintaining multicast group membership state

You typically don't configure MLD directly - it runs automatically. However, you can tune its behavior and monitor its state.

## Viewing Current MLD State

```bash
# View all multicast groups the system has joined

ip -6 maddr show

# View groups on a specific interface
ip -6 maddr show dev eth0

# Example output:
# 3:   eth0
#     inet6 ff02::1 users 3 flags permanent
#     inet6 ff02::1:ff00:1 users 1 flags permanent
#     inet6 ff02::2 users 2 flags permanent  (if forwarding is enabled)
```

## Joining a Multicast Group Manually

To make Linux join a multicast group (useful for testing MLD behavior):

```python
#!/usr/bin/env python3
# join_mcast.py - Join an IPv6 multicast group on a specific interface

import socket
import struct
import time

def join_ipv6_multicast(group_addr, interface):
    """Join an IPv6 multicast group"""
    sock = socket.socket(socket.AF_INET6, socket.SOCK_DGRAM)

    # Get interface index
    ifindex = socket.if_nametoindex(interface)

    # IPv6 multicast membership structure (struct ipv6_mreq)
    # group_addr (16 bytes) + interface_index (4 bytes)
    group_bytes = socket.inet_pton(socket.AF_INET6, group_addr)
    mreq = group_bytes + struct.pack('I', ifindex)

    # Join the multicast group
    sock.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_JOIN_GROUP, mreq)
    print(f"Joined {group_addr} on {interface} (index {ifindex})")

    # Keep the socket open so membership persists
    # The membership is removed when the socket is closed
    try:
        time.sleep(300)  # Stay joined for 5 minutes
    except KeyboardInterrupt:
        print("Leaving group...")
    finally:
        sock.close()

join_ipv6_multicast('ff3e::1', 'eth0')
```

## Tuning MLD via sysctl

```bash
# View all MLD-related sysctl parameters for eth0
sysctl -a 2>/dev/null | grep 'ipv6.conf.eth0'

# Force a specific MLD version
# 0 = auto (default, use v2)
# 1 = force v1
# 2 = force v2
sysctl -w net.ipv6.conf.eth0.force_mld_version=2

# Disable MLD on a specific interface (e.g., WAN interface)
# Not directly supported, but can be achieved with ip6tables to drop MLD

# Set multicast socket buffer size
sysctl -w net.core.rmem_max=26214400
sysctl -w net.core.wmem_max=26214400
```

## Enabling IPv6 Multicast Routing

For Linux to act as a multicast router (forward multicast between interfaces), the kernel multicast routing module must be loaded:

```bash
# Load the IPv6 multicast routing module
modprobe ip6_mr

# Verify it's loaded
lsmod | grep ip6_mr

# Enable IPv6 forwarding (required for multicast routing)
sysctl -w net.ipv6.conf.all.forwarding=1

# Note: net.ipv6.conf.*.mc_forwarding is read-only - the kernel sets it
# automatically when a multicast routing daemon (e.g., smcroute, pim6sd)
# opens an MRT6_INIT socket on AF_INET6/SOCK_RAW.
```

## Installing and Configuring smcroute

`smcroute` is a simple static multicast routing daemon for Linux:

```bash
# Install smcroute
apt install smcroute

# Configure static multicast routes
# /etc/smcroute.conf
cat > /etc/smcroute.conf << 'EOF'
# Forward multicast from eth0 to eth1 and eth2
mroute from eth0 group ff3e::db8:1 to eth1 eth2

# Forward all multicast from a source
mroute from eth0 source 2001:db8::1 group ff3e::db8:2 to eth1
EOF

# Start smcroute
systemctl start smcroute

# Verify routes (smcroutectl is the client used to query the running daemon)
smcroutectl show routes
```

## Using ip mroute for Dynamic Multicast Routing

```bash
# Show the IPv6 multicast routing table
ip -6 mroute show

# Show multicast interface table (VIFs) and cache via procfs
cat /proc/net/ip6_mr_vif
cat /proc/net/ip6_mr_cache
```

## Monitoring MLD with tcpdump

```bash
# Capture all MLD messages on eth0
# Note: MLD packets carry an IPv6 Hop-by-Hop Router Alert option, so use
# icmp6[icmptype] rather than a fixed ip6[40] offset to read the ICMPv6 type.
tcpdump -i eth0 -n 'icmp6 and (icmp6[icmptype] == 130 or icmp6[icmptype] == 131 or icmp6[icmptype] == 132 or icmp6[icmptype] == 143)'

# Verbose MLD query capture
tcpdump -i eth0 -vvn 'icmp6 and icmp6[icmptype] == 130'

# Watch for MLD membership changes (v1 reports and v2 reports)
tcpdump -i eth0 -n 'icmp6 and (icmp6[icmptype] == 131 or icmp6[icmptype] == 143)' -l | \
    while read line; do echo "$(date): $line"; done
```

## Testing MLD Reports

```bash
# Trigger an MLD report by joining a group and pinging it
# On the test host:
python3 join_mcast.py &  # runs join_mcast.py from above

# On another host or router, send traffic to the group
ping6 ff3e::1%eth0

# Capture the MLD report on the switch/router interface
tcpdump -i eth0 -n -vv 'icmp6 and icmp6[icmptype] == 143'
```

## Summary

Linux handles MLD automatically for any multicast group a socket joins. Use `ip -6 maddr show` to view current group memberships. Tune MLD version with `net.ipv6.conf.<iface>.force_mld_version`. For multicast routing, load `ip6_mr` and use `smcroute` for static routing or deploy a full PIM daemon. Monitor MLD messages with `tcpdump -n 'icmp6 and icmp6[icmptype] == 130'`.
