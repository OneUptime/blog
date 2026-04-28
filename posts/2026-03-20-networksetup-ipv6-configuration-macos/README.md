# How to Use networksetup for IPv6 Configuration on macOS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, macOS, Networksetup, Terminal, Network Configuration

Description: A comprehensive reference for networksetup commands used to manage IPv6 configuration on macOS, covering address assignment, DNS, routing, and interface management.

## Listing Network Services

```bash
# List all available network services

networksetup -listallnetworkservices

# Output example:
# An asterisk (*) denotes that a network service is disabled.
# Wi-Fi
# Ethernet
# Thunderbolt Bridge
# *Bluetooth PAN

# List all hardware ports (with physical device name)
networksetup -listallhardwareports
```

## IPv6 Address Configuration Commands

```bash
# Enable automatic IPv6 (SLAAC/DHCPv6)
networksetup -setv6automatic "Wi-Fi"

# Enable link-local only
networksetup -setv6linklocal "Wi-Fi"

# Assign static IPv6 address
# Syntax: -setv6manual <service> <address> <prefixlength> <router>
networksetup -setv6manual "Wi-Fi" 2001:db8::10 64 2001:db8::1

# Disable IPv6
networksetup -setv6off "Wi-Fi"

# Display additional IPv6 routes configured for the service
networksetup -getv6additionalroutes "Wi-Fi"
```

## DNS Configuration Commands

```bash
# Set DNS servers (IPv4 and/or IPv6)
networksetup -setdnsservers "Wi-Fi" \
    2001:4860:4860::8888 \
    2001:4860:4860::8844 \
    8.8.8.8

# View current DNS servers
networksetup -getdnsservers "Wi-Fi"

# Clear DNS (use DHCP-provided)
networksetup -setdnsservers "Wi-Fi" "empty"

# Set search domains
networksetup -setsearchdomains "Wi-Fi" "example.com" "corp.local"

# View search domains
networksetup -getsearchdomains "Wi-Fi"
```

## Interface Information

```bash
# Get detailed interface info (shows IPv6 config method)
networksetup -getinfo "Wi-Fi"

# Output:
# Manual Configuration
# IPv6: Automatic
# IPv6 IP address: 2001:db8::1234:5678
# IPv6 Router: fe80::1
# IPv6 Prefix Length: 64

# Get proxy settings
networksetup -getsocksfirewallproxy "Wi-Fi"
```

## Enabling/Disabling Interfaces

```bash
# Disable a network interface
networksetup -setnetworkserviceenabled "Wi-Fi" off

# Enable a network interface
networksetup -setnetworkserviceenabled "Wi-Fi" on

# Check if enabled
networksetup -getnetworkserviceenabled "Wi-Fi"
```

## Script: Configure All Interfaces for IPv6

```bash
#!/bin/bash
# Configure IPv6 on all active network services

configure_ipv6() {
    local SERVICE="$1"
    local MODE="${2:-automatic}"  # automatic, manual, linklocal, off

    case "$MODE" in
        automatic)
            networksetup -setv6automatic "$SERVICE"
            ;;
        manual)
            # Requires address, prefix, gateway args
            networksetup -setv6manual "$SERVICE" "$3" "$4" "$5"
            ;;
        linklocal)
            networksetup -setv6linklocal "$SERVICE"
            ;;
        off)
            networksetup -setv6off "$SERVICE"
            ;;
    esac

    echo "$SERVICE: IPv6 set to $MODE"
}

# Enable IPv6 automatic on all active services
networksetup -listallnetworkservices | tail -n +2 | while IFS= read -r svc; do
    [[ "$svc" == \** ]] && continue  # Skip disabled interfaces
    configure_ipv6 "$svc" automatic
done
```

## Getting Network Service Names for Scripting

```bash
# Get current Wi-Fi network (SSID) for a Wi-Fi device
networksetup -getairportnetwork en0          # Wi-Fi specific (returns SSID)
networksetup -listallhardwareports           # Map service names to devices

# Example output from -listallhardwareports:
# Hardware Port: Wi-Fi
# Device: en0
# Ethernet Address: aa:bb:cc:dd:ee:ff
#
# Hardware Port: Ethernet
# Device: en1
# Ethernet Address: aa:bb:cc:dd:ee:00
```

## Summary

`networksetup` is the primary command-line tool for macOS network configuration, including IPv6. Key IPv6 commands: `-setv6automatic` (SLAAC), `-setv6manual <service> <ip> <prefix> <gw>` (static), `-setv6linklocal` (link-local only), `-setv6off` (disable), `-getv6additionalroutes` (view additional IPv6 routes). Use `-getinfo` to view the current IPv6 configuration. DNS is managed with `-setdnsservers` and `-getdnsservers`. All commands require the network service name (from `-listallnetworkservices`), not the device name (en0, en1).
