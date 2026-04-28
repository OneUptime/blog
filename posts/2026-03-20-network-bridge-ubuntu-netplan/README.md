# How to Create a Network Bridge on Ubuntu Using Netplan

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Network Bridge, Netplan, Networking, KVM, Virtualization

Description: Configure a persistent network bridge on Ubuntu using Netplan YAML configuration for virtual machine networking or physical network bridging.

## Introduction

Ubuntu's Netplan provides a declarative way to configure network bridges that persists across reboots. The `bridges` section in Netplan YAML defines bridge interfaces, their member interfaces, and IP configuration. This is the standard approach for KVM hypervisor networking on Ubuntu.

## Prerequisites

- Ubuntu 18.04+
- Netplan installed
- Root access

## Basic Bridge Configuration

```yaml
# /etc/netplan/01-bridge.yaml

network:
  version: 2
  renderer: networkd

  ethernets:
    eth0:
      # eth0 becomes a bridge port - no IP needed
      dhcp4: false

  bridges:
    br0:
      interfaces:
        - eth0
      addresses:
        - 192.168.1.100/24
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses: [8.8.8.8, 8.8.4.4]
      parameters:
        stp: false
        forward-delay: 0
```

## Apply the Configuration

```bash
# Validate YAML first
netplan generate

# Apply
netplan apply

# Verify
bridge link show
ip addr show br0
```

## Bridge with STP Enabled

For environments where loops are possible (multiple bridges), enable STP:

```yaml
bridges:
  br0:
    interfaces: [eth0]
    addresses: [192.168.1.100/24]
    parameters:
      stp: true
      forward-delay: 4  # Seconds before entering forwarding state
      hello-time: 2
      max-age: 6
      priority: 32768
```

## Bridge for KVM with DHCP

For a KVM host where the management IP comes from DHCP:

```yaml
network:
  version: 2
  renderer: networkd

  ethernets:
    eth0:
      dhcp4: false

  bridges:
    br0:
      interfaces: [eth0]
      dhcp4: true
      parameters:
        stp: false
        forward-delay: 0
```

## Bridge with Two Physical Interfaces

```yaml
ethernets:
  eth0: {dhcp4: false}
  eth1: {dhcp4: false}

bridges:
  br0:
    interfaces: [eth0, eth1]
    addresses: [192.168.1.100/24]
    parameters:
      stp: true
```

## Verify the Bridge

```bash
# Show bridge ports and their states
bridge link show

# Show bridge details via networkctl
networkctl status br0

# Check the bridge FDB (forwarding database)
bridge fdb show br br0

# Test connectivity
ping -I br0 192.168.1.1
```

## Conclusion

Netplan bridges on Ubuntu are configured in the `bridges:` section with `interfaces` listing the bridge ports. Set `forward-delay: 0` and `stp: false` for KVM environments where loops are not a concern. The configuration is persistent across reboots without additional steps. Apply with `netplan apply` and verify with `bridge link show`.
