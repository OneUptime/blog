# How to Configure IPv6 Privacy Extensions on Windows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Window, Privacy Extensions, Temporary Addresses, PowerShell

Description: Learn how to configure IPv6 privacy extensions (RFC 4941) on Windows to control temporary address generation and whether the system prefers temporary or stable IPv6 addresses.

## IPv6 Privacy Extensions on Windows

Windows generates both stable (based on hardware) and temporary (random) IPv6 addresses by default. Privacy extensions can be controlled via `netsh` and PowerShell.

```powershell
# Check current privacy state

netsh interface ipv6 show privacy

# Output:
# Temporary Address Parameters
# ----------------------------------------------
# Use Temporary Addresses                  : enabled
# Duplicate Address Detection Attempts     : 3
# Maximum Valid Lifetime                   : 7d
# Maximum Preferred Lifetime               : 1d
# Regenerate Time                          : 5s
# Maximum Random Time                      : 10m
# Random Time                              : 1m
```

## Enable/Disable Privacy Extensions via netsh

```cmd
:: Enable privacy extensions (generate temporary addresses)
netsh interface ipv6 set privacy state=enabled

:: Disable privacy extensions
netsh interface ipv6 set privacy state=disabled

:: Enable with custom lifetimes
netsh interface ipv6 set privacy state=enabled maxvalidlifetime=7d maxpreferredlifetime=1d

:: Show current settings
netsh interface ipv6 show privacy
```

## Configure Privacy Extensions via PowerShell

```powershell
# Enable privacy extensions globally
Set-NetIPv6Protocol -UseTemporaryAddresses Enabled

# Disable privacy extensions globally
Set-NetIPv6Protocol -UseTemporaryAddresses Disabled

# Check current setting
Get-NetIPv6Protocol | Select-Object UseTemporaryAddresses

# Configure temporary address lifetimes
Set-NetIPv6Protocol `
    -UseTemporaryAddresses Enabled `
    -MaxTemporaryPreferredLifetime (New-TimeSpan -Hours 24) `
    -MaxTemporaryValidLifetime (New-TimeSpan -Days 7)
```

## Random Interface Identifiers

In addition to temporary addresses, Windows can use random (rather than hardware-derived) stable interface identifiers:

```cmd
:: Enable random IIDs for stable addresses (RFC 7217-like behavior)
netsh interface ipv6 set global randomizeidentifiers=enabled

:: Disable random IIDs
netsh interface ipv6 set global randomizeidentifiers=disabled

:: Check current state
netsh interface ipv6 show global | findstr "Randomize"
```

## Viewing Temporary Addresses

```powershell
# Show all IPv6 addresses including temporary
Get-NetIPAddress -AddressFamily IPv6

# Filter for temporary addresses
Get-NetIPAddress -AddressFamily IPv6 |
    Where-Object {$_.SuffixOrigin -eq "Random"} |
    Select-Object InterfaceAlias, IPAddress, AddressState

# Show via ipconfig /all
# Temporary IPv6 Address. . . . . . : 2001:db8::a1b2:c3d4(Preferred)
```

## Per-Interface Privacy Configuration

```powershell
# Per-interface temporary address control
# First, get interface index
Get-NetAdapter | Select-Object Name, InterfaceIndex

# Example: configure other per-interface IPv6 settings via netsh
# (privacy extensions themselves are not per-interface on Windows)
netsh interface ipv6 set interface "Ethernet" `
    routerdiscovery=enabled

# Note: Privacy extension state is global on Windows,
# not per-interface unlike Linux
```

## Disable Privacy Extensions for Servers

```powershell
# Servers should use stable, predictable addresses
# Disable temporary address generation

netsh interface ipv6 set privacy state=disabled
netsh interface ipv6 set global randomizeidentifiers=disabled

# Verify
netsh interface ipv6 show privacy
netsh interface ipv6 show global | findstr "Randomize"

# Confirm only static address is used (no Temporary IPv6 Address in ipconfig)
ipconfig /all | findstr "IPv6"
```

## Summary

Configure IPv6 privacy extensions on Windows with `netsh interface ipv6 set privacy state=enabled/disabled` or `Set-NetIPv6Protocol -UseTemporaryAddresses Enabled/Disabled`. Enable for workstations to rotate temporary addresses for outgoing connections (RFC 4941). Disable on servers for predictable, stable IPv6 addresses. Also control random interface identifiers with `netsh interface ipv6 set global randomizeidentifiers=enabled`. View temporary addresses with `ipconfig /all` or `Get-NetIPAddress -AddressFamily IPv6`.
