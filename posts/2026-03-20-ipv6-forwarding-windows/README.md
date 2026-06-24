# How to Enable IPv6 Forwarding on Windows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Window, IP Forwarding, Routing, Netsh

Description: Learn how to enable IPv6 packet forwarding on Windows to allow a Windows Server to route IPv6 traffic between network interfaces.

## Overview

Windows Server can act as an IPv6 router by enabling IP forwarding. This allows the system to forward packets between network interfaces rather than dropping non-local packets. On Windows desktop editions, routing features are limited.

## Checking Current Forwarding State

```powershell
# Check if IPv6 forwarding is enabled

Get-NetIPInterface -AddressFamily IPv6 |
  Select-Object InterfaceAlias, Forwarding

# Output example:
# InterfaceAlias    Forwarding
# --------------    ----------
# Ethernet          Disabled
# Ethernet 2        Disabled
```

## Enabling IPv6 Forwarding with PowerShell

```powershell
# Enable forwarding on all IPv6 interfaces
Set-NetIPInterface -AddressFamily IPv6 -Forwarding Enabled

# Enable on a specific interface only
Set-NetIPInterface -InterfaceAlias "Ethernet" -AddressFamily IPv6 -Forwarding Enabled
Set-NetIPInterface -InterfaceAlias "Ethernet 2" -AddressFamily IPv6 -Forwarding Enabled

# Verify the change
Get-NetIPInterface -AddressFamily IPv6 |
  Select-Object InterfaceAlias, Forwarding
```

## Enabling Forwarding with netsh

```cmd
:: Enable forwarding on specific interfaces
netsh interface ipv6 set interface interface="Ethernet" forwarding=enabled
netsh interface ipv6 set interface interface="Ethernet 2" forwarding=enabled

:: Verify
netsh interface ipv6 show interfaces interface="Ethernet" level=verbose
```

## Using the Routing and Remote Access Service (RRAS)

For full router functionality on Windows Server, use RRAS:

```powershell
# Install and configure RRAS as a LAN router
Install-RemoteAccess -VpnType RoutingOnly
```

Alternatively, use the GUI:
1. Open **Server Manager** → **Tools** → **Routing and Remote Access**
2. Right-click the server → **Configure and Enable Routing and Remote Access**
3. Select **Custom Configuration** → check **LAN routing**
4. Start the service

## Windows Registry Method (Advanced)

For non-RRAS environments, Windows also exposes a global IP routing switch in the registry:

```powershell
# Enable global IP forwarding via registry (requires reboot)
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" `
  -Name "IPEnableRouter" -Value 1 -Type DWord

# Restart the system to apply
Restart-Computer
```

## Verifying Packet Forwarding

```powershell
# Confirm routes are being forwarded
# From a client on one subnet, ping a host on another subnet
# The Windows router should forward the packets

# On the Windows router, check interface statistics
Get-NetAdapterStatistics | Select-Object Name, ReceivedPackets, SentPackets

# Use route print to verify the routing table has both subnets
route print -6
```

## Limitations on Windows Desktop

Windows 10/11 expose the same per-interface forwarding settings, but the full RRAS role is a Windows Server feature. For production routing, use Windows Server with RRAS or a dedicated router.

## Summary

Enable IPv6 forwarding on Windows using `Set-NetIPInterface -AddressFamily IPv6 -Forwarding Enabled` or `netsh interface ipv6 set interface interface="<name>" forwarding=enabled`. On Windows Server, use RRAS when you need full router functionality. Verify forwarding is active with `Get-NetIPInterface` before testing inter-network packet flow.
