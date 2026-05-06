# How to Configure a Bond with Netplan

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Netplan, Ubuntu, Bonding, LACP, Networking

Description: Configure network interface bonding on Ubuntu and Debian using Netplan YAML, including active-backup, LACP, and other bonding modes.

## Introduction

Netplan configures bonds under the `bonds` key. Bond parameters like mode and MII monitor interval go in the `parameters` section. Member interfaces are listed under `interfaces`.

## Active-Backup Bond Configuration

```yaml
# /etc/netplan/01-netcfg.yaml

network:
  version: 2
  ethernets:
    eth0:
      dhcp4: false
    eth1:
      dhcp4: false

  bonds:
    bond0:
      interfaces:
        - eth0
        - eth1
      dhcp4: false
      addresses:
        - 192.168.1.10/24
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses:
          - 8.8.8.8
      parameters:
        mode: active-backup
        primary: eth0
        mii-monitor-interval: 100
```

```bash
sudo netplan apply
cat /proc/net/bonding/bond0
```

## LACP (802.3ad) Bond

```yaml
network:
  version: 2
  ethernets:
    eth0:
      dhcp4: false
    eth1:
      dhcp4: false
  bonds:
    bond0:
      interfaces:
        - eth0
        - eth1
      dhcp4: true
      parameters:
        mode: 802.3ad
        mii-monitor-interval: 100
        lacp-rate: fast
        transmit-hash-policy: layer3+4
```

## Round-Robin Bond

```yaml
network:
  version: 2
  ethernets:
    eth0:
      dhcp4: false
    eth1:
      dhcp4: false
  bonds:
    bond0:
      interfaces:
        - eth0
        - eth1
      dhcp4: true
      parameters:
        mode: balance-rr
        mii-monitor-interval: 100
```

## Bond Mode Options

| Mode | Value | Description |
|---|---|---|
| balance-rr | 0 | Round-robin |
| active-backup | 1 | Failover only |
| balance-xor | 2 | XOR hashing |
| broadcast | 3 | All interfaces |
| 802.3ad | 4 | LACP |
| balance-tlb | 5 | Adaptive TX |
| balance-alb | 6 | Adaptive RX+TX |

## Verify Bond

```bash
# Apply and check
sudo netplan apply
ip addr show bond0
cat /proc/net/bonding/bond0

# Should include:
# Bonding Mode: fault-tolerance (active-backup)
# Currently Active Slave: eth0
# Slave Interface: eth0
# Slave Interface: eth1
```

## VLAN on Top of Bond

```yaml
network:
  version: 2
  ethernets:
    eth0:
      dhcp4: false
    eth1:
      dhcp4: false
  bonds:
    bond0:
      interfaces: [eth0, eth1]
      parameters:
        mode: active-backup
  vlans:
    bond0.10:
      id: 10
      link: bond0
      dhcp4: false
      addresses:
        - 192.168.10.1/24
```

## Conclusion

Netplan bonds use the `bonds` section with `interfaces` listing member interfaces and `parameters` for mode, MII monitor interval, and LACP settings. If you define the member interfaces separately, set `dhcp4: false` and do not assign them IP addresses. Verify with `cat /proc/net/bonding/bond0` after applying.
