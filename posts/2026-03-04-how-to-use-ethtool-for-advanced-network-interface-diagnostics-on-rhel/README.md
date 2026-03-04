# How to Use ethtool for Advanced Network Interface Diagnostics on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, ethtool, Network Diagnostics, NIC, Linux

Description: Learn how to use ethtool on RHEL for advanced network interface diagnostics including link status, driver info, offload settings, and NIC statistics.

---

ethtool is a powerful utility for querying and configuring network interface settings. It provides low-level diagnostics that are not available through standard tools like `ip` or `nmcli`.

## Installing ethtool

```bash
# ethtool is usually installed by default
sudo dnf install -y ethtool
```

## Basic Interface Information

```bash
# View link speed, duplex, and auto-negotiation
ethtool ens192

# Key fields:
# Speed: 10000Mb/s (link speed)
# Duplex: Full
# Auto-negotiation: on
# Link detected: yes
```

## Driver and Firmware Info

```bash
# View driver name, version, and firmware version
ethtool -i ens192

# Output includes:
# driver: ixgbe
# version: 5.x.x
# firmware-version: 0x800012e0
# bus-info: 0000:03:00.0
```

## NIC Statistics

```bash
# View all NIC-level statistics
ethtool -S ens192

# Filter for specific statistics
ethtool -S ens192 | grep -i "error\|drop\|miss"
ethtool -S ens192 | grep -i "rx_bytes\|tx_bytes"
ethtool -S ens192 | grep -i "queue"
```

## Offload Settings

```bash
# View current offload settings
ethtool -k ens192

# Key offload features:
# tx-checksum-ipv4: on
# generic-segmentation-offload: on
# generic-receive-offload: on
# tcp-segmentation-offload: on

# Disable TSO (for debugging)
sudo ethtool -K ens192 tso off

# Enable GRO
sudo ethtool -K ens192 gro on
```

## Ring Buffer and Queue Info

```bash
# View ring buffer sizes
ethtool -g ens192

# View number of hardware queues (channels)
ethtool -l ens192

# Change the number of combined queues
sudo ethtool -L ens192 combined 8
```

## Link Diagnostics

```bash
# Run a self-test on the NIC (may disrupt traffic)
sudo ethtool --test ens192

# View PHY (physical layer) diagnostics
ethtool --phy-statistics ens192

# Check for pause frame configuration
ethtool -a ens192

# View EEE (Energy Efficient Ethernet) status
ethtool --show-eee ens192
```

## Identifying Interfaces

```bash
# Blink the LED on a specific NIC for 10 seconds
# Useful for identifying physical ports in a server
sudo ethtool -p ens192 10
```

## Dumping Registers and EEPROM

```bash
# Dump NIC registers (for advanced debugging)
sudo ethtool -d ens192

# Dump NIC EEPROM
sudo ethtool -e ens192
```

ethtool is invaluable for diagnosing network performance issues. When experiencing drops or errors, always check `ethtool -S` first to determine if the problem is at the NIC level before investigating higher-level causes.
