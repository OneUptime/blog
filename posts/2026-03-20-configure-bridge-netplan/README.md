# How to Configure a Bridge with Netplan

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Netplan, Ubuntu, Bridge, Networking, KVM

Description: Configure a Linux network bridge on Ubuntu and Debian using Netplan YAML, including attaching physical interfaces and assigning an IP address to the bridge.

## Introduction

Netplan bridge configuration uses the `bridges` key. Member physical interfaces are listed under `interfaces`, and IP configuration is set on the bridge itself. STP parameters are configured under `parameters`.

## Basic Bridge Configuration

```yaml
# /etc/netplan/01-netcfg.yaml

network:
  version: 2
  ethernets:
    eth0:
      dhcp4: false

  bridges:
    br0:
      interfaces:
        - eth0
      dhcp4: false
      addresses:
        - 192.168.1.10/24
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses:
          - 8.8.8.8
```

```bash
netplan apply
ip addr show br0
bridge link show
```

## Bridge with DHCP

```yaml
network:
  version: 2
  ethernets:
    eth0:
      dhcp4: false

  bridges:
    br0:
      interfaces:
        - eth0
      dhcp4: true
```

## Bridge with STP Enabled

```yaml
network:
  version: 2
  ethernets:
    eth0:
      dhcp4: false

  bridges:
    br0:
      interfaces:
        - eth0
      dhcp4: false
      addresses:
        - 192.168.1.10/24
      parameters:
        stp: true
        forward-delay: 4
        hello-time: 2
        max-age: 20
```

## Bridge with Multiple Interfaces

```yaml
network:
  version: 2
  ethernets:
    eth0:
      dhcp4: false
    eth1:
      dhcp4: false

  bridges:
    br0:
      interfaces:
        - eth0
        - eth1
      dhcp4: false
      addresses:
        - 192.168.1.10/24
      routes:
        - to: default
          via: 192.168.1.1
```

## Bridge for KVM VMs (No IP on Bridge)

```yaml
network:
  version: 2
  ethernets:
    eth0:
      dhcp4: false

  bridges:
    br0:
      interfaces:
        - eth0
      # No IP on br0; the host will not be addressable on this network
      dhcp4: false
      parameters:
        stp: false
```

## Verify Bridge

```bash
# Show bridge interfaces
ip link show type bridge

# Show bridge members
bridge link show

# Check MAC table
bridge fdb show br br0
```

## Conclusion

Netplan bridges use the `bridges` section with `interfaces` listing member physical interfaces. The member interfaces must also be defined in the Netplan configuration, and IP configuration goes on the bridge device instead of on those member interfaces. STP is configured in `parameters`. Apply with `netplan apply` and verify with `bridge link show`.
