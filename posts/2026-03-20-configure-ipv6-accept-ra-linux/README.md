# How to Configure IPv6 Accept RA on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Linux, Router Advertisement, SLAAC, Sysctl

Description: Learn how to configure the accept_ra sysctl parameter on Linux to control whether interfaces process Router Advertisements for SLAAC, default gateway, and prefix information.

## What is accept_ra?

The `accept_ra` parameter controls whether a Linux interface processes ICMPv6 Router Advertisement (RA) messages. RAs are sent by routers to announce:
- The default gateway (router's link-local address)
- On-link prefixes for SLAAC address generation
- MTU, hop limit, and other network parameters

## accept_ra Values

```bash
# Check current value

cat /proc/sys/net/ipv6/conf/eth0/accept_ra

# 0 = Do NOT accept RAs (ignore all router advertisements)
# 1 = Accept RAs if forwarding is disabled (default for hosts)
# 2 = Accept RAs even when IPv6 forwarding is enabled (for routers that need to learn a default route from upstream)
```

## Configuring accept_ra

```bash
# Disable RA processing on an interface
sysctl -w net.ipv6.conf.eth0.accept_ra=0

# Enable RA processing (default for hosts)
sysctl -w net.ipv6.conf.eth0.accept_ra=1

# Enable RA processing even when forwarding is on
sysctl -w net.ipv6.conf.eth0.accept_ra=2

# Apply to all interfaces
sysctl -w net.ipv6.conf.all.accept_ra=0

# Apply to new interfaces (created after this runs)
sysctl -w net.ipv6.conf.default.accept_ra=0
```

## Persistent Configuration

```bash
# Server that should not use SLAAC/gateway from RA
cat > /etc/sysctl.d/60-ipv6-accept-ra.conf << 'EOF'
# Disable RA processing globally (manual/static IPv6 config)
net.ipv6.conf.all.accept_ra = 0
net.ipv6.conf.default.accept_ra = 0
EOF

# Router that needs to learn default route from ISP via RA
cat > /etc/sysctl.d/60-ipv6-accept-ra.conf << 'EOF'
net.ipv6.conf.all.forwarding = 1
# Uplink interface: accept RA for default route even with forwarding on
net.ipv6.conf.eth0.accept_ra = 2
# Downstream: do not process RAs
net.ipv6.conf.eth1.accept_ra = 0
EOF

sysctl --system
```

## What Happens When RA is Accepted

```bash
# When accept_ra=1 or 2, the kernel processes RA content:

# 1. Adds a default route from the router's link-local address
ip -6 route show default
# default via fe80::1 dev eth0 proto ra metric 1024 expires 1799sec

# 2. Generates SLAAC addresses from RA prefixes (if autoconf=1)
ip -6 addr show dev eth0
# inet6 2001:db8::1234:5678/64 scope global dynamic

# 3. Sets MTU from RA if different from interface default
ip link show eth0 | grep mtu
```

## Disabling RA on Specific Interfaces

```bash
# Disable RA on all interfaces except eth0
sysctl -w net.ipv6.conf.all.accept_ra=0
sysctl -w net.ipv6.conf.eth0.accept_ra=1

# Verify per-interface settings
sysctl -a | grep accept_ra
```

## Testing RA Reception

```bash
# Monitor for incoming Router Advertisements
tcpdump -i eth0 -n 'icmp6 and (ip6[40] == 134)'
# icmp6 type 134 = Router Advertisement

# Check if default route was learned from RA
ip -6 route show proto ra

# Manually trigger RS to solicit an RA
rdisc6 eth0
```

## Summary

Control RA processing with `net.ipv6.conf.<iface>.accept_ra`: `0` disables RA (use for servers with static IPv6), `1` accepts RA when forwarding is off (host default), `2` accepts RA even when forwarding is enabled (use on router uplink interfaces). Persist in `/etc/sysctl.d/`. When RA is accepted, the kernel automatically adds a default route and (if `autoconf=1`) generates SLAAC addresses from the announced prefix.
