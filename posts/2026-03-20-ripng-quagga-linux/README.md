# How to Configure RIPng on Linux with Quagga

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RIPng, Quagga, Linux, IPv6, Routing

Description: Learn how to configure RIPng on Linux using the legacy Quagga routing suite for IPv6 distance-vector routing.

## Overview

Quagga is the predecessor to FRRouting (FRR) and is still found on older systems. Its `ripngd` daemon provides RIPng support. The configuration is nearly identical to FRRouting, as FRR was forked from Quagga.

**Note**: Quagga is no longer actively maintained. For new deployments, use FRRouting instead.

## Installation

```bash
# Debian/Ubuntu (older systems)

sudo apt install quagga

# RHEL/CentOS 7
sudo yum install quagga
```

## Enabling ripngd

```bash
# On Debian/Ubuntu versions that use /etc/quagga/daemons
sudo nano /etc/quagga/daemons
# Set: zebra=yes and ripngd=yes
sudo systemctl enable quagga
sudo systemctl start quagga

# On packages with per-daemon systemd units
sudo systemctl enable zebra ripngd
sudo systemctl start zebra
sudo systemctl start ripngd

# Verify it's running
sudo systemctl status ripngd
# Or, on older Debian/Ubuntu packages: sudo systemctl status quagga
```

## Configuration File Structure

Quagga uses separate config files for each daemon:

```bash
# Create the ripngd configuration file
sudo nano /etc/quagga/ripngd.conf
```

```text
! /etc/quagga/ripngd.conf
!
hostname ripngd
password zebra
enable password zebra
!
router ripng
 network eth0
 network eth1
 redistribute connected
!
```

## Enable IPv6 Forwarding

```bash
sudo sysctl -w net.ipv6.conf.all.forwarding=1
```

## Connecting to the ripngd Console

```text
# Connect to the ripngd Telnet console (port 2603)
telnet localhost 2603
Password: zebra
ripngd> enable
Password: zebra

# Or use vtysh (if installed)
vtysh
```

## Configuration via Console

```text
# In the ripngd console or vtysh
ripngd> enable
Password: zebra
ripngd# configure terminal
ripngd(config)# router ripng
ripngd(config-router)# network eth0
ripngd(config-router)# network eth1
ripngd(config-router)# redistribute connected
ripngd(config-router)# exit
ripngd(config)# exit
ripngd# write file
```

## Verification Commands

```text
! Show RIPng routes
ripngd# show ip ripng

! Show routing table (from zebra or vtysh)
zebra# show ipv6 route

! Show debug information
ripngd# debug ripng events
ripngd# debug ripng packet
```

## Zebra (Quagga's Route Manager)

Quagga requires the `zebra` daemon to manage the kernel routing table:

```text
! /etc/quagga/zebra.conf
hostname zebra
password zebra
enable password zebra
```

```bash
# Start zebra first
sudo systemctl start zebra
sudo systemctl start ripngd
```

## Migrating from Quagga to FRRouting

FRRouting is the successor to Quagga. Configuration commands are mostly compatible, but current FRR saves configuration in `/etc/frr/frr.conf` rather than updating per-daemon files:

```bash
# Install FRR
sudo apt install frr

# Merge the Quagga RIPng stanza into FRR's integrated config
sudo nano /etc/frr/frr.conf

# Enable ripngd in FRR
sudo sed -i 's/^ripngd=no/ripngd=yes/' /etc/frr/daemons

# Start FRR (stop Quagga first)
sudo systemctl stop ripngd zebra
# On older Debian/Ubuntu packages with a suite service: sudo systemctl stop quagga
sudo systemctl start frr
```

## Summary

Quagga's `ripngd` provides RIPng on older Linux systems with configuration via `/etc/quagga/ripngd.conf` and the `vtysh` or Telnet console. The `router ripng` process with `network <interface>` statements is the core configuration. For all new deployments, migrate to FRRouting, which is the actively maintained fork of Quagga with significantly more features and bug fixes.
