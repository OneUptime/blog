# How to Assign a Static IPv4 Address Using the ip Command on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Networking, IPv4, ip command, Network Configuration

Description: Assign a static IPv4 address to a Linux network interface using the ip command, including setting the prefix length, broadcast address, and verifying the configuration.

## Introduction

The `ip` command from the `iproute2` package is the modern replacement for `ifconfig` on Linux. It provides precise control over network addresses, routes, and link settings. This guide covers assigning a static IPv4 address to an interface.

## Basic Address Assignment

```bash
# Assign 192.168.1.100 with a /24 prefix to eth0

sudo ip addr add 192.168.1.100/24 dev eth0

# Verify the assignment
ip addr show dev eth0
```

Expected output:

```text
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP
    link/ether 00:1a:2b:3c:4d:5e brd ff:ff:ff:ff:ff:ff
    inet 192.168.1.100/24 brd 192.168.1.255 scope global eth0
       valid_lft forever preferred_lft forever
```

## Bring the Interface Up

The interface must be UP for traffic to flow:

```bash
# Bring eth0 up if it is down
sudo ip link set eth0 up

# Confirm the link state
ip link show eth0 | grep "state"
```

## Set a Default Gateway

```bash
# Add the default route via gateway 192.168.1.1
sudo ip route add default via 192.168.1.1 dev eth0

# Verify the routing table
ip route show
```

## Assigning a Specific Broadcast Address

The kernel computes the broadcast automatically. Override it only if needed:

```bash
# Explicit broadcast address
sudo ip addr add 192.168.1.100/24 broadcast 192.168.1.255 dev eth0
```

## Removing an Existing Address First

If the interface already has an address:

```bash
# Remove the old address before assigning a new one
sudo ip addr del 192.168.1.50/24 dev eth0

# Then assign the new one
sudo ip addr add 192.168.1.100/24 dev eth0
```

## Flushing All Addresses

```bash
# Remove all addresses from an interface
sudo ip addr flush dev eth0
```

## Making It Persistent

Addresses set with `ip addr` are not persistent across reboots. For persistence, use your distribution's network configuration tool:

**Netplan (Ubuntu):**

```yaml
# /etc/netplan/01-netcfg.yaml
network:
  version: 2
  ethernets:
    eth0:
      addresses: [192.168.1.100/24]
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses: [8.8.8.8]
```

```bash
sudo netplan apply
```

**Debian /etc/network/interfaces:**

```text
auto eth0
iface eth0 inet static
    address 192.168.1.100/24
    gateway 192.168.1.1
```

## Conclusion

`ip addr add <address>/<prefix> dev <interface>` is the definitive command for assigning IPv4 addresses on modern Linux. Combine it with `ip link set` to bring the interface up and `ip route add default` to set the gateway, then make it persistent through your distro's network configuration system.
