# How to Use the IPv6 Documentation Prefix (2001:db8::/32)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Documentation, RFC 3849, Networking, Best Practice

Description: Learn about the IPv6 documentation prefix 2001:db8::/32 reserved by RFC 3849 for use in examples, training materials, and technical documentation.

## Introduction

The `2001:db8::/32` prefix is reserved exclusively for use in documentation, examples, and technical publications (RFC 3849). Just like 192.0.2.0/24, 198.51.100.0/24, and 203.0.113.0/24 are reserved IPv4 documentation prefixes, `2001:db8::/32` ensures that addresses used in books, RFCs, and training materials will never conflict with real network deployments.

## Why a Documentation Prefix Matters

Without a reserved prefix, authors would either:
1. Use real addresses (potentially disruptive to those organizations)
2. Use private addresses (ULA/fc00::/7) that could conflict with internal deployments
3. Use addresses that look real and confuse learners

The `2001:db8::/32` block should be treated as non-routable documentation space and should not appear in production routing tables.

## Common Usage Patterns

```text
2001:db8::/32          # The full documentation block
2001:db8::1            # Simple example host
2001:db8::1/128        # Host route example

# Subnetting examples

2001:db8:0:1::/64      # First subnet
2001:db8:0:2::/64      # Second subnet
2001:db8:1::/48        # Site 1 example
2001:db8:2::/48        # Site 2 example

# Multi-level hierarchy
2001:db8:acad::/48     # Academy/training network
2001:db8:cafe::/48     # Common in coffee shop WiFi examples
2001:db8:dead:beef::/64  # Classic humorous example
```

## Using 2001:db8 in Configuration Examples

```bash
# WRONG: Using a real prefix in documentation
# ip -6 addr add 2a01:4f8:1:3::1/64 dev eth0

# CORRECT: Use the documentation prefix
ip -6 addr add 2001:db8:1:1::1/64 dev eth0

# Example BGP configuration using documentation prefix
# neighbor 2001:db8:ffff::1 remote-as 64496
# network 2001:db8:0:1::/64
```

```yaml
# Docker Compose with documentation IPv6 subnets
networks:
  ipv6-network:
    driver: bridge
    enable_ipv6: true
    ipam:
      config:
        - subnet: "2001:db8:1::/64"  # Documentation prefix for examples
          gateway: "2001:db8:1::1"
```

## Filtering the Documentation Prefix

Network operators should filter `2001:db8::/32` at their borders:

```bash
# Linux: ensure documentation prefix is not routed
# Add to /etc/network/interfaces or routing daemon config

# ip6tables: drop packets to/from documentation range
sudo ip6tables -A INPUT -s 2001:db8::/32 -j DROP
sudo ip6tables -A OUTPUT -d 2001:db8::/32 -j DROP

# Cisco IOS: prefix-list to filter documentation prefix
# ipv6 prefix-list BOGON-IPV6 seq 10 deny 2001:DB8::/32 le 128
```

## What 2001:db8::/32 Is and Is Not

| Property | Value |
|---|---|
| RFC | RFC 3849 |
| Block size | /32 |
| Routable on internet | No (not globally reachable) |
| Usable in lab/test | For examples only; use ULA for active lab traffic |
| Assigned by IANA | Yes, as special-purpose documentation space |

## Alternatives for Actual Testing

For real lab environments, use:

```bash
# Use ULA (typically fd00::/8) for actual lab addressing
sudo ip -6 addr add fd12:3456:789a:1::1/64 dev eth0

# Use loopback for single-machine tests (::1/128 is already present on lo)
ip -6 addr show dev lo

# Never use 2001:db8::/32 for actual traffic
# It may be filtered by some systems and will cause confusion
```

## Other Reserved Documentation Prefixes

For completeness, RFC 5737 IPv4 equivalents:

```text
IPv4 documentation: 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24
IPv6 documentation: 2001:db8::/32
IPv6 (new, 2024):   3fff::/20  (RFC 9637)
AS numbers:         64496-64511, 65536-65551 (RFC 5398)
```

## Conclusion

The `2001:db8::/32` documentation prefix is an essential tool for anyone writing about IPv6 networking. Using it in examples, configurations, and training materials prevents real-world disruption and makes it immediately clear to readers that the addresses are illustrative. Always filter this prefix at network borders to prevent documentation addresses from appearing in production routing tables.
