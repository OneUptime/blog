# How to Add a Blackhole Route on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Routing, Blackhole, iproute2, Networking, Security

Description: Add a blackhole route on Linux to silently discard traffic to specific destinations without sending ICMP unreachable messages back to the sender.

## Introduction

A blackhole route silently drops all packets destined for a given prefix - no ICMP error is sent back to the source. This differs from a `prohibit` or `unreachable` route. Blackhole routes are commonly used for null-routing attack traffic, blocking known bad prefixes, or preventing routing loops.

## Add a Blackhole Route

```bash
# Drop all traffic to 192.168.99.0/24 silently

ip route add blackhole 192.168.99.0/24
```

## Verify the Blackhole Route

```bash
# Confirm the blackhole route was installed
ip route show type blackhole

# Test from the local host - ping should fail immediately; blackhole routes do not emit ICMP
ping -c 3 192.168.99.1
# Expected: ping: connect: Invalid argument
```

## Blackhole a Single Host

```bash
# Null-route a specific IP address
ip route add blackhole 10.0.0.50/32
```

## Blackhole vs Unreachable vs Prohibit

| Type | Behavior | ICMP Response |
|---|---|---|
| `blackhole` | Drops silently | None |
| `unreachable` | Drops + ICMP host unreachable | Host Unreachable |
| `prohibit` | Drops + ICMP communication administratively prohibited | Communication Administratively Prohibited |

```bash
# Compare route types
ip route add blackhole 10.1.0.0/24       # Silent drop
ip route add unreachable 10.2.0.0/24     # ICMP unreachable
ip route add prohibit 10.3.0.0/24        # ICMP prohibited
```

## Use Cases

```bash
# Block traffic to a known malicious destination network
ip route add blackhole 185.234.0.0/16

# Block multiple prefixes (loop example)
for net in 10.99.1.0/24 10.99.2.0/24 10.99.3.0/24; do
    ip route add blackhole $net
done
```

## Remove a Blackhole Route

```bash
ip route del blackhole 192.168.99.0/24
```

## Make Blackhole Routes Persistent

Add to `/etc/rc.local` or a systemd service:

```bash
# /etc/rc.local (before exit 0)
ip route add blackhole 192.168.99.0/24
```

Or using systemd-networkd in a `.network` file:

```ini
[Route]
Destination=192.168.99.0/24
Type=blackhole
```

## Conclusion

Blackhole routes provide silent traffic dropping without ICMP feedback, making them ideal for null-routing traffic to specific prefixes or blocking unwanted destinations. Use `ip route add blackhole <prefix>` for immediate effect. For persistence, add the command to system startup scripts or use systemd-networkd route configuration.
