# How to Configure IPv6 Default Gateway on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Linux, Default Gateway, Networking, ip command

Description: Learn how to configure, verify, and persist an IPv6 default gateway on Linux using the ip command, systemd-networkd, and NetworkManager.

## Overview

The IPv6 default route is the `::/0` route, and its gateway is the next-hop router used when no more-specific route exists. Misconfiguring or missing the default gateway is one of the most common causes of IPv6 connectivity failures.

## Adding the Default Gateway Temporarily

```bash
# Add a default gateway via a global IPv6 address

sudo ip -6 route add default via 2001:db8::1

# Add a default gateway via a link-local address (most common from Router Advertisements)
# Link-local gateways REQUIRE specifying the interface with 'dev'
sudo ip -6 route add default via fe80::1 dev eth0

# Verify the default route was added
ip -6 route show default
# Output: default via fe80::1 dev eth0 proto static metric 1024
```

## Replacing an Existing Default Gateway

```bash
# Replace (atomically) the current default gateway
sudo ip -6 route replace default via fe80::2 dev eth0

# Or delete the old one and add the new one
sudo ip -6 route del default
sudo ip -6 route add default via fe80::2 dev eth0
```

## Making the Default Gateway Persistent

### systemd-networkd (Recommended on modern systems)

```ini
# /etc/systemd/network/10-eth0.network
[Match]
Name=eth0

[Network]
Address=2001:db8::2/64
Gateway=2001:db8::1
DNS=2001:4860:4860::8888
```

```bash
# Apply the configuration
sudo systemctl restart systemd-networkd
```

### NetworkManager

```bash
# Set IPv6 gateway with nmcli
nmcli connection modify "Wired connection 1" \
  ipv6.addresses "2001:db8::2/64" \
  ipv6.gateway "2001:db8::1" \
  ipv6.method manual
nmcli connection up "Wired connection 1"

# Verify
nmcli connection show "Wired connection 1" | grep ipv6.gateway
```

### Debian/Ubuntu with /etc/network/interfaces

```bash
# /etc/network/interfaces
iface eth0 inet6 static
    address 2001:db8::2
    netmask 64
    gateway 2001:db8::1
```

### RHEL/CentOS with ifcfg files

```bash
# /etc/sysconfig/network-scripts/ifcfg-eth0
IPV6INIT=yes
IPV6ADDR=2001:db8::2/64
IPV6_DEFAULTGW=2001:db8::1
```

## Router Advertisement vs Static Gateway

In most environments, the default gateway is set automatically via **Router Advertisement (RA)**:

```bash
# Check if the gateway was learned from RA
ip -6 route show default
# default via fe80::1 dev eth0 proto ra metric 1024 expires 1800sec

# If the gateway is "proto ra", it came from the router's RA messages
# If "proto static", it was manually configured
```

## Verifying Connectivity Through the Gateway

```bash
# Ping the gateway to confirm it's reachable
ping -6 fe80::1%eth0   # Note: % notation for link-local

# Ping a remote IPv6 address to confirm forwarding works
ping -6 2001:4860:4860::8888

# Trace the path to verify default route is used
traceroute -6 2001:4860:4860::8888
```

## Troubleshooting Missing Gateway

```bash
# If no default route exists, check whether the router is sending RAs
# If the router uses radvd, verify radvd is running
sudo systemctl status radvd

# Check RA messages are being received on the client
sudo tcpdump -i eth0 -n "icmp6 and ip6[40] == 134"
# 134 = Router Advertisement ICMPv6 type
```

## Summary

Configure the IPv6 default route with `ip -6 route add default via <gateway> dev <interface>`. For persistence, use systemd-networkd `.network` files or NetworkManager. Remember that link-local gateways always require the `dev` parameter. Verify with `ip -6 route show default` and test with `ping -6`.
