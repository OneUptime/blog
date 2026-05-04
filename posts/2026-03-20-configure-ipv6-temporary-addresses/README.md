# How to Configure IPv6 Temporary Addresses on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Linux, Privacy Extensions, Temporary Addresses, RFC 4941

Description: Learn how to configure IPv6 temporary addresses (privacy extensions per RFC 4941) on Linux to prevent tracking based on stable IPv6 interface identifiers.

## What are IPv6 Temporary Addresses?

IPv6 privacy extensions (RFC 4941) generate random, temporary addresses that change periodically. This prevents external services from tracking a host based on a stable IPv6 address derived from its MAC address.

```text
Stable address:   2001:db8::1234:5678:9abc:def0/64  (EUI-64, permanent)
Temporary address: 2001:db8::a1b2:c3d4:e5f6:7890/64  (random, expires)
```

## Enabling Temporary Addresses

```bash
# use_tempaddr values:

# -1 = Disabled (kernel default on some distros)
#  0 = Disabled
#  1 = Generate temporary addresses, prefer public (stable) for outgoing
#  2 = Generate temporary addresses, prefer temporary for outgoing (RFC 4941 recommended)

# Enable and prefer temporary addresses
sysctl -w net.ipv6.conf.eth0.use_tempaddr=2
sysctl -w net.ipv6.conf.all.use_tempaddr=2
sysctl -w net.ipv6.conf.default.use_tempaddr=2
```

## Persistent Configuration

```bash
cat > /etc/sysctl.d/60-ipv6-privacy.conf << 'EOF'
# Enable IPv6 privacy extensions (RFC 4941)
# Prefer temporary addresses for outgoing connections
net.ipv6.conf.all.use_tempaddr = 2
net.ipv6.conf.default.use_tempaddr = 2
EOF

sysctl --system
```

## Viewing Temporary Addresses

```bash
# Show all IPv6 addresses including temporary ones
ip -6 addr show dev eth0

# Output example:
# inet6 2001:db8::1234:5678:9abc:def0/64 scope global mngtmpaddr
#    valid_lft forever preferred_lft forever
# inet6 2001:db8::a1b2:c3d4:e5f6:7890/64 scope global temporary dynamic
#    valid_lft 86389sec preferred_lft 14389sec
# inet6 fe80::1234:5678:9abc:def0/64 scope link

# Show only temporary addresses
ip -6 addr show temporary

# Show only permanent (non-temporary) addresses
ip -6 addr show permanent
```

## Temporary Address Lifetimes

```bash
# Controlling temporary address lifetimes via sysctl
# Maximum time before a new temporary address is generated (seconds, default: 86400 = 1 day)
sysctl net.ipv6.conf.eth0.temp_valid_lft    # How long the address remains valid
sysctl net.ipv6.conf.eth0.temp_prefered_lft # How long the address is preferred

# Set shorter rotation interval for higher privacy
sysctl -w net.ipv6.conf.all.temp_prefered_lft=3600   # Prefer for 1 hour
sysctl -w net.ipv6.conf.all.temp_valid_lft=7200      # Valid for 2 hours
```

## Temporary Addresses vs Stable Privacy Addressing

RFC 4941 temporary addresses change over time. RFC 7217 stable privacy addresses are random but stable per host/network prefix:

```bash
# addr_gen_mode controls the stable address algorithm:
# 0 = EUI-64 (MAC-derived, privacy concern)
# 1 = Do not generate a link-local address
# 2 = Stable privacy (RFC 7217), uses stable_secret
# 3 = Stable privacy with a random secret (not stable across reboots)

# For best privacy: stable privacy + temporary addresses
sysctl -w net.ipv6.conf.all.addr_gen_mode=2    # Stable privacy for persistent addresses (requires stable_secret)
sysctl -w net.ipv6.conf.all.use_tempaddr=2     # Temporary addresses for outgoing connections
```

## Disabling Temporary Addresses

```bash
# Disable on all interfaces
sysctl -w net.ipv6.conf.all.use_tempaddr=0

# Disable on a specific interface
sysctl -w net.ipv6.conf.eth0.use_tempaddr=0

# Remove existing temporary addresses
ip -6 addr flush dev eth0 scope global temporary
```

## Summary

Enable IPv6 temporary addresses with `net.ipv6.conf.all.use_tempaddr=2` to generate rotating random addresses for outgoing connections, preventing tracking based on stable IPv6 identifiers. Persist in `/etc/sysctl.d/`. Combine with `addr_gen_mode=2` (RFC 7217 stable privacy) for the best privacy posture. Temporary addresses have configurable lifetimes via `temp_valid_lft` and `temp_prefered_lft`.
