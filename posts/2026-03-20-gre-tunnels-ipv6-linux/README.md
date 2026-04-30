# How to Configure GRE Tunnels for IPv6 on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, GRE, Linux, Tunneling, Networking

Description: Learn how to configure GRE (Generic Routing Encapsulation) tunnels to carry IPv6 traffic over IPv4 infrastructure on Linux using ip tunnel commands and systemd-networkd.

## Overview

GRE (Generic Routing Encapsulation, RFC 2784) can encapsulate multiple network layer protocols. When GRE uses IPv4 as the delivery protocol, it uses IP protocol 47. Unlike 6in4 (SIT, protocol 41), GRE can carry multiple protocols and is more widely supported in enterprise and operator environments. GRE tunnels are used to carry IPv6 traffic across IPv4-only transit paths and are compatible with routing protocols like OSPFv3 and BGP.

## GRE vs 6in4 (SIT)

| Feature | GRE (protocol 47) | 6in4/SIT (protocol 41) |
|---|---|---|
| Protocol number | 47 | 41 |
| Overhead | 24 bytes (IPv4 + GRE) | 20 bytes (IPv4 only) |
| Multi-protocol | Yes | IPv6 only |
| Routing protocols over tunnel | Yes | IPv6 only |
| Cisco compatibility | Yes | Yes |
| Key/checksum options | Yes | No |

## Create a GRE Tunnel for IPv6

```bash
# Create GRE tunnel (carries IPv6 over IPv4)

sudo ip tunnel add gre1 mode gre \
    remote 198.51.100.1 \
    local  203.0.113.10 \
    ttl 64

sudo ip link set gre1 up mtu 1476   # 1500 - 24 bytes GRE overhead

# Assign IPv6 address on tunnel interface
sudo ip addr add 2001:db8:link::1/64 dev gre1

# Add IPv6 routes through tunnel
sudo ip -6 route add 2001:db8:remote::/48 via 2001:db8:link::2 dev gre1

# Or default route through tunnel
sudo ip -6 route add ::/0 via 2001:db8:link::2 dev gre1
```

## GRE Tunnel with Key

Using a GRE key distinguishes multiple tunnels between the same endpoints:

```bash
# Side A
sudo ip tunnel add gre-site-a mode gre \
    remote 198.51.100.1 \
    local  203.0.113.10 \
    key 1001 \
    ttl 64

# Side B (must match key)
sudo ip tunnel add gre-site-b mode gre \
    remote 203.0.113.10 \
    local  198.51.100.1 \
    key 1001 \
    ttl 64
```

## Persistent GRE with systemd-networkd

```ini
# /etc/systemd/network/40-gre1.netdev
[NetDev]
Name=gre1
Kind=gre

[Tunnel]
Remote=198.51.100.1
Local=203.0.113.10
TTL=64
```

```ini
# /etc/systemd/network/40-gre1.network
[Match]
Name=gre1

[Network]
Address=2001:db8:link::1/64

[Route]
Destination=2001:db8:remote::/48
Gateway=2001:db8:link::2
```

```bash
sudo systemctl restart systemd-networkd
networkctl status gre1
```

## GRE6 - IPv6 Inside IPv6

For IPv6-over-IPv6 GRE tunnels (less common):

```bash
# GRE6: IPv6 inside IPv6
sudo ip -6 tunnel add gre6tun mode ip6gre \
    remote 2001:db8:peer::1 \
    local  2001:db8:local::1

sudo ip link set gre6tun up
sudo ip -6 addr add 2001:db8:via6::1/64 dev gre6tun
```

## Using GRE with OSPFv3 (FRR/Quagga)

GRE tunnels can run routing protocols to exchange IPv6 routes dynamically:

```text
# /etc/frr/frr.conf

router ospf6
  ospf6 router-id 0.0.0.1

interface gre1
  ipv6 ospf6 area 0.0.0.0
  ipv6 ospf6 hello-interval 10
  ipv6 ospf6 dead-interval 40
```

## Site-to-Site IPv6 over GRE

```text
Site A (203.0.113.10)                    Site B (198.51.100.1)
gre1: 2001:db8:link::1/64               gre1: 2001:db8:link::2/64
LAN:  2001:db8:siteA::/48               LAN:  2001:db8:siteB::/48

=== Site A ===
ip tunnel add gre1 mode gre remote 198.51.100.1 local 203.0.113.10 ttl 64
ip link set gre1 up mtu 1476
ip addr add 2001:db8:link::1/64 dev gre1
ip -6 route add 2001:db8:siteB::/48 via 2001:db8:link::2 dev gre1

=== Site B ===
ip tunnel add gre1 mode gre remote 203.0.113.10 local 198.51.100.1 ttl 64
ip link set gre1 up mtu 1476
ip addr add 2001:db8:link::2/64 dev gre1
ip -6 route add 2001:db8:siteA::/48 via 2001:db8:link::1 dev gre1
```

## Firewall Rules for GRE

```bash
# Allow GRE (protocol 47) from specific remote only
sudo iptables -A INPUT  -p gre -s 198.51.100.1 -j ACCEPT
sudo iptables -A OUTPUT -p gre -d 198.51.100.1 -j ACCEPT
sudo iptables -A INPUT  -p gre -j DROP   # Block all other GRE

# IPv6 rules inside the tunnel still needed
sudo ip6tables -A FORWARD -i gre1 -o eth1 -m state --state ESTABLISHED,RELATED -j ACCEPT
sudo ip6tables -A FORWARD -i eth1 -o gre1 -j ACCEPT
```

## Verify and Troubleshoot

```bash
# Show tunnel
ip tunnel show gre1

# Show IPv6 address on tunnel
ip -6 addr show dev gre1

# Ping remote tunnel endpoint
ping6 2001:db8:link::2

# Capture GRE traffic
sudo tcpdump -i eth0 "proto gre" -v

# Check MTU
ip link show gre1 | grep mtu
# Typical: mtu 1476  (1500 - 24 bytes GRE overhead)

# If large packet failures:
sudo ip link set gre1 mtu 1476
# Enable TCP MSS clamping
sudo iptables -t mangle -A FORWARD -p tcp --tcp-flags SYN,RST SYN \
    -o gre1 -j TCPMSS --clamp-mss-to-pmtu
```

## Summary

GRE tunnels on Linux (`ip tunnel add gre1 mode gre`) carry IPv6 over IPv4 with 24 bytes of overhead (MTU 1476). GRE supports multiple protocols and routing protocols (OSPFv3, BGP), making it more flexible than 6in4/SIT. Use `ip tunnel add` with `remote/local` for GRE over IPv4, or `ip -6 tunnel add` for `ip6gre`; systemd-networkd `.netdev` files make the configuration persistent. GRE uses IP protocol 47 - restrict at the firewall to authorized endpoints only. Run OSPFv3 over GRE with FRR for dynamic IPv6 route exchange across the tunnel.
