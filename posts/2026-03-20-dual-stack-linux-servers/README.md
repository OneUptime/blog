# How to Configure Dual-Stack on Linux Servers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, IPv4, Dual-Stack, Linux, Networking

Description: Learn how to configure dual-stack IPv4 and IPv6 networking on Linux servers using NetworkManager, systemd-networkd, and legacy ifupdown tools.

## Overview

Configuring dual-stack on Linux means assigning both IPv4 and IPv6 addresses to an interface, ensuring both are routable, and configuring DNS to resolve both record types. Modern Linux systems use either NetworkManager or systemd-networkd for persistent network configuration.

## Check Existing Configuration

```bash
# Show addresses for all interfaces

ip addr show

# Sample output for dual-stack interface:
# 2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP>
#     inet  192.0.2.10/24 brd 192.0.2.255 scope global eth0
#     inet6 2001:db8::10/64 scope global
#     inet6 fe80::1/64 scope link

# Show IPv4 routes
ip route show

# Show IPv6 routes
ip -6 route show

# Test both
ping -4 8.8.8.8
ping -6 2001:4860:4860::8888
```

## SystemD-Networkd Configuration

```ini
# /etc/systemd/network/10-eth0.network

[Match]
Name=eth0

[Network]
# IPv4
Address=192.0.2.10/24
Gateway=192.0.2.1
DNS=192.0.2.53

# IPv6 (static)
Address=2001:db8::10/64
Gateway=2001:db8::1
DNS=2001:db8::53

# Enable SLAAC for an additional IPv6 address (optional)
IPv6AcceptRA=yes

[IPv6AcceptRA]
# Keep the static gateway and DNS, but still allow SLAAC
UseGateway=no
UseDNS=no
# systemd 246+: do not start DHCPv6 from RA
DHCPv6Client=no
```

```bash
# Apply configuration
sudo systemctl restart systemd-networkd

# Verify
networkctl status eth0
```

## NetworkManager Configuration

```bash
# Using nmcli - set both IPv4 and IPv6 on a connection
nmcli connection modify "Wired connection 1" \
    ipv4.addresses "192.0.2.10/24" \
    ipv4.gateway "192.0.2.1" \
    ipv4.dns "192.0.2.53" \
    ipv4.method "manual" \
    ipv6.addresses "2001:db8::10/64" \
    ipv6.gateway "2001:db8::1" \
    ipv6.dns "2001:db8::53" \
    ipv6.method "manual"

nmcli connection up "Wired connection 1"

# Verify
nmcli connection show "Wired connection 1" | grep -E "ipv[46]"
```

## Netplan Configuration (Ubuntu 18.04+)

```yaml
# /etc/netplan/01-netcfg.yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      accept-ra: false
      addresses:
        - 192.0.2.10/24
        - 2001:db8::10/64
      routes:
        - to: default
          via: 192.0.2.1
        - to: ::/0
          via: 2001:db8::1
      nameservers:
        addresses:
          - 192.0.2.53
          - 2001:db8::53
```

```bash
sudo netplan apply
```

## Legacy ifupdown (Debian/Ubuntu)

```bash
# /etc/network/interfaces

auto eth0
iface eth0 inet static
    address 192.0.2.10/24
    gateway 192.0.2.1

iface eth0 inet6 static
    address 2001:db8::10/64
    gateway 2001:db8::1
    autoconf 0
    accept_ra 0
```

## Kernel IPv6 Sysctl Settings

```bash
# /etc/sysctl.d/60-ipv6.conf

# Enable IPv6 forwarding (for routers - leave 0 on hosts)
# net.ipv6.conf.all.forwarding = 1

# Disable IPv6 on specific interface only (if needed)
# net.ipv6.conf.eth1.disable_ipv6 = 1

# Accept Router Advertisements on hosts; use 2 instead if forwarding is enabled
net.ipv6.conf.eth0.accept_ra = 1

# Privacy extensions (RFC 4941) - use temporary addresses for outbound
net.ipv6.conf.all.use_tempaddr = 2

# Prevent IPv6 from being disabled globally
net.ipv6.conf.all.disable_ipv6 = 0
net.ipv6.conf.default.disable_ipv6 = 0
```

```bash
sudo sysctl -p /etc/sysctl.d/60-ipv6.conf
```

## DNS Resolver for Dual-Stack

Ensure the resolver uses both record types:

```bash
# /etc/systemd/resolved.conf (systemd-resolved)
[Resolve]
DNS=192.0.2.53 2001:db8::53
FallbackDNS=8.8.8.8 2001:4860:4860::8888
DNSSEC=yes

# Restart
sudo systemctl restart systemd-resolved

# Test A and AAAA resolution
resolvectl query example.com

# Confirm both A and AAAA records are returned.
```

## Verify Dual-Stack Application Listening

```bash
# Check if service listens on both IPv4 and IPv6
ss -tlnp4
ss -tlnp6

# Nginx dual-stack: listen on both
# listen 80;          → IPv4
# listen [::]:80;     → IPv6

# Or use listen [::]:80 ipv6only=off  (listens on both from one directive)

# Check sshd
ss -tlnp | grep ssh
# tcp  0  0  0.0.0.0:22  0.0.0.0:*  LISTEN  sshd
# tcp  0  0  [::]:22     [::]:*      LISTEN  sshd
```

## Troubleshooting Dual-Stack Issues

```bash
# Check if IPv6 default route exists
ip -6 route show default
# Should show: default via 2001:db8::1 dev eth0

# Test IPv6 connectivity step by step
ping -6 fe80::1%eth0     # link-local gateway
ping -6 2001:db8::1      # global gateway
ping -6 2001:4860:4860::8888  # external IPv6

# Check for duplicate address (DAD failure)
ip -6 addr show dev eth0 | grep tentative
# If "tentative" persists → DAD conflict on link

# Traceroute both paths
traceroute -4 example.com
traceroute -6 example.com
```

## Summary

Dual-stack on Linux requires assigning both IPv4 and IPv6 addresses, configuring routes for both families, and ensuring DNS resolvers return both A and AAAA records. Use systemd-networkd or Netplan for modern Ubuntu/Debian systems, nmcli for NetworkManager-managed systems, or `/etc/network/interfaces` for legacy ifupdown. Verify application listen sockets cover both families (`[::]:port` with `ipv6only=off` handles both in one socket on Linux). Check the IPv6 default route and DAD status after configuring.
