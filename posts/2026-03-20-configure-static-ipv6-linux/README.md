# How to Configure Static IPv6 Addresses on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Linux, Static Address, Network Configuration, ip command

Description: A practical guide to assigning static IPv6 addresses on Linux using the ip command, Netplan, NetworkManager, and persistent configuration methods.

## Assigning a Static IPv6 Address with ip Command

The `ip` command provides immediate IPv6 address assignment:

```bash
# Add a static IPv6 address to eth0

ip -6 addr add 2001:db8::10/64 dev eth0

# Verify the address is assigned
ip -6 addr show dev eth0

# Add a second IPv6 address (multiple addresses per interface is normal in IPv6)
ip -6 addr add 2001:db8::20/64 dev eth0

# Remove an IPv6 address
ip -6 addr del 2001:db8::20/64 dev eth0

# Note: ip command changes are NOT persistent across reboots
# Use persistent configuration methods below for permanent setup
```

## Adding a Static Default IPv6 Route

```bash
# Add default IPv6 route via a gateway
ip -6 route add default via 2001:db8::1 dev eth0

# Verify the route
ip -6 route show default

# Add a more specific static route
ip -6 route add 2001:db8:1234::/48 via 2001:db8::1 dev eth0
```

## Persistent Configuration: Ubuntu (Netplan)

```yaml
# /etc/netplan/00-installer-config.yaml

network:
  version: 2
  ethernets:
    eth0:
      dhcp4: false
      dhcp6: false
      addresses:
        - 192.168.1.10/24      # IPv4
        - 2001:db8::10/64      # IPv6 static
      routes:
        - to: default
          via: 192.168.1.1
        - to: "::/0"
          via: 2001:db8::1
      nameservers:
        addresses:
          - 8.8.8.8
          - 2001:4860:4860::8888
```

```bash
netplan apply
```

## Persistent Configuration: RHEL/CentOS (NetworkManager)

```bash
# Using nmcli
nmcli connection modify eth0 \
    ipv6.method manual \
    ipv6.addresses "2001:db8::10/64" \
    ipv6.gateway "2001:db8::1" \
    ipv6.dns "2001:4860:4860::8888"

nmcli connection up eth0
```

Or edit the connection file directly:

```ini
# /etc/NetworkManager/system-connections/eth0.nmconnection

[ipv6]
method=manual
addresses=2001:db8::10/64
gateway=2001:db8::1
dns=2001:4860:4860::8888;
```

## Persistent Configuration: Debian Legacy (interfaces file)

```bash
# /etc/network/interfaces

auto eth0
iface eth0 inet static
    address 192.168.1.10/24
    gateway 192.168.1.1

iface eth0 inet6 static
    address 2001:db8::10/64
    gateway 2001:db8::1
    dns-nameservers 2001:4860:4860::8888
```

```bash
systemctl restart networking
```

## Persistent Configuration: systemd-networkd

```ini
# /etc/systemd/network/10-eth0.network

[Match]
Name=eth0

[Network]
Address=192.168.1.10/24
Address=2001:db8::10/64
Gateway=192.168.1.1
Gateway=2001:db8::1
DNS=8.8.8.8
DNS=2001:4860:4860::8888
```

## Adding Multiple Static IPv6 Addresses

IPv6 is designed to support multiple addresses per interface:

```bash
# Add multiple addresses for different purposes
# Global unicast for internet
ip -6 addr add 2001:db8::10/64 dev eth0

# ULA for internal services
ip -6 addr add fd00:db8::10/64 dev eth0

# Link-local is always auto-generated (fe80::...)
# You can also set a custom link-local
ip -6 addr add fe80::1/64 dev eth0 scope link
```

## IPv6 Address with Preferred Lifetime

IPv6 addresses have two lifetimes: preferred (for new connections) and valid (the address remains active):

```bash
# Add an address with specific lifetimes
# preferred_lft: prefer for 3600 seconds
# valid_lft: valid for 7200 seconds
ip -6 addr add 2001:db8::10/64 dev eth0 \
    preferred_lft 3600 valid_lft 7200

# Add a permanent address (no expiry)
ip -6 addr add 2001:db8::10/64 dev eth0 \
    preferred_lft forever valid_lft forever
```

## Verifying Static IPv6 Configuration

```bash
# Show all IPv6 addresses
ip -6 addr show

# Show addresses on a specific interface
ip -6 addr show dev eth0

# Show only global (non-link-local) addresses
ip -6 addr show dev eth0 scope global

# Test connectivity
ping6 -c 3 2001:db8::1         # ping default gateway
ping6 -c 3 2001:4860:4860::8888 # ping public IPv6

# Verify routing
ip -6 route show
ip -6 route get 2001:4860:4860::8888  # shows which route will be used
```

## Summary

Assign static IPv6 addresses temporarily with `ip -6 addr add <addr>/<prefix> dev <iface>`. For persistence: use Netplan (`addresses: [2001:db8::10/64]`) on Ubuntu, `nmcli connection modify ipv6.method manual ipv6.addresses` on RHEL, or `.network` files with `Address=` for systemd-networkd. Always add a default IPv6 route via the gateway and configure IPv6 DNS servers. Verify with `ip -6 addr show` and `ping6`.
