# How to Understand IPv6 Router vs Host Behavior

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Routing, Networking, Sysctl, RFC 4861

Description: Understand the key behavioral differences between IPv6 routers and hosts, including packet forwarding, Router Advertisement handling, and ICMPv6 responses.

## Overview

In IPv6, a node is either a **host** or a **router**. This distinction affects how the node handles packet forwarding, Router Advertisements, and Neighbor Discovery. RFC 4861 and RFC 4862 define these behaviors precisely.

## Key Behavioral Differences

| Behavior | Host | Router |
|----------|------|--------|
| Forward packets between interfaces | No | Yes |
| Send Router Advertisements (RA) | No | Yes |
| Accept Router Advertisements | Yes | No (by default) |
| Send Router Solicitations (RS) | Yes | No (by default) |
| Respond to all-nodes multicast (ff02::1) | Yes | Yes |
| Set net.ipv6.conf.all.forwarding | 0 | 1 |

## Checking Node Behavior on Linux

```bash
# Check if the node is behaving as a router

sysctl net.ipv6.conf.all.forwarding
# 0 = host behavior
# 1 = router behavior

# Check RA acceptance (hosts should accept RA, routers should not)
sysctl net.ipv6.conf.eth0.accept_ra
# 0 = disabled
# 1 = accept RA (default for hosts)
# 2 = accept RA even if forwarding is enabled (for routers needing upstream RA)
```

## Host Behavior

A host:
1. May send a **Router Solicitation** (RS) to `ff02::2` (all-routers) when an interface becomes enabled
2. Receives **Router Advertisements** (RA) and configures:
   - Default gateway (from RA source link-local address)
   - Prefix for SLAAC address generation (from Prefix Information options with the A flag set)
   - Managed flag (M=1 → addresses available via DHCPv6)
   - Other config flag (O=1 → other settings like DNS available via DHCPv6)
3. Does NOT forward packets to other interfaces
4. Does NOT forward packets not addressed to itself

```bash
# On a host: show the default gateway learned from RA
ip -6 route show default
# default via fe80::1 dev eth0 proto ra metric 1024 expires 1800sec
```

## Router Behavior

A router:
1. Periodically sends **Router Advertisements** to `ff02::1` (all-nodes)
2. Does NOT process incoming RA for its own configuration by default
3. Forwards packets between interfaces (when `net.ipv6.conf.all.forwarding=1`)
4. Responds to Neighbor Solicitations for all its addresses

```bash
# On a router: enable forwarding and disable RA acceptance
sudo sysctl -w net.ipv6.conf.all.forwarding=1
sudo sysctl -w net.ipv6.conf.all.accept_ra=0
sudo sysctl -w net.ipv6.conf.default.accept_ra=0

# Exception: WAN interface may need RA to get default route from ISP
sudo sysctl -w net.ipv6.conf.eth0.accept_ra=2
```

## radvd Configuration (Linux Router Advertisement Daemon)

```bash
# /etc/radvd.conf - Basic router advertisement configuration
interface eth1 {
    AdvSendAdvert on;          # Send RAs on this interface
    MinRtrAdvInterval 30;
    MaxRtrAdvInterval 100;

    prefix 2001:db8:1::/64 {
        AdvOnLink on;          # Prefix is on-link
        AdvAutonomous on;      # Clients can use SLAAC
        AdvRouterAddr off;
    };
};
```

## ICMPv6 Differences Between Hosts and Routers

| ICMPv6 Message | Host Sends | Router Sends |
|---------------|------------|--------------|
| Router Solicitation (133) | Yes (when an interface is enabled) | No (by default) |
| Router Advertisement (134) | No | Yes (periodic + on RS) |
| Neighbor Solicitation (135) | Yes | Yes |
| Neighbor Advertisement (136) | Yes | Yes |
| Redirect (137) | No | Yes (to inform hosts of better routes) |

## Redirect Messages

Routers send **ICMPv6 Redirect** messages to inform hosts that a better first-hop node exists, or that a destination is directly on-link:

```bash
# Monitor for Redirect messages (type 137) on the network
sudo tcpdump -i eth0 -n "icmp6 and ip6[40] == 137"
```

## Hybrid Configuration: Linux as Both Host and Router

On a Linux router with a WAN interface receiving its default route via RA:

```bash
# /etc/sysctl.d/99-router.conf

# Enable forwarding
net.ipv6.conf.all.forwarding = 1

# Disable RA acceptance globally
net.ipv6.conf.all.accept_ra = 0
net.ipv6.conf.default.accept_ra = 0

# Enable RA acceptance on WAN interface only
net.ipv6.conf.eth0.accept_ra = 2
```

## Summary

IPv6 hosts accept Router Advertisements and do not forward packets; routers send RAs and forward packets between interfaces. On Linux, the distinction is controlled by `net.ipv6.conf.all.forwarding` and `accept_ra` sysctl values, with `accept_ra=2` allowing a forwarding node to still accept RAs on a specific interface. Understanding this distinction is critical for correct network configuration and security.
