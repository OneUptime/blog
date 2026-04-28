# How to Configure Network Bonding on Debian with /etc/network/interfaces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Debian, Network Bonding, Ifupdown, /etc/network/interfaces, Link Aggregation, Networking

Description: Set up network interface bonding on Debian using the /etc/network/interfaces file and the ifenslave tool for persistent link redundancy configuration.

## Introduction

Debian with the traditional `ifupdown` network stack uses `/etc/network/interfaces` for persistent network configuration. Bonding requires the `ifenslave` package which provides the tooling to attach slave interfaces to a bond master.

## Prerequisites

- Debian (or older Ubuntu using ifupdown)
- The `ifenslave` package installed
- Root access

## Install Required Packages

```bash
# Install ifenslave and the bonding utilities

apt install ifenslave

# Load the bonding module
modprobe bonding

# Make it persistent
echo "bonding" > /etc/modules-load.d/bonding.conf
```

## Active-Backup Bond Configuration

```bash
# /etc/network/interfaces

# Ensure slave interfaces have no configuration
auto eth0
iface eth0 inet manual
    bond-master bond0

auto eth1
iface eth1 inet manual
    bond-master bond0

# Bond master configuration
auto bond0
iface bond0 inet static
    address 192.168.1.100
    netmask 255.255.255.0
    gateway 192.168.1.1
    dns-nameservers 8.8.8.8

    # Bond options
    bond-slaves eth0 eth1
    bond-mode active-backup
    bond-miimon 100
    bond-primary eth0
```

## DHCP Bond

```bash
auto bond0
iface bond0 inet dhcp
    bond-slaves eth0 eth1
    bond-mode active-backup
    bond-miimon 100
```

## LACP (802.3ad) Bond

```bash
auto eth0
iface eth0 inet manual
    bond-master bond-lacp

auto eth1
iface eth1 inet manual
    bond-master bond-lacp

auto bond-lacp
iface bond-lacp inet static
    address 192.168.1.100
    netmask 255.255.255.0
    gateway 192.168.1.1
    bond-slaves eth0 eth1
    bond-mode 802.3ad
    bond-miimon 100
    bond-lacp-rate fast
    bond-xmit-hash-policy layer3+4
```

## Apply the Configuration

```bash
# Bring up the bond
ifup bond0

# Or restart networking
systemctl restart networking

# Verify
ip addr show bond0
cat /proc/net/bonding/bond0
```

## Available Bond Options in interfaces File

```bash
# Key options:
# bond-slaves        List of slave interfaces
# bond-mode          Bonding mode (active-backup, balance-rr, 802.3ad, etc.)
# bond-miimon        MII link monitoring interval in ms
# bond-primary       Primary interface (for active-backup)
# bond-lacp-rate     LACP rate (slow/fast)
# bond-updelay       Delay before enslaving after link up (ms)
# bond-downdelay     Delay before failover after link down (ms)
```

## Conclusion

Debian bonding uses `/etc/network/interfaces` with `ifenslave` for persistent configuration. Define slave interfaces with `bond-master`, then configure the bond master with `bond-slaves`, `bond-mode`, and `bond-miimon`. The `ifenslave` package handles the actual interface attachment. Always load the `bonding` module at boot via `/etc/modules-load.d/`.
