# How to Configure IPv4 Networking with Netplan on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Ubuntu, Netplan, IPv4, Network Configuration, YAML

Description: Configure static and DHCP IPv4 addresses, custom routes, and DNS servers on Ubuntu using Netplan YAML configuration files and the netplan apply command.

## Introduction

Netplan is Ubuntu's default network configuration abstraction layer since 17.10. It reads YAML configuration files and generates the appropriate configuration for either `systemd-networkd` or `NetworkManager` as the renderer.

## Configuration File Location

Netplan files live in `/etc/netplan/`. Any `.yaml` file there is processed:

```bash
ls /etc/netplan/
# Common names: 00-installer-config.yaml, 01-netcfg.yaml

```

## DHCP Configuration

```yaml
# /etc/netplan/01-netcfg.yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp4: true
      dhcp6: false
```

## Static IPv4 Configuration

```yaml
# /etc/netplan/01-netcfg.yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      addresses:
        - 192.168.1.100/24
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses: [8.8.8.8, 1.1.1.1]
        search: [example.com]
      dhcp4: false
```

## Multiple IPv4 Addresses

```yaml
network:
  version: 2
  ethernets:
    eth0:
      addresses:
        - 192.168.1.100/24
        - 192.168.1.101/24
      routes:
        - to: default
          via: 192.168.1.1
```

## Multiple Interfaces

```yaml
network:
  version: 2
  ethernets:
    eth0:
      addresses: [192.168.1.100/24]
      routes:
        - to: default
          via: 192.168.1.1
          metric: 100
    eth1:
      addresses: [10.0.0.5/24]
      routes:
        - to: 172.16.0.0/12
          via: 10.0.0.1
```

## Custom Static Routes

```yaml
network:
  version: 2
  ethernets:
    eth0:
      addresses: [192.168.1.100/24]
      routes:
        - to: default
          via: 192.168.1.1
        - to: 10.0.0.0/8
          via: 192.168.1.254
          metric: 200
```

## Applying Configuration

```bash
# Test the configuration (auto-reverts after 120 seconds if not confirmed)
sudo netplan try

# Apply the configuration immediately
sudo netplan apply

# Generate backend config without applying
sudo netplan generate

# Debug netplan issues
sudo netplan --debug apply
```

## Verifying the Configuration

```bash
# Check applied network state
ip -4 addr show
ip route show
resolvectl status
```

## Common Mistakes

- YAML is indentation-sensitive - use spaces, not tabs
- Interface names may be `ens3`, `enp0s3`, or `eth0` depending on your hardware
- The `renderer` key determines whether `networkd` or `NetworkManager` is used

```bash
# Find the correct interface name
ip link show
```

## Conclusion

Netplan provides a unified, readable YAML syntax for network configuration on Ubuntu. Use `netplan try` before `netplan apply` to catch errors safely, and always verify the result with `ip addr` and `ip route` after applying.
