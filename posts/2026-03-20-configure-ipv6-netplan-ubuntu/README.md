# How to Configure IPv6 with Netplan on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Ubuntu, Netplan, Network Configuration, Linux

Description: A comprehensive guide to configuring IPv6 addresses, routing, and DNS on Ubuntu using Netplan, including static addresses, SLAAC, DHCPv6, and dual-stack setups.

## Netplan Overview

Netplan is Ubuntu's default network configuration tool since 18.04. It uses YAML files in `/etc/netplan/` that are applied by `netplan apply`. Netplan abstracts the underlying renderer (systemd-networkd or NetworkManager).

## Checking Your Netplan Version and Renderer

```bash
# Check Netplan version

netplan --version

# Check which renderer is active
systemctl is-active systemd-networkd
systemctl is-active NetworkManager

# View current network configuration
netplan get
```

## Configuring Static IPv6 Address

```yaml
# /etc/netplan/00-installer-config.yaml

network:
  version: 2
  renderer: networkd  # or NetworkManager

  ethernets:
    eth0:
      # IPv4 and IPv6 addresses (combined in a single addresses list)
      addresses:
        - 192.168.1.10/24          # IPv4 address
        - 2001:db8::10/64          # IPv6 address

      # Default routes (gateway4/gateway6 are deprecated since Netplan 0.103 / Ubuntu 22.04)
      routes:
        - to: default              # IPv4 default route (0.0.0.0/0)
          via: 192.168.1.1
        - to: default              # IPv6 default route (::/0)
          via: 2001:db8::1

      # DNS servers (both IPv4 and IPv6)
      nameservers:
        addresses:
          - 8.8.8.8
          - 2001:4860:4860::8888   # Google IPv6 DNS
          - 2001:4860:4860::8844
```

## Configuring SLAAC (Stateless Address Autoconfiguration)

SLAAC configures IPv6 addresses from Router Advertisements automatically:

```yaml
# /etc/netplan/00-installer-config.yaml

network:
  version: 2
  ethernets:
    eth0:
      dhcp4: true        # IPv4 via DHCP
      dhcp6: false       # Don't use DHCPv6 for address
      accept-ra: true    # Accept Router Advertisements (enables SLAAC)

      # SLAAC will generate an IPv6 address automatically from the RA prefix
      # No IPv6 addresses section needed for pure SLAAC
```

## Configuring DHCPv6

```yaml
# /etc/netplan/00-installer-config.yaml

network:
  version: 2
  ethernets:
    eth0:
      dhcp4: true
      dhcp6: true         # Get IPv6 address via DHCPv6

      # DHCPv6 options
      dhcp6-overrides:
        use-dns: true       # Use DNS from DHCPv6 server
        use-routes: true    # Use routes from DHCPv6 server
```

## Dual-Stack Configuration

Both IPv4 DHCP and IPv6 SLAAC:

```yaml
# /etc/netplan/00-installer-config.yaml

network:
  version: 2
  ethernets:
    eth0:
      # IPv4 via DHCP
      dhcp4: true

      # IPv6 via SLAAC + static
      dhcp6: false
      accept-ra: true       # Enable SLAAC from RA

      # Additional static IPv6 address (optional, alongside SLAAC)
      addresses:
        - 2001:db8::10/64   # Static IPv6 in addition to SLAAC address

      nameservers:
        addresses:
          - 8.8.8.8
          - 2001:4860:4860::8888
```

## Configuring IPv6 Privacy Extensions

```yaml
network:
  version: 2
  ethernets:
    eth0:
      dhcp4: true
      accept-ra: true

      # Enable IPv6 privacy extensions
      # Generates random temporary addresses (RFC 4941)
      ipv6-privacy: true
```

## Configuring IPv6 for a Specific Interface Only

```yaml
network:
  version: 2
  ethernets:
    eth0:
      dhcp4: true
      dhcp6: false
      accept-ra: false     # No IPv6 on eth0 (IPv4 only)

    eth1:
      dhcp4: false
      dhcp6: false
      accept-ra: true      # IPv6 only on eth1 via SLAAC
      addresses:
        - 2001:db8::1/64
      routes:
        - to: ::/0
          via: 2001:db8::254
```

## Applying Netplan Configuration

```bash
# Test configuration syntax
netplan try
# This applies changes temporarily and reverts after 120s unless confirmed

# Apply configuration permanently
netplan apply

# Debug mode (shows what networkd/NM commands are generated)
netplan --debug apply
```

## Verifying IPv6 Configuration

```bash
# Check assigned IPv6 addresses
ip -6 addr show eth0

# Check IPv6 routes
ip -6 route show

# Check DNS servers (systemd-resolved)
resolvectl status eth0

# Test IPv6 connectivity
ping6 2001:4860:4860::8888

# Test IPv6 DNS resolution
dig AAAA google.com @2001:4860:4860::8888
```

## Summary

Netplan configures IPv6 through simple YAML directives: use `addresses` for static IPv6, `accept-ra: true` for SLAAC from Router Advertisements, `dhcp6: true` for DHCPv6, and `ipv6-privacy: true` for privacy extensions. Apply changes with `netplan apply` and verify with `ip -6 addr show` and `ip -6 route show`.
