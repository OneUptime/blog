# How to Configure SIT (Simple Internet Transition) Tunnels on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, SIT, Linux, Tunneling, 6in4

Description: Learn how to configure SIT (Simple Internet Transition) tunnels on Linux for IPv6-in-IPv4 encapsulation, including creating tunnels with ip commands, wildcard tunnels, and systemd-networkd...

## Overview

SIT (Simple Internet Transition) is the Linux kernel driver for IPv6-in-IPv4 tunnels (IP protocol 41). The kernel module is named `sit`. SIT tunnels are used for 6in4 point-to-point tunnels (to tunnel brokers like Hurricane Electric) and 6rd. IPv6-in-IPv6 (`ip6ip6`) uses the `ip6tnl` driver instead. SIT is the most common and lightweight IPv6 tunneling mechanism on Linux.

## SIT vs Other Tunnel Types

| Tunnel type | Linux kind | Protocol | Use case |
|---|---|---|---|
| `sit` (mode sit) | sit | IPv4 proto 41 | 6in4, 6rd |
| `ip6tnl` (mode ipip6/ip6ip6) | ip6tnl | IPv6 next header 4 or 41 | IPv4/IPv6-in-IPv6 |
| `gre` | gre | IPv4 proto 47 | Multi-protocol |
| `ip6gre` | ip6gre | IPv6 proto 47 | GRE over IPv6 |

## Load SIT Module

```bash
# The sit module creates sit0 (wildcard) interface automatically

sudo modprobe sit

# Verify
lsmod | grep ^sit
# sit                    20480  0

# sit0 is the wildcard tunnel interface (accept any remote)
ip link show sit0
```

## Create a Named SIT Tunnel

```bash
# Point-to-point SIT tunnel (6in4 to broker)
sudo ip tunnel add sit1 mode sit \
    remote  198.51.100.1 \
    local   203.0.113.10 \
    ttl     64

sudo ip link set sit1 up mtu 1480

# Assign IPv6 address
sudo ip addr add 2001:db8::2/64 dev sit1

# Add default IPv6 route
sudo ip -6 route add ::/0 via 2001:db8::1 dev sit1
```

## Wildcard SIT Tunnel (Any Remote)

A wildcard tunnel accepts protocol 41 from any remote IPv4 address - useful when you want to accept multiple tunnels without creating separate interfaces:

```bash
# Wildcard tunnel - accepts from any remote
sudo ip tunnel add anytun mode sit \
    remote  any \
    local   203.0.113.10 \
    ttl     64

sudo ip link set anytun up

# Routes are matched based on inner IPv6 destination
```

Note: Wildcard tunnels are less specific than named tunnels - they have security implications (accept proto 41 from any source). Use only when you control which sources can reach your host.

## SIT Tunnel Modes

```bash
# Standard 6in4 (IPv6 over IPv4) - default mode
ip tunnel add sit1 mode sit remote 198.51.100.1 local 203.0.113.10

# isatap mode - ISATAP addressing
ip tunnel add isatap0 mode isatap local 192.168.1.10

# ip6ip6 mode - IPv6 over IPv6 (using ip6tnl driver instead)
ip -6 tunnel add tun6 mode ip6ip6 remote 2001:db8::1 local 2001:db8::2
```

## 6rd Configuration via ip tunnel

Linux supports 6rd directly via the `ip tunnel` command:

```bash
# Create 6rd tunnel (ISP-provisioned parameters)
ip tunnel add 6rd mode sit remote any local 203.0.113.10 ttl 64
ip tunnel 6rd dev 6rd 6rd-prefix 2001:db8::/32 6rd-relay_prefix 0.0.0.0/0

ip link set 6rd up mtu 1480

# Calculate CE address from IPv4 (full 32-bit embedding)
WAN_IP="203.0.113.10"
HEX=$(printf '%02x%02x%02x%02x' $(echo $WAN_IP | tr '.' ' '))
BR_IP="198.51.100.1"
ip -6 addr add "2001:db8:${HEX:0:4}:${HEX:4:4}::1/64" dev 6rd
ip -6 route add ::/0 via "::$BR_IP" dev 6rd
```

## Persistence with systemd-networkd

```ini
# /etc/systemd/network/20-sit1.netdev
[NetDev]
Name=sit1
Kind=sit

[Tunnel]
Independent=yes
Local=203.0.113.10
Remote=198.51.100.1
TTL=64
```

```ini
# /etc/systemd/network/20-sit1.network
[Match]
Name=sit1

[Network]
Address=2001:db8::2/64

[Route]
Destination=::/0
Metric=100
```

```bash
sudo systemctl restart systemd-networkd
networkctl status sit1
```

## Persistence with ifupdown (Debian/Ubuntu)

```bash
# /etc/network/interfaces

auto sit1
iface sit1 inet6 v4tunnel
    address 2001:db8::2/64
    endpoint 198.51.100.1
    local 203.0.113.10
    ttl 64
    gateway 2001:db8::1
    mtu 1480
```

## Firewall Rules for SIT

```bash
# Allow protocol 41 only from your tunnel broker
sudo iptables -A INPUT  -p 41 -s 198.51.100.1 -j ACCEPT
sudo iptables -A INPUT  -p 41 -j DROP

sudo iptables -A OUTPUT -p 41 -d 198.51.100.1 -j ACCEPT
sudo iptables -A OUTPUT -p 41 -j DROP

# IPv6 rules still needed inside the tunnel
sudo ip6tables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
sudo ip6tables -A INPUT -p ipv6-icmp -j ACCEPT
sudo ip6tables -A INPUT -p tcp --dport 22 -j ACCEPT
sudo ip6tables -A INPUT -j DROP
```

## Monitoring SIT Tunnels

```bash
# List all tunnels
ip tunnel show

# Show SIT tunnel details
ip tunnel show sit1

# Check IPv6 address on tunnel
ip -6 addr show dev sit1

# Check routes
ip -6 route show

# Statistics
ip -s link show sit1
# RX: packets, bytes, errors
# TX: packets, bytes, errors

# Capture tunnel traffic
sudo tcpdump -i eth0 "proto 41 and host 198.51.100.1" -v
```

## Removing a SIT Tunnel

```bash
# Bring down and delete
sudo ip link set sit1 down
sudo ip tunnel del sit1

# Remove route that used the tunnel
sudo ip -6 route del ::/0 dev sit1 2>/dev/null

# Unload sit module (only if no other tunnels)
sudo modprobe -r sit
```

## Summary

SIT (Simple Internet Transition) tunnels on Linux use the `sit` kernel module and are created with `ip tunnel add <name> mode sit remote <endpoint> local <your-ip>`. They carry IPv6 over IPv4 using IP protocol 41. Create named tunnels for specific endpoints (e.g., HE tunnel broker) or wildcard tunnels (`remote any`) for dynamic endpoints. Make persistent with systemd-networkd `.netdev` files or `/etc/network/interfaces` using `v4tunnel` type. Always restrict protocol 41 at the firewall to authorized remote endpoints.
