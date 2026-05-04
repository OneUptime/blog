# How to Configure MLD Snooping on Switches

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, MLD, Multicast, Switch Configuration, Network

Description: A guide to enabling and configuring MLD snooping on network switches to efficiently forward IPv6 multicast traffic only to ports with active listeners.

## What Is MLD Snooping?

MLD snooping allows a Layer 2 switch to inspect MLD messages and build a table of which switch ports have multicast listeners. Without MLD snooping, the switch floods all IPv6 multicast traffic to every port in the VLAN - wasting bandwidth and CPU on hosts that aren't listening.

With MLD snooping enabled, the switch only forwards multicast traffic to ports that have active listeners, plus the MLD querier (router) port.

## MLD Snooping on Cisco Switches (IOS/IOS-XE)

```cisco
! Enable MLD snooping globally
ipv6 mld snooping

! Enable MLD snooping on a specific VLAN
ipv6 mld snooping vlan 100

! Configure the MLD snooping querier (for networks without a multicast router)
ipv6 mld snooping vlan 100 querier address 2001:db8::1

! Configure the MLD querier version
ipv6 mld snooping vlan 100 querier version 2

! Set MLD report suppression (reduce duplicate reports)
ipv6 mld snooping report-suppression

! Verify MLD snooping status
show ipv6 mld snooping
show ipv6 mld snooping vlan 100
show ipv6 mld snooping groups vlan 100
```

## MLD Snooping on Juniper EX Switches

```juniper
# Configure MLD snooping on a VLAN

set protocols mld-snooping vlan v100 version 2
set protocols mld-snooping vlan v100 interface ge-0/0/1.0 multicast-router-interface

# Enable immediate leave (remove port from group without waiting for timeout)
set protocols mld-snooping vlan v100 interface ge-0/0/2.0 immediate-leave

# Verify configuration
show mld snooping
show mld snooping membership
show mld snooping statistics
```

## MLD Snooping on Linux Bridge

Linux bridges support MLD snooping in the kernel (since kernel 3.14):

```bash
# Check if the Linux bridge has MLD snooping enabled
cat /sys/class/net/br0/bridge/multicast_snooping
# 1 = enabled, 0 = disabled

# Enable MLD snooping on a bridge
ip link set br0 type bridge mcast_snooping 1

# Or via bridge command
bridge link set dev eth1 mcast_flood off  # Don't flood multicast on this port

# Configure MLD querier on the bridge (if no multicast router present)
ip link set br0 type bridge mcast_querier 1

# Set MLD query interval (value is in centiseconds; 12500 = 125 seconds)
ip link set br0 type bridge mcast_query_interval 12500

# Check which multicast groups are tracked
bridge mdb show
# Example:
# dev br0 port eth1 grp ff02::1:ff00:1 permanent
# dev br0 port eth2 grp ff3e::db8:1 temp
```

## MLD Snooping with systemd-networkd

For Linux bridge configurations managed by systemd-networkd. Bridge-wide multicast settings live in the `.netdev` file (the `[Bridge]` section of `.network` files only configures per-port slave settings):

```ini
# /etc/systemd/network/10-bridge.netdev

[NetDev]
Name=br0
Kind=bridge

[Bridge]
MulticastSnooping=yes
MulticastQuerier=yes
```

## Verifying MLD Snooping Operation

```bash
# On a Linux bridge: monitor multicast group table
watch -n 2 'bridge mdb show'

# Capture MLD queries from the switch (Cisco or Linux bridge querier)
# MLD packets carry a Hop-by-Hop Options header (Router Alert) per RFC 2710/3810,
# so the ICMPv6 type byte sits at offset 48, not 40.
tcpdump -i eth0 -n 'icmp6 and ip6[48] == 130'

# Capture host MLD reports
tcpdump -i eth0 -n 'icmp6 and (ip6[48] == 131 or ip6[48] == 143)'

# Check if multicast is being flooded or properly snooped
# Join a multicast group on one host and ping from another
# Only the subscribing host should receive the packets
```

## MLD Snooping and the Querier Role

In a network with a dedicated IPv6 multicast router, the router acts as the MLD querier. If there is no router, the switch must take the querier role:

```cisco
! Cisco: enable snooping querier on VLAN 100
ipv6 mld snooping vlan 100 querier address 2001:db8::switch1

! Verify querier state
show ipv6 mld snooping vlan 100 querier
```

## Common MLD Snooping Issues

**Issue**: Multicast not reaching subscribers (silent drop)
- Cause: MLD snooping enabled but no querier sending queries
- Fix: Enable MLD querier on the switch or ensure a router is present

**Issue**: Multicast flooded to all ports despite snooping
- Cause: No MLD reports from hosts (hosts not sending reports)
- Fix: Verify hosts are joining groups: `ip -6 maddr show`

**Issue**: Multicast stops after host joins (intermittent)
- Cause: MLD membership timeout without re-reports
- Fix: Reduce query interval or check host MLD timers

```bash
# Linux host: check the MLD max source filter limit (global, not per-interface)
sysctl net.ipv6.mld_max_msf

# Check or tune the MLD Querier Robustness Variable
sysctl net.ipv6.mld_qrv

# Note: net.ipv6.conf.<iface>.mc_forwarding is read-only — it is set by an IPv6
# multicast routing daemon (pim6sd, mrouted) via the MRT6_INIT socket option,
# not via sysctl.
```

## Summary

MLD snooping on switches enables efficient IPv6 multicast forwarding by tracking group membership per port. Configure it with `ipv6 mld snooping` on Cisco, `protocols mld-snooping` on Juniper, or via `ip link set br0 type bridge mcast_snooping 1` on Linux bridges. Always ensure a querier (router or switch) is present to send MLD queries; without a querier, group memberships time out and multicast stops being delivered.
