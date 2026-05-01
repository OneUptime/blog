# How to Enable IPv6 Forwarding on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Linux, Forwarding, Routing, Sysctl

Description: Learn how to enable IPv6 packet forwarding on Linux to act as a router, including the interaction with Router Advertisements and how to make the setting persistent.

## What is IPv6 Forwarding?

IPv6 forwarding allows a Linux host to route packets between interfaces - turning it into an IPv6 router. By default, Linux operates as a host and drops packets not destined for its own addresses.

```text
Without forwarding (host):           With forwarding (router):
eth0 → packet for eth1 → DROPPED    eth0 → packet for eth1 → FORWARDED
```

## Enable IPv6 Forwarding Temporarily

```bash
# Enable forwarding on all interfaces

sysctl -w net.ipv6.conf.all.forwarding=1

# Verify
sysctl net.ipv6.conf.all.forwarding
# net.ipv6.conf.all.forwarding = 1

# Check via /proc
cat /proc/sys/net/ipv6/conf/all/forwarding
```

## Make IPv6 Forwarding Persistent

```bash
# Create or edit a sysctl.d file
cat > /etc/sysctl.d/50-ipv6-forwarding.conf << 'EOF'
# Enable IPv6 forwarding for router mode
net.ipv6.conf.all.forwarding = 1
EOF

# Apply immediately
sysctl -p /etc/sysctl.d/50-ipv6-forwarding.conf

# Or reload all sysctl.d files
sysctl --system
```

## Forwarding and Router Advertisements

Enabling `all.forwarding=1` has a side effect: it changes how `accept_ra` behaves. When forwarding is on, `accept_ra=1` no longer processes RAs (to avoid creating routing loops on routers). Use `accept_ra=2` to override:

```bash
# Enable forwarding AND still accept RAs (e.g., on a router that gets its default route from RA)
sysctl -w net.ipv6.conf.all.forwarding=1
sysctl -w net.ipv6.conf.eth0.accept_ra=2

# Persistent configuration
cat > /etc/sysctl.d/50-ipv6-router.conf << 'EOF'
net.ipv6.conf.all.forwarding = 1

# Accept RA on upstream interface (set default route from ISP RA)
net.ipv6.conf.eth0.accept_ra = 2
EOF

sysctl --system
```

## Verify Forwarding is Working

```bash
# Check current forwarding state
sysctl net.ipv6.conf.all.forwarding

# Check kernel routing table has routes between interfaces
ip -6 route show

# Test forwarding with ping from another host
# From host A on the source network:
ping -6 <address-on-eth1-network>

# Check if forwarding is happening with tcpdump on the forwarding host
tcpdump -i eth0 -n icmp6
tcpdump -i eth1 -n icmp6
```

## Enabling Forwarding for Specific Interfaces Only

```bash
# IPv6 forwarding is usually enabled globally:
sysctl net.ipv6.conf.all.forwarding

# If you need to force forwarding on a specific interface, use force_forwarding:
sysctl -w net.ipv6.conf.eth0.force_forwarding=1

# Inspect per-interface Host/Router behaviour:
sysctl net.ipv6.conf.eth0.forwarding

# Per-interface behavior can be tuned via:
sysctl net.ipv6.conf.eth0.accept_ra     # Whether to learn routes from RA
sysctl net.ipv6.conf.eth0.autoconf      # Whether to generate SLAAC addresses
```

## Common Router Configuration

```bash
# Full router setup: forwarding + no SLAAC on router itself + accept RA on uplink
cat > /etc/sysctl.d/50-ipv6-router.conf << 'EOF'
# Enable IPv6 packet forwarding
net.ipv6.conf.all.forwarding = 1

# Don't generate SLAAC addresses on the router
net.ipv6.conf.all.autoconf = 0
net.ipv6.conf.default.autoconf = 0

# Accept RA on upstream interface (eth0) for default route
net.ipv6.conf.eth0.accept_ra = 2

# Don't accept RA on downstream interfaces (eth1, eth2)
net.ipv6.conf.eth1.accept_ra = 0
net.ipv6.conf.eth2.accept_ra = 0
EOF

sysctl --system
```

## Summary

Enable IPv6 forwarding with `sysctl -w net.ipv6.conf.all.forwarding=1` and persist it in `/etc/sysctl.d/`. When forwarding is enabled, `accept_ra` defaults to ignoring RAs - set `accept_ra=2` on your upstream interface if you need to learn a default route from a router advertisement. Verify with `ip -6 route show` and packet captures.
