# How to Add an IPv4 Address to an Interface with ip addr add

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, ip command, iproute2, IPv4, Networking

Description: Add an IPv4 address to a network interface using the ip addr add command, including primary and secondary addresses, labels, and broadcast configuration.

## Introduction

`ip addr add` assigns an IPv4 address to a network interface. Changes take effect immediately but are not persistent across reboots - use Netplan, nmcli, or systemd-networkd for persistent configuration.

## Add an IPv4 Address

```bash
# Add 192.168.1.100/24 to eth0

ip addr add 192.168.1.100/24 dev eth0

# Verify
ip addr show eth0
```

## Add a Broadcast Address

```bash
# Specify broadcast explicitly
ip addr add 192.168.1.100/24 broadcast 192.168.1.255 dev eth0

# Or let the kernel calculate it automatically
ip addr add 192.168.1.100/24 broadcast + dev eth0
```

## Add a Secondary (Additional) IP Address

```bash
# First IP
ip addr add 192.168.1.100/24 dev eth0

# Second IP on the same interface
ip addr add 192.168.1.101/24 dev eth0

# Both are active simultaneously
ip -4 addr show eth0
```

## Add IP with a Label

```bash
# Labels tag the address; eth0:1 is a common label format
ip addr add 192.168.1.101/24 dev eth0 label eth0:1

# Verify
ip addr show eth0
```

## Add a /32 Host Address

```bash
# Single host address (common for loopback-style IPs)
ip addr add 10.0.0.1/32 dev lo
ip addr add 10.0.0.2/32 dev lo
```

## Bring Interface Up After Adding Address

```bash
# Add IP and bring interface up
ip addr add 192.168.1.100/24 dev eth0
ip link set eth0 up
```

## Verify the Address Was Added

```bash
# Show IPv4 addresses
ip -4 addr show eth0

# Brief view
ip -4 -brief addr show eth0
```

## Add Address and Check Route

```bash
# Adding an IP to an interface automatically creates a connected route
ip addr add 192.168.1.100/24 dev eth0
ip route show | grep 192.168.1.0
# Shows: 192.168.1.0/24 dev eth0 proto kernel scope link src 192.168.1.100
```

## Persistent Configuration

```bash
# For persistent IP configuration, use one of:

# Netplan (Ubuntu)
# /etc/netplan/01-netcfg.yaml → addresses: [192.168.1.100/24]

# nmcli (RHEL/NetworkManager)
# nmcli con mod "eth0" ipv4.method manual ipv4.addresses 192.168.1.100/24

# systemd-networkd
# /etc/systemd/network/eth0.network → [Address] Address=192.168.1.100/24
```

## Conclusion

`ip addr add <address>/<prefix> dev <interface>` immediately assigns an IPv4 address to an interface. Multiple addresses can be added to the same interface. For persistence across reboots, configure through Netplan, nmcli, or systemd-networkd rather than using `ip addr add` directly.
