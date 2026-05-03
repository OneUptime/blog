# How to Create a VXLAN Interface on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, VXLAN, Overlay Network, iproute2, Networking, SDN, Container

Description: Create a VXLAN (Virtual Extensible LAN) interface on Linux using ip link to build overlay networks that extend Layer 2 segments across Layer 3 boundaries.

## Introduction

VXLAN (Virtual Extensible LAN, RFC 7348) is a network encapsulation protocol that tunnels Layer 2 Ethernet frames inside UDP packets. VXLAN supports up to 16 million network segments (identified by 24-bit VNI) compared to 802.1Q's 4094 VLANs. It is the foundation of overlay networks in Kubernetes, OpenStack, and Docker.

## Prerequisites

- Linux kernel 3.7+ (VXLAN support)
- iproute2 installed
- Root access

## Create a Simple VXLAN Interface

```bash
# Create a VXLAN interface

# vni: VXLAN Network Identifier (0-16777215)
# dstport: UDP port (default 8472 for Linux, 4789 for IANA standard)
ip link add vxlan0 type vxlan \
    id 100 \
    dstport 4789 \
    dev eth0

# Assign an IP to the VXLAN interface
ip addr add 10.0.100.1/24 dev vxlan0

# Bring it up
ip link set vxlan0 up
```

## Key VXLAN Parameters

```bash
# Create VXLAN with common parameters
ip link add vxlan0 type vxlan \
    id 100 \           # VNI (VXLAN Network Identifier)
    dstport 4789 \     # UDP destination port (IANA standard)
    dev eth0 \         # Underlay interface for VTEP
    local 10.0.0.1 \   # Local VTEP IP (explicit)
    ttl 64             # Outer IP TTL
```

## Verify VXLAN Interface

```bash
# Show VXLAN interface details
ip -d link show vxlan0

# Sample output shows VNI, port, and VTEP config:
# vxlan id 100 dev eth0 srcport 0 0 dstport 4789 ageing 300
```

## VXLAN with Point-to-Point (Unicast)

For connecting two specific hosts:

```bash
# Create VXLAN with a specific remote endpoint
ip link add vxlan0 type vxlan \
    id 100 \
    dstport 4789 \
    remote 10.0.0.2 \   # Remote VTEP IP
    local 10.0.0.1 \    # Local VTEP IP
    dev eth0

ip addr add 10.100.0.1/24 dev vxlan0
ip link set vxlan0 up
```

## Allow VXLAN Traffic in Firewall

```bash
# Allow VXLAN UDP traffic (port 4789)
iptables -A INPUT -p udp --dport 4789 -j ACCEPT
iptables -A OUTPUT -p udp --sport 4789 -j ACCEPT
```

## Delete a VXLAN Interface

```bash
ip link delete vxlan0
```

## Persistent Configuration with systemd-networkd

```ini
# /etc/systemd/network/10-vxlan0.netdev
[NetDev]
Name=vxlan0
Kind=vxlan

[VXLAN]
VNI=100
Remote=10.0.0.2
Local=10.0.0.1
DestinationPort=4789
```

```ini
# /etc/systemd/network/10-vxlan0.network
[Match]
Name=vxlan0

[Network]
Address=10.100.0.1/24
```

## Conclusion

Creating a VXLAN interface on Linux requires specifying the VNI (`id`), UDP destination port, and the underlay device. VXLAN encapsulates Ethernet frames in UDP/IP, enabling overlay networks across L3 boundaries. Each VXLAN interface is a VTEP (VXLAN Tunnel Endpoint) that handles encapsulation and decapsulation of overlay traffic.
