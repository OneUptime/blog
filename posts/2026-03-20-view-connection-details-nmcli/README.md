# How to View Connection Details with nmcli connection show

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, nmcli, NetworkManager, Networking, Diagnostic

Description: Use nmcli connection show to inspect all settings, IP addresses, routes, DNS, and state of NetworkManager connection profiles.

## Introduction

`nmcli connection show` displays stored connection profile settings. Combined with `nmcli device show`, you can see both the configured settings and the live runtime state of network interfaces. This is the primary tool for auditing NetworkManager configuration.

## List All Connection Profiles

```bash
# Short summary of all connections

nmcli connection show

# Show only active connections
nmcli connection show --active

# Show secrets (passwords) in output
nmcli -s connection show
```

## Show All Details for a Connection

```bash
# Full detail for a specific connection
nmcli connection show "Wired connection 1"

# Show only IPv4-related settings
nmcli connection show "Wired connection 1" | grep ipv4

# Show only IPv6-related settings
nmcli connection show "Wired connection 1" | grep ipv6
```

## Show Specific Fields

```bash
# Use -f to specify fields to display
nmcli -f NAME,UUID,TYPE,DEVICE connection show

# Example output:
# NAME                UUID                                  TYPE      DEVICE
# Wired connection 1  a1b2c3d4-...                          ethernet  eth0
# bond0               e5f6a7b8-...                          bond      bond0
```

## Show Live Device Information

```bash
# Runtime IP, gateway, DNS (different from stored profile)
nmcli device show eth0

# Key fields:
# GENERAL.DEVICE         eth0
# GENERAL.STATE          100 (connected)
# IP4.ADDRESS[1]         192.168.1.100/24
# IP4.GATEWAY            192.168.1.1
# IP4.DNS[1]             8.8.8.8
```

## Check Connection Status

```bash
# Show device status summary
nmcli device status

# Check if a connection is active
nmcli connection show --active | grep "Wired"
```

## Show UUID of a Connection

```bash
nmcli -g UUID connection show "Wired connection 1"
```

## Show Connection File Location

```bash
# Find the .nmconnection file on disk
ls /etc/NetworkManager/system-connections/

# View the raw file
cat "/etc/NetworkManager/system-connections/Wired connection 1.nmconnection"
```

## Filter by Connection Type

```bash
# Show only Ethernet connections
nmcli connection show | grep ethernet

# Show only bridge connections
nmcli connection show | grep bridge

# Show only VPN connections
nmcli connection show | grep vpn
```

## Conclusion

`nmcli connection show <name>` shows all stored profile settings, while `nmcli device show <interface>` shows live runtime state. Use `-f` to filter specific fields for scripting. The raw `.nmconnection` files in `/etc/NetworkManager/system-connections/` contain the same information in INI format.
