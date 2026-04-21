# How to Assign a Static IPv4 Address to a Bridge Interface

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Network Bridge, Static IP, IPv4, iproute2, Networking, Network Configuration

Description: Assign a static IPv4 address to a Linux bridge interface using ip addr, Netplan, nmcli, or systemd-networkd for host management access through the bridge.

## Introduction

When a Linux bridge replaces a physical interface as the network endpoint, the IP address must be assigned to the bridge itself - not to the physical interface. The physical interface becomes a "dumb" bridge port with no IP. This guide covers assigning static IPs to bridge interfaces using different methods.

## Assign IP to Bridge with ip addr

```bash
# Create bridge and add interface

ip link add br0 type bridge
ip addr flush dev eth0      # Remove IP from physical interface
ip link set eth0 master br0
ip link set eth0 up
ip link set br0 up

# Assign static IP to the bridge
ip addr add 192.168.1.100/24 dev br0

# Add default route
ip route add default via 192.168.1.1 dev br0

# Verify
ip addr show br0
ip route show
```

## Persistent with Netplan (Ubuntu)

```yaml
# /etc/netplan/01-bridge.yaml
network:
  version: 2
  renderer: networkd

  ethernets:
    eth0:
      dhcp4: false

  bridges:
    br0:
      interfaces: [eth0]
      addresses:
        - 192.168.1.100/24
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses: [8.8.8.8, 1.1.1.1]
      parameters:
        stp: false
```

## Persistent with nmcli (RHEL)

```bash
nmcli connection add type bridge con-name br0 ifname br0 \
    ipv4.method manual \
    ipv4.addresses "192.168.1.100/24" \
    ipv4.gateway "192.168.1.1" \
    ipv4.dns "8.8.8.8" \
    connection.autoconnect-ports 1

nmcli connection add type ethernet port-type bridge \
    con-name br0-port-eth0 ifname eth0 controller br0

nmcli connection up br0
```

## Persistent with systemd-networkd

```ini
# /etc/systemd/network/10-br0.netdev
[NetDev]
Name=br0
Kind=bridge
```

```ini
# /etc/systemd/network/10-br0.network
[Match]
Name=br0

[Network]
Address=192.168.1.100/24
Gateway=192.168.1.1
DNS=8.8.8.8
```

```ini
# /etc/systemd/network/20-eth0.network
[Match]
Name=eth0

[Network]
Bridge=br0
```

## Persistent with /etc/network/interfaces (Debian)

```bash
auto eth0
iface eth0 inet manual

auto br0
iface br0 inet static
    address 192.168.1.100
    netmask 255.255.255.0
    gateway 192.168.1.1
    bridge_ports eth0
    bridge_stp off
    bridge_fd 0
```

## Verify

```bash
# Check bridge IP
ip addr show br0

# Check routing
ip route show

# Test connectivity
ping -c 3 192.168.1.1
```

## Conclusion

Static IP assignment to a bridge follows the same `ip addr add` command as any other interface, but the physical interface must first be flushed of its IP and added to the bridge as a port. All network management tools (Netplan, nmcli, systemd-networkd) support bridge IP configuration natively. The physical interface becomes a transparent bridge port with no IP.
