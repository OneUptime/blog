# How to Set Connection Autoconnect Priority with nmcli

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: nmcli, NetworkManager, Autoconnect, Priority, Linux, RHEL, Connection Management

Description: Learn how to configure NetworkManager connection autoconnect priority to control which connection profile is activated automatically when multiple profiles match the same device.

---

When multiple connection profiles can be applied to the same interface, autoconnect priority determines which one NetworkManager activates first on startup or when the device becomes available.

## Understanding Autoconnect Priority

```text
Higher priority number = activated first (counterintuitive: higher = more preferred)
Default priority: 0
Range: -999 to 999

Example:
  eth0-static  priority: 100  → preferred (activated first)
  eth0-backup  priority: 0    → fallback
  eth0-dhcp    priority: -10  → last resort
```

## Setting Autoconnect Priority

```bash
# Set high priority for static connection

nmcli connection modify eth0-static \
  connection.autoconnect yes \
  connection.autoconnect-priority 100

# Set lower priority for DHCP fallback
nmcli connection modify eth0-dhcp \
  connection.autoconnect yes \
  connection.autoconnect-priority 0

# Disable autoconnect for a connection
nmcli connection modify eth0-test \
  connection.autoconnect no
```

## Verifying Priority Settings

```bash
# Show autoconnect settings for all connections
nmcli -f NAME,DEVICE,AUTOCONNECT,AUTOCONNECT-PRIORITY connection show

# Output:
# NAME         DEVICE  AUTOCONNECT  AUTOCONNECT-PRIORITY
# eth0-static  eth0    yes          100
# eth0-dhcp    eth0    yes          0
# eth0-test    --      no           0
```

## Autoconnect Retries

```bash
# Control how many times NM retries activating a connection
nmcli connection modify eth0-static \
  connection.autoconnect-retries 5   # 5 attempts, then give up (0 = forever, -1 = global default)
```

## Priority with Multiple Network Interfaces

```bash
# Primary WAN (high priority)
nmcli connection modify wan-primary \
  connection.autoconnect-priority 200

# Secondary WAN (lower priority, only if primary fails)
nmcli connection modify wan-secondary \
  connection.autoconnect-priority 50
```

## Auto-Activating Slaves of Master Connections

```bash
# Slaves (for bonds/teams/bridges) autoconnect with the master
nmcli connection modify bond0 \
  connection.autoconnect-slaves 1   # 1 = activate slaves, 0 = leave untouched, -1 = global default

# Don't auto-activate slaves of this bridge
nmcli connection modify br0 \
  connection.autoconnect-slaves 0
```

## Viewing What Connected and Why

```bash
# Check NetworkManager logs for connection selection
journalctl -u NetworkManager | grep "autoconnect"

# See current active connection and its priority
nmcli -f NAME,DEVICE,STATE,AUTOCONNECT-PRIORITY \
  connection show --active
```

## Key Takeaways

- Higher `connection.autoconnect-priority` numbers are activated first (100 is preferred over 0).
- Set `connection.autoconnect no` on test or backup connections to prevent them from activating unexpectedly.
- Use `connection.autoconnect-retries` to limit how many activation attempts NM makes before giving up.
- `nmcli connection show` with `-f AUTOCONNECT,AUTOCONNECT-PRIORITY` provides a quick overview of all priorities.
