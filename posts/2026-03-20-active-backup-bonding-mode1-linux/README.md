# How to Configure Active-Backup Bonding (Mode 1) on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Network Bonding, Active-Backup, Mode 1, High Availability, Failover, Networking

Description: Configure Linux active-backup bonding (mode 1) to provide automatic failover between two network interfaces with no switch configuration required.

## Introduction

Active-backup bonding (mode 1) keeps one interface active and one in standby. If the active interface fails, the backup takes over automatically. This mode requires no switch configuration and works with any standard switch - making it the simplest and most reliable bonding mode for high availability.

## Prerequisites

- Two physical interfaces (e.g., eth0, eth1)
- Root access
- Both interfaces connected (to the same or different switches)

## Configure Active-Backup with iproute2

```bash
# Load bonding module

modprobe bonding

# Create the bond in active-backup mode
ip link add bond0 type bond mode active-backup

# Set monitoring interval (100ms = check every 100ms)
ip link set bond0 type bond miimon 100

# Add slave interfaces
ip link set eth0 down
ip link set eth1 down
ip link set eth0 master bond0
ip link set eth1 master bond0

# Optionally set a preferred primary interface
ip link set bond0 type bond primary eth0

# Bring up the bond
ip link set bond0 up
ip addr add 192.168.1.100/24 dev bond0
ip route add default via 192.168.1.1
```

## Verify the Bond

```bash
# Check bond status
cat /proc/net/bonding/bond0

# Sample output:
# Bonding Mode: fault-tolerance (active-backup)
# Primary Slave: eth0 (primary_reselect always)
# Currently Active Slave: eth0
# MII Status: up
# ...
```

## Set Primary Interface

The primary interface is preferred when it is available:

```bash
# Set eth0 as primary via sysfs
echo eth0 > /sys/class/net/bond0/bonding/primary

# Or via iproute2
ip link set bond0 type bond primary eth0
```

## Simulate a Failover

```bash
# Step 1: Check current active slave
cat /sys/class/net/bond0/bonding/active_slave

# Step 2: Disconnect or disable the active interface
ip link set eth0 down
# Or physically disconnect the cable

# Step 3: Verify failover occurred
cat /sys/class/net/bond0/bonding/active_slave
# Should now show eth1

# Step 4: Re-enable eth0
ip link set eth0 up
# With primary=eth0 and the default primary_reselect policy, the bond should fail back to eth0
```

## Key Parameters

```bash
# View current bond parameters
cat /proc/net/bonding/bond0

# Key parameters:
# miimon: link check interval (100-200ms recommended)
# updelay: wait before marking link as up (avoids flapping)
# downdelay: wait before failover (avoids failover on momentary loss)
# primary: preferred active interface
# primary_reselect: when to revert to primary (always/better/failure)
```

## Persistent Configuration (Netplan)

```yaml
network:
  version: 2
  ethernets:
    eth0: {}
    eth1: {}
  bonds:
    bond0:
      interfaces: [eth0, eth1]
      addresses: [192.168.1.100/24]
      parameters:
        mode: active-backup
        primary: eth0
        mii-monitor-interval: 100
        up-delay: 200
        down-delay: 200
        primary-reselect-policy: always
```

## Conclusion

Active-backup bonding provides simple, reliable failover with no switch configuration required. The primary interface carries all traffic; the bonding driver monitors link state and activates the backup only on failure. Configure `miimon`, `updelay`, and `downdelay` to tune failover sensitivity and avoid false positives from transient link drops.
