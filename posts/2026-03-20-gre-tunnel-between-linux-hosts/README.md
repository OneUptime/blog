# How to Create a GRE Tunnel Between Two Linux Hosts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, GRE, Tunnel, Networking, iproute2, VPN, Network Connectivity

Description: Create a GRE (Generic Routing Encapsulation) tunnel between two Linux hosts to encapsulate IP traffic and connect remote networks over an IP underlay.

## Introduction

GRE (Generic Routing Encapsulation) tunnels encapsulate network layer protocols inside IP packets. A GRE tunnel creates a virtual point-to-point link between two hosts, useful for connecting remote networks or routing traffic through intermediary networks. GRE does not encrypt traffic, so pair it with IPsec if you need a VPN.

## Prerequisites

- Two Linux hosts with IP connectivity to each other (direct or via internet)
- Root access on both hosts
- The `ip_gre` kernel module
- Any intervening firewalls must allow GRE (IP protocol 47)

## Topology

```text
Host A: eth0 = 10.0.0.1 (underlay IP)
Host B: eth0 = 10.0.0.2 (underlay IP)
Tunnel: gre1 on A = 172.16.0.1/30, gre1 on B = 172.16.0.2/30
```

## On Host A

```bash
# Load GRE module

modprobe ip_gre

# Create GRE tunnel
# local = Host A's underlay IP, remote = Host B's underlay IP
ip tunnel add gre1 mode gre \
    local 10.0.0.1 \
    remote 10.0.0.2 \
    ttl 255

# Assign tunnel endpoint IP
ip addr add 172.16.0.1/30 dev gre1

# Bring up the tunnel
ip link set gre1 up
```

## On Host B

```bash
# Load GRE module
modprobe ip_gre

# Create GRE tunnel (mirrored configuration)
# local = Host B's underlay IP, remote = Host A's underlay IP
ip tunnel add gre1 mode gre \
    local 10.0.0.2 \
    remote 10.0.0.1 \
    ttl 255

# Assign tunnel endpoint IP
ip addr add 172.16.0.2/30 dev gre1

# Bring up the tunnel
ip link set gre1 up
```

## Test the Tunnel

```bash
# From Host A, ping Host B's tunnel endpoint
ping -c 3 172.16.0.2

# From Host B, ping Host A's tunnel endpoint
ping -c 3 172.16.0.1
```

## Enable IP Forwarding for Multi-Network Tunnels

```bash
# On both hosts, if routing additional subnets through the tunnel
sysctl -w net.ipv4.ip_forward=1

# On Host A: add route to Host B's internal network
ip route add 192.168.2.0/24 via 172.16.0.2

# On Host B: add route to Host A's internal network
ip route add 192.168.1.0/24 via 172.16.0.1
```

## Verify Tunnel Status

```bash
# List tunnels
ip tunnel show

# Show tunnel details
ip -d link show gre1

# Check tunnel statistics
ip -s link show gre1
```

## Persistent Tunnel (systemd-networkd)

```ini
# /etc/systemd/network/10-gre1.netdev
[NetDev]
Name=gre1
Kind=gre

[Tunnel]
Independent=yes
Local=10.0.0.1
Remote=10.0.0.2
TTL=255
```

```ini
# /etc/systemd/network/10-gre1.network
[Match]
Name=gre1

[Network]
Address=172.16.0.1/30
```

## Conclusion

A GRE tunnel creates a virtual point-to-point link over any IP network. Create it with `ip tunnel add` specifying `local` and `remote` underlay IPs, assign a tunnel IP, and bring the interface up. GRE tunnels carry IP traffic but do not encrypt it - combine with IPsec for security. Tunnels are not persistent across reboots unless configured via systemd-networkd or a startup script.
