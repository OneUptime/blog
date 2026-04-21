# How to Assign a Static IPv4 Address to a VLAN Interface

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, VLAN, Static IP, IPv4, iproute2, Networking, Network Configuration

Description: Assign a static IPv4 address to a VLAN subinterface on Linux and configure the default gateway and DNS for permanent network access.

## Introduction

After creating a VLAN subinterface, you need to assign a static IPv4 address to it for network communication. This guide covers address assignment using `ip addr`, as well as persistent configurations using Netplan, nmcli, and `/etc/network/interfaces`.

## Prerequisites

- VLAN interface already created (e.g., `eth0.100`)
- Root access

## Assign an IP with ip addr (Temporary)

```bash
# Assign a static IP to the VLAN interface

ip addr add 192.168.100.10/24 dev eth0.100

# Bring the VLAN interface up
ip link set eth0.100 up

# Verify
ip addr show eth0.100
```

## Add a Default Gateway

```bash
# Add a default route via the VLAN gateway
ip route add default via 192.168.100.1 dev eth0.100

# Or add a specific network route via the VLAN
ip route add 10.0.0.0/8 via 192.168.100.1 dev eth0.100

# Verify routing
ip route show
```

## Persistent Configuration: Netplan (Ubuntu)

```yaml
# /etc/netplan/01-vlan.yaml
network:
  version: 2
  renderer: networkd

  ethernets:
    eth0:
      dhcp4: false

  vlans:
    eth0.100:
      id: 100
      link: eth0
      addresses:
        - 192.168.100.10/24
      routes:
        - to: default
          via: 192.168.100.1
      nameservers:
        addresses: [8.8.8.8, 8.8.4.4]
```

```bash
netplan apply
```

## Persistent Configuration: nmcli (RHEL/Fedora)

```bash
nmcli connection add \
    type vlan \
    con-name "vlan100" \
    dev eth0 \
    id 100 \
    ipv4.addresses "192.168.100.10/24" \
    ipv4.gateway "192.168.100.1" \
    ipv4.dns "8.8.8.8" \
    ipv4.method manual

nmcli connection up vlan100
```

## Persistent Configuration: /etc/network/interfaces (Debian)

```bash
# /etc/network/interfaces
auto eth0
iface eth0 inet manual

auto eth0.100
iface eth0.100 inet static
    address 192.168.100.10/24
    gateway 192.168.100.1
    dns-nameservers 8.8.8.8 8.8.4.4
    vlan-raw-device eth0
```

```bash
# Apply
ifup eth0.100
```

## Verify Static IP Configuration

```bash
# Show interface IP and state
ip addr show eth0.100

# Check routing table
ip route show dev eth0.100

# Test connectivity
ping -c 3 192.168.100.1

# Test internet connectivity
ping -c 3 8.8.8.8
```

## Conclusion

Assigning a static IPv4 address to a VLAN interface follows the same `ip addr add` and `ip route add` pattern as any other interface. For persistence, use the appropriate tool for your distribution: Netplan on Ubuntu, nmcli on RHEL, or `/etc/network/interfaces` on Debian. Always verify both the IP assignment and routing after configuration.
