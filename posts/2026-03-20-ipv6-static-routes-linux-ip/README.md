# How to Add IPv6 Static Routes on Linux with ip Command

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Linux, Static Routes, ip command, Networking

Description: Learn how to add, modify, and remove IPv6 static routes on Linux using the iproute2 ip command, with examples for persistent configuration.

## Overview

Static IPv6 routes tell the Linux kernel how to reach specific networks by specifying an explicit next-hop gateway. They are useful for inter-VLAN routing, site-to-site connectivity, and when dynamic routing protocols are not in use.

## Adding a Static Route

```bash
# Add a route to 2001:db8:1::/48 via a gateway

sudo ip -6 route add 2001:db8:1::/48 via 2001:db8::1

# Add a route specifying the exit interface
sudo ip -6 route add 2001:db8:1::/48 via fe80::1 dev eth0

# Add a route with a specific metric (lower = higher priority)
sudo ip -6 route add 2001:db8:1::/48 via 2001:db8::1 metric 100

# Add a host route (/128) to a specific IPv6 address
sudo ip -6 route add 2001:db8::100/128 via 2001:db8::1
```

**Note:** When using a link-local next hop (fe80::), you must specify the `dev` parameter because link-local addresses are not unique across interfaces.

## Adding a Default Route

```bash
# Add IPv6 default route via a global address
sudo ip -6 route add default via 2001:db8::1

# Add IPv6 default route via a link-local gateway (common for routers)
sudo ip -6 route add default via fe80::1 dev eth0
```

## Viewing and Verifying Routes

```bash
# Verify the route was added
ip -6 route show | grep "2001:db8:1"

# Test that the route resolves correctly for a specific destination
ip -6 route get 2001:db8:1::100

# Expected output:
# 2001:db8:1::100 via 2001:db8::1 dev eth0 src 2001:db8::2 metric 100
```

## Deleting a Static Route

```bash
# Delete a specific route
sudo ip -6 route del 2001:db8:1::/48 via 2001:db8::1

# Delete the default route
sudo ip -6 route del default

# Delete a route by destination prefix when it is unambiguous
sudo ip -6 route del 2001:db8:1::/48
```

## Making Routes Persistent

Routes added with `ip route add` are lost on reboot. To persist them:

### On Debian/Ubuntu (using /etc/network/interfaces)

```bash
# /etc/network/interfaces
iface eth0 inet6 static
    address 2001:db8::2/64
    gateway 2001:db8::1
    up ip -6 route add 2001:db8:1::/48 via 2001:db8::1
    down ip -6 route del 2001:db8:1::/48 via 2001:db8::1
```

### On RHEL/CentOS systems using legacy network-scripts

```bash
# /etc/sysconfig/network-scripts/route6-eth0
2001:db8:1::/48 via 2001:db8::1 dev eth0
2001:db8:2::/48 via 2001:db8::1 dev eth0 metric 200
```

### Using systemd-networkd

```ini
# /etc/systemd/network/10-eth0.network
[Network]
Address=2001:db8::2/64
Gateway=2001:db8::1

[Route]
Destination=2001:db8:1::/48
Gateway=2001:db8::1
Metric=100
```

### Using NetworkManager

```bash
# Add a persistent static IPv6 route via nmcli
nmcli connection modify "Wired connection 1" \
  +ipv6.routes "2001:db8:1::/48 2001:db8::1 100"
nmcli connection up "Wired connection 1"
```

## Adding Multiple Routes at Once

```bash
# Add multiple routes in batch mode
cat <<EOF | sudo ip -6 -batch -
route add 2001:db8:1::/48 via 2001:db8::1
route add 2001:db8:2::/48 via 2001:db8::1 metric 200
route add 2001:db8:3::/48 via fe80::1 dev eth0
EOF
```

## Summary

IPv6 static routes are added with `ip -6 route add <prefix> via <gateway>`. Always include `dev` when using link-local next hops. For persistence, use systemd-networkd `.network` files, NetworkManager, or `route6-*` files on systems that still use legacy network-scripts. Test routes with `ip -6 route get` before applying them in production.
