# How to Bring Up and Down Connections with nmcli

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: nmcli, NetworkManager, Linux, Connection Management, RHEL, Network Control

Description: Learn how to bring up, bring down, connect, and disconnect network interfaces using nmcli commands for manual network control in NetworkManager-managed systems.

---

`nmcli` provides commands to activate and deactivate network connections at runtime. Understanding the difference between connection up/down and device connect/disconnect is important for correct network management.

## Connection Up and Down

```bash
# Activate a connection profile

nmcli connection up eth0-static

# Output:
# Connection successfully activated (...)

# Deactivate a connection
nmcli connection down eth0-static

# Activate with specific interface
nmcli connection up eth0-static ifname eth0
```

## Device Connect and Disconnect

```bash
# Connect a device (NetworkManager picks the best connection for it)
nmcli device connect eth0

# Disconnect a device (the active connection is deactivated and auto-connect is blocked)
nmcli device disconnect eth0

# Difference:
# connection up/down = specific profile
# device connect/disconnect = device-level, NM chooses or releases profile
```

## Checking Connection Status

```bash
# Show all configured connection profiles
nmcli connection show

# Active connections only
nmcli connection show --active

# Show device status
nmcli device status

# Output:
# DEVICE  TYPE      STATE      CONNECTION
# eth0    ethernet  connected  eth0-static
# eth1    ethernet  disconnected  --
```

## Bringing Up DHCP vs. Static

```bash
# Bring up DHCP connection
nmcli connection up eth0-dhcp

# Force a fresh DHCP request by reconnecting the profile
nmcli connection down eth0-dhcp && nmcli connection up eth0-dhcp

# Or via device
nmcli device reapply eth0  # Reapply changes from the active profile without fully reconnecting
```

## Handling Connection Priority on Multiple Profiles

```bash
# If multiple profiles match the device, activate a specific one
nmcli connection show | grep eth0
# eth0-static    ... ethernet  eth0
# eth0-backup    ... ethernet  --

# Activate the backup
nmcli connection up eth0-backup ifname eth0
# This will deactivate eth0-static and activate eth0-backup
```

## Scripting Connection State Changes

```bash
#!/bin/bash
# Check if connection is active and restart if down
CONN="eth0-static"
STATE=$(nmcli -t -f GENERAL.STATE connection show "$CONN" 2>/dev/null | cut -d: -f2)

if [ "$STATE" != "activated" ]; then
  echo "Connection $CONN is not active ($STATE). Bringing up..."
  nmcli connection up "$CONN"
else
  echo "Connection $CONN is active."
fi
```

## Monitoring Connection Events

```bash
# Watch NetworkManager activity
nmcli monitor

# Output shows events like:
# eth0: connection profile changed
# eth0: connected
# eth0: disconnected
```

## Key Takeaways

- `nmcli connection up <name>` activates a specific profile; `nmcli device connect <iface>` lets NM auto-select the profile.
- `nmcli connection down <name>` deactivates a specific profile; the device may still auto-activate another suitable profile.
- `nmcli device disconnect <iface>` disconnects the device and prevents further auto-activation on it until you manually reconnect it.
- Use `nmcli monitor` to watch real-time connection events for debugging network state changes.
