# How to Use ethtool for Advanced Network Interface Diagnostics on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Networking

Description: Step-by-step guide on use ethtool for advanced network interface diagnostics on RHEL with practical examples and commands.

---

ethtool provides detailed network interface diagnostics and configuration on RHEL.

## Check Interface Settings

```bash
ethtool eth0
```

## View Driver Information

```bash
ethtool -i eth0
```

## Check Link Status

```bash
ethtool eth0 | grep "Link detected"
```

## View Interface Statistics

```bash
ethtool -S eth0
ethtool -S eth0 | grep -E "error|drop|miss|crc"
```

## Check and Set Speed/Duplex

```bash
# View current settings
ethtool eth0 | grep -E "Speed|Duplex"

# Force speed and duplex (if auto-negotiation fails)
sudo ethtool -s eth0 speed 10000 duplex full autoneg on
```

## View Ring Buffer Settings

```bash
ethtool -g eth0
```

## View Offload Features

```bash
ethtool -k eth0
```

## Toggle Offload Features

```bash
# Disable TSO (for troubleshooting)
sudo ethtool -K eth0 tso off

# Enable GRO
sudo ethtool -K eth0 gro on

# Disable scatter-gather (for debugging)
sudo ethtool -K eth0 sg off
```

## Check for Cable Issues

```bash
ethtool -t eth0
```

## View Pause Frame Settings

```bash
ethtool -a eth0
```

## Configure Wake-on-LAN

```bash
# Check current WoL setting
ethtool eth0 | grep "Wake-on"

# Enable Wake-on-LAN
sudo ethtool -s eth0 wol g
```

## Monitor Real-Time Statistics

```bash
watch -n 1 'ethtool -S eth0 | grep -E "rx_bytes|tx_bytes|errors|drops"'
```

## Conclusion

ethtool on RHEL is essential for network interface diagnostics. Use it to check link status, view error counters, configure offload features, and troubleshoot connectivity issues at the hardware level.

