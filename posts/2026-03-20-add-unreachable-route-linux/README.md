# How to Add an Unreachable Route on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Routing, iproute2, ICMP, Networking, Security

Description: Add an unreachable route on Linux to drop traffic to specific destinations while sending ICMP network unreachable messages back to the sender.

## Introduction

An `unreachable` route drops packets to a destination and sends an ICMP "host unreachable" message (type 3, code 1) back to the originating host. Unlike `blackhole` routes, the sender is notified that the destination is unreachable, which can be useful for explicit rejection of traffic in controlled environments.

## Add an Unreachable Route

```bash
# Drop traffic to 10.99.0.0/24 and send ICMP host unreachable

ip route add unreachable 10.99.0.0/24
```

## Verify the Unreachable Route

```bash
# Show routes of type unreachable
ip route show type unreachable

# Test - sender receives a host-unreachable error
ping -c 3 10.99.0.1
# Expected: a host-unreachable error from the local host
```

## Unreachable for a Single Host

```bash
# Send ICMP host unreachable for a specific host
ip route add unreachable 10.0.5.100/32
```

## Route Type Comparison

| Type | Packet fate | ICMP sent |
|---|---|---|
| `blackhole` | Dropped silently | No |
| `unreachable` | Dropped | ICMP 3/1 - Host Unreachable |
| `prohibit` | Dropped | ICMP 3/13 - Comm Administratively Prohibited |
| `throw` | Terminates lookup in the current table | ICMP 3/0 - Net Unreachable if no later rule matches |

## Use Unreachable in Policy Routing

```bash
# In a custom routing table, mark subnets as unreachable
ip route add unreachable 10.50.0.0/24 table 100

# Add rule to use table 100 for traffic from a specific source
ip rule add from 192.168.1.0/24 table 100
```

## Remove an Unreachable Route

```bash
ip route del unreachable 10.99.0.0/24
```

## Persistent Configuration with systemd-networkd

```ini
# /etc/systemd/network/10-eth0.network
[Match]
Name=eth0

[Route]
Destination=10.99.0.0/24
Type=unreachable
```

## When to Use Unreachable vs Blackhole

- Use **blackhole** when you want to silently discard traffic (e.g., blocking attack sources where you don't want to reveal the host is alive).
- Use **unreachable** when you want the sender to know the destination is unavailable (e.g., internal routing where diagnostic feedback helps).

## Conclusion

Unreachable routes provide explicit rejection by dropping packets and returning ICMP errors to senders. This makes them useful in controlled internal environments where feedback aids troubleshooting. Use `ip route add unreachable <prefix>` to configure, and `ip route show type unreachable` to verify.
