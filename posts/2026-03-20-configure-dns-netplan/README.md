# How to Configure DNS Servers with Netplan

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Netplan, Ubuntu, DNS, Networking, Configuration

Description: Configure DNS servers and search domains on Ubuntu/Debian using Netplan YAML files, including per-interface DNS, search domains, and overriding DHCP-provided DNS.

## Introduction

Netplan configures DNS servers via the `nameservers` key under each interface. DNS settings are passed to the active renderer. On systems using `systemd-networkd`, they are then visible through `systemd-resolved`; with a NetworkManager renderer, NetworkManager manages the connection profile. You can set multiple DNS servers and search domains per interface.

## Configure DNS on a Static Interface

```yaml
# /etc/netplan/01-netcfg.yaml

network:
  version: 2
  ethernets:
    eth0:
      dhcp4: false
      addresses:
        - 192.168.1.100/24
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses:
          - 8.8.8.8
          - 1.1.1.1
          - 9.9.9.9
```

```bash
# Apply
netplan apply

# Verify DNS
resolvectl status eth0
```

## Configure DNS with Search Domains

```yaml
network:
  version: 2
  ethernets:
    eth0:
      dhcp4: false
      addresses:
        - 10.0.0.10/24
      routes:
        - to: default
          via: 10.0.0.1
      nameservers:
        addresses:
          - 10.0.0.53
          - 8.8.8.8
        search:
          - corp.example.com
          - dev.example.com
```

## Override DNS from DHCP

```yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp4: true
      # Override DHCP DNS with custom servers
      dhcp4-overrides:
        use-dns: false
      nameservers:
        addresses:
          - 1.1.1.1
          - 8.8.8.8
```

## Test DNS Resolution

```bash
# Test DNS via systemd-resolved
resolvectl query google.com

# Check which servers are being used
resolvectl status

# Query a specific DNS server directly with dig
dig @8.8.8.8 google.com
```

## Apply and Verify

```bash
# Apply changes
netplan apply

# Inspect /etc/resolv.conf (often a systemd-resolved stub)
cat /etc/resolv.conf

# Per-interface DNS status
resolvectl dns eth0
resolvectl domain eth0
```

## Multiple Interfaces with Different DNS

```yaml
network:
  version: 2
  ethernets:
    eth0:
      dhcp4: false
      addresses:
        - 192.168.1.10/24
      nameservers:
        addresses:
          - 192.168.1.1
        search:
          - internal.example.com
    eth1:
      dhcp4: false
      addresses:
        - 10.0.0.10/24
      nameservers:
        addresses:
          - 8.8.8.8
```

## Conclusion

DNS in Netplan is configured under the `nameservers` key with `addresses` (list of DNS servers) and optionally `search` (list of search domains). Use `dhcp4-overrides.use-dns: false` with the `networkd` renderer to ignore DNS from DHCP and use your own. Verify with `resolvectl status eth0` after applying.
