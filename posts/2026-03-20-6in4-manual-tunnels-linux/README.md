# How to Configure 6in4 Manual Tunnels on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, 6in4, SIT, Linux, Tunneling

Description: Learn how to configure 6in4 (IPv6-in-IPv4) manual tunnels on Linux using ip tunnel commands and systemd-networkd for persistent configuration.

## Overview

6in4 (also called SIT - Simple Internet Transition) encapsulates IPv6 packets inside IPv4 using IP protocol 41. It creates a point-to-point link between two IPv4 endpoints. The tunnel is manually configured - both endpoints must know each other's IPv4 and IPv6 addresses. This is the mechanism used by IPv6 tunnel brokers like Hurricane Electric.

## How 6in4 Works

```text
[Linux Host A]                    [Tunnel Endpoint / Broker]
  IPv4: 203.0.113.10                IPv4: 198.51.100.1
  IPv6: 2001:db8::2/64              IPv6: 2001:db8::1/64

  eth0: 203.0.113.10
  sit1: tunnel endpoint ──proto 41──► 198.51.100.1

IPv6 packet from host:
  Inner: [IPv6 header | payload]
  Outer: [IPv4 src=203.0.113.10 dst=198.51.100.1 proto=41 | inner packet]
```

## Create a 6in4 Tunnel (Manual / Temporary)

```bash
# Load the sit kernel module if not loaded

sudo modprobe sit

# Create tunnel interface
sudo ip tunnel add sit1 mode sit \
    remote 198.51.100.1 \
    local 203.0.113.10 \
    ttl 64

# Bring up the interface
sudo ip link set sit1 up

# Assign IPv6 address (from tunnel broker)
sudo ip addr add 2001:db8::2/64 dev sit1

# Add default IPv6 route through tunnel
sudo ip -6 route add ::/0 via 2001:db8::1 dev sit1

# Verify
ip tunnel show sit1
ip -6 addr show sit1
ip -6 route show
```

## Verify Tunnel Connectivity

```bash
# Ping tunnel endpoint (IPv6 address)
ping6 2001:db8::1

# Ping external IPv6 host
ping6 2001:4860:4860::8888

# Trace IPv6 path to an external host over the tunnel
traceroute -6 2001:4860:4860::8888

# Capture tunnel traffic (look for proto 41)
sudo tcpdump -i eth0 "proto 41" -v
```

## Persistent Configuration with systemd-networkd

```ini
# /etc/systemd/network/30-sit1.netdev
[NetDev]
Name=sit1
Kind=sit

[Tunnel]
Remote=198.51.100.1
Local=203.0.113.10
TTL=64
```

```ini
# /etc/systemd/network/30-sit1.network
[Match]
Name=sit1

[Network]
Address=2001:db8::2/64

[Route]
Destination=::/0
Gateway=2001:db8::1
```

```bash
sudo systemctl restart systemd-networkd

# Verify
networkctl status sit1
```

## Persistent with /etc/network/interfaces (Debian/Ubuntu)

```bash
# /etc/network/interfaces

auto sit1
iface sit1 inet6 v4tunnel
    address 2001:db8::2/64
    endpoint 198.51.100.1
    local 203.0.113.10
    ttl 64
    gateway 2001:db8::1
```

## Multiple Tunnels

```bash
# Multiple SIT tunnels with different endpoints
ip tunnel add sit2 mode sit remote 203.0.113.20 local 192.0.2.10 ttl 64
ip link set sit2 up
ip addr add 2001:db8:b::2/64 dev sit2
ip -6 route add 2001:db8:b::/48 via 2001:db8:b::1 dev sit2
```

## IPv6 Address Assignment with a /48 Prefix

Tunnel brokers often provide a routed /48 prefix for subnetting in addition to the tunnel /64:

```bash
# Tunnel link: 2001:db8:0:1::/64
# Local tunnel address: 2001:db8:0:1::2/64
# Remote tunnel endpoint: 2001:db8:0:1::1/64
# Routed LAN prefix: 2001:db8:abcd::/48

# Tunnel interface address
sudo ip addr add 2001:db8:0:1::2/64 dev sit1

# Default route via the broker's tunnel address
sudo ip -6 route add ::/0 via 2001:db8:0:1::1 dev sit1

# LAN interface - carve a /64 from the routed /48
sudo ip addr add 2001:db8:abcd:1::1/64 dev eth1

# Enable IPv6 forwarding
sudo sysctl -w net.ipv6.conf.all.forwarding=1

# Advertise the LAN prefix to hosts
# Configure radvd, or use systemd-networkd with IPv6SendRA=yes
```

## Firewall Rules for 6in4

```bash
# Allow incoming 6in4 (protocol 41) from tunnel broker only
sudo iptables -A INPUT -p 41 -s 198.51.100.1 -j ACCEPT
sudo iptables -A INPUT -p 41 -j DROP  # Block all other protocol 41

# ip6tables rules still needed for IPv6 traffic inside tunnel
sudo ip6tables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
sudo ip6tables -A INPUT -p icmpv6 -j ACCEPT
sudo ip6tables -A INPUT -p tcp --dport 22 -j ACCEPT
sudo ip6tables -A INPUT -j DROP
```

## Troubleshooting

```bash
# Check tunnel state
ip tunnel show sit1
# sit1: ipv6/ip  remote 198.51.100.1  local 203.0.113.10  ttl 64

# Check IPv4 connectivity to tunnel endpoint (required!)
ping 198.51.100.1

# Check IPv6 address on sit1
ip -6 addr show sit1

# Check IPv6 default route
ip -6 route show default

# MTU - 6in4 reduces MTU by 20 bytes (IPv4 header)
# Default Ethernet MTU 1500 - 20 = 1480 for IPv6 over sit
ip link show sit1 | grep mtu
# mtu 1480

# If large packets fail:
sudo ip link set sit1 mtu 1480
```

## Summary

6in4 tunnels on Linux use `ip tunnel add sit1 mode sit remote <endpoint> local <your-ipv4> ttl 64`. Assign an IPv6 address and add the default IPv6 route through the tunnel. If your broker also routes a /48 to you, keep the tunnel link on its own /64 and use /64 LAN subnets from the routed prefix. Make persistent with systemd-networkd (.netdev and .network files) or `/etc/network/interfaces` using `v4tunnel` type. Block protocol 41 from sources other than your tunnel broker endpoint. Note the MTU reduction (1480 for standard Ethernet) and configure accordingly to avoid PMTUD issues.
