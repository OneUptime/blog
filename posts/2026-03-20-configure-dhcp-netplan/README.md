# How to Configure DHCP with Netplan

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Netplan, Ubuntu, DHCP, IPv4, Networking

Description: Configure DHCP-based IPv4 addressing using Netplan YAML on Ubuntu and Debian systems, with options for DHCP overrides and mixed static/DHCP configurations.

## Introduction

Netplan enables DHCP with `dhcp4: true`. This is the simplest network configuration - the DHCP server typically provides the IPv4 address, routes, and DNS settings. Additional DHCP options can be controlled via the `dhcp4-overrides` section.

## Basic DHCP Configuration

```yaml
# /etc/netplan/01-netcfg.yaml

network:
  version: 2
  ethernets:
    eth0:
      dhcp4: true
```

```bash
# Apply
netplan apply

# Verify
ip addr show eth0
ip route show
```

## DHCP with Custom Overrides

Some override keys are only supported with the `systemd-networkd` renderer, so this example sets it explicitly.

```yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp4: true
      # Use MAC as the DHCPv4 client identifier
      dhcp-identifier: mac
      dhcp4-overrides:
        # Send a custom hostname to the DHCP server
        hostname: myserver
        # Do not use DNS from DHCP
        use-dns: false
        # Do not install routes from DHCP
        use-routes: false
      nameservers:
        addresses:
          - 8.8.8.8
```

## DHCP on Multiple Interfaces

```yaml
network:
  version: 2
  ethernets:
    eth0:
      dhcp4: true
    eth1:
      dhcp4: true
```

## Mixed DHCP and Static on Same Interface

```yaml
network:
  version: 2
  ethernets:
    eth0:
      # DHCP for primary IP
      dhcp4: true
      # Additional static secondary IPs
      addresses:
        - 192.168.1.200/24
```

## DHCP with Route Metric

```yaml
network:
  version: 2
  ethernets:
    eth0:
      dhcp4: true
      dhcp4-overrides:
        route-metric: 100
```

## Apply and Troubleshoot

```bash
# Apply configuration
netplan apply

# Generate without applying (check for errors)
netplan generate

# Show DHCP lease details
netplan ip leases eth0

# On systems using systemd-networkd, show link status
networkctl status eth0
```

## DHCP4-Overrides Reference

| Key | Default | Description |
|---|---|---|
| `use-dns` | true | Accept DNS from DHCP (`networkd` only) |
| `use-ntp` | true | Accept NTP servers (`networkd` only) |
| `send-hostname` | true | Send the local hostname to the DHCP server (`networkd` only) |
| `use-hostname` | true | Accept the hostname from DHCP (`networkd` only) |
| `use-mtu` | true | Accept the MTU from DHCP (`networkd` only) |
| `hostname` | system hostname | Override the hostname sent to the DHCP server (`networkd` only) |
| `use-routes` | true | Install routes from DHCP |
| `route-metric` | backend default | Metric for DHCP-assigned routes |
| `use-domains` | unset | Accept DHCP-provided DNS search domains (`networkd` only) |

## Conclusion

DHCP in Netplan is as simple as `dhcp4: true`. Use `dhcp4-overrides` to control what DHCP options are accepted. Apply with `netplan apply`, and verify with `ip addr show`. Use `netplan try` to test changes safely before committing.
