# How to Configure IPv6 Routes with Netplan

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Netplan, IPv6, Static Routes, Routing, Ubuntu

Description: Add static IPv6 routes including host routes, network routes, and policy-based routes using Netplan YAML.

## Overview

Add static IPv6 routes including host routes, network routes, and policy-based routes using Netplan YAML.

## Prerequisites

- Ubuntu 18.04+ or Debian 10+ with Netplan installed
- Root or sudo access
- Basic understanding of IPv6 addressing

## Netplan File Location

Netplan configuration files are in `/etc/netplan/` with `.yaml` extension. Files are processed in lexicographic order.

```bash
# List existing Netplan configs

ls /etc/netplan/

# View current config
cat /etc/netplan/01-netcfg.yaml
```

## Configuration Example

```yaml
# /etc/netplan/01-netcfg.yaml
network:
  version: 2
  renderer: networkd

  ethernets:
    eth0:
      # Enable DHCPv6
      dhcp6: true

      # SLAAC (accept router advertisements)
      accept-ra: true

      # Privacy extensions (RFC 4941)
      ipv6-privacy: true

      # Static IPv6 in addition
      addresses:
        - "2001:db8::100/64"

      # IPv6 routes
      routes:
        - to: "::/0"
          via: "2001:db8::1"

      # DNS
      nameservers:
        addresses:
          - "2001:4860:4860::8888"
          - "2001:4860:4860::8844"
```

## DHCPv6 Configuration

```yaml
network:
  version: 2
  ethernets:
    eth0:
      dhcp4: true
      # Enable DHCPv6 for stateful IPv6 address assignment
      dhcp6: true
      # Also accept Router Advertisements (for default gateway)
      accept-ra: true
      # Optional: request specific DHCPv6 options
      dhcp6-overrides:
        use-dns: true
        use-domains: true
```

## SLAAC Configuration

```yaml
network:
  version: 2
  ethernets:
    eth0:
      dhcp4: true
      dhcp6: false     # No stateful DHCPv6
      accept-ra: true  # Accept RAs for SLAAC + default route
      ipv6-privacy: true  # Use temporary addresses
```

## Applying and Testing

```bash
# Validate YAML syntax
sudo netplan generate

# Test with automatic rollback after 120 seconds
# (Press Enter to confirm or wait for rollback)
sudo netplan try

# Apply permanently
sudo netplan apply

# Verify IPv6 is working
ip -6 addr show
ip -6 route show
ping6 -c 4 2001:4860:4860::8888

# Check systemd-networkd logs for issues
sudo journalctl -u systemd-networkd -n 50 --no-pager

# Debug with verbose output
sudo netplan --debug apply 2>&1 | head -50
```

## Checking Privacy Extensions

```bash
# Verify privacy extensions are active
ip -6 addr show dev eth0

# Look for "temporary" in the output:
# inet6 2001:db8::xxxx scope global temporary dynamic
# inet6 2001:db8::yyyy scope global mngtmpaddr noprefixroute

# Check kernel settings
sysctl net.ipv6.conf.eth0.use_tempaddr
# Should be 2 (prefer temporary addresses)
```

## Monitoring with OneUptime

Use [OneUptime](https://oneuptime.com) to monitor your server's IPv6 connectivity after applying Netplan changes. Configure ICMP monitors for your static IPv6 address and set up alerts to notify you if the IPv6 address becomes unreachable after a configuration change.

## Conclusion

Configuring IPv6 with Netplan uses clean YAML syntax. Key options are `dhcp6: true` for DHCPv6, `accept-ra: true` for SLAAC, `ipv6-privacy: true` for RFC 4941 temporary addresses, and static addresses in the `addresses` list. Always use `netplan try` before `netplan apply` to test changes safely.
