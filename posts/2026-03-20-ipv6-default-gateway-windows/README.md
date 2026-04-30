# How to Configure IPv6 Default Gateway on Windows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Window, Default Gateway, Netsh, PowerShell

Description: Learn how to configure, verify, and troubleshoot the IPv6 default gateway on Windows using the GUI, netsh, and PowerShell.

## Overview

The IPv6 default gateway on Windows is configured either automatically via Router Advertisement or manually through the GUI, netsh, or PowerShell. The default route is `::/0` and points to the router that handles all non-local IPv6 traffic.

## Setting the Gateway via GUI

1. Open **Control Panel** → **Network and Sharing Center**
2. Click the active network connection → **Properties**
3. Select **Internet Protocol Version 6 (TCP/IPv6)** → **Properties**
4. Select **Use the following IPv6 address**
5. Enter:
   - IPv6 address: `2001:db8::2`
   - Subnet prefix length: `64`
   - Default gateway: `2001:db8::1`
6. Click **OK**

## Setting the Gateway with netsh

```cmd
:: First, set a static IPv6 address
netsh interface ipv6 set address interface="Ethernet" address=2001:db8::2/64

:: Set the default gateway
netsh interface ipv6 add route prefix=::/0 interface="Ethernet" nexthop=2001:db8::1

:: Verify the default route
netsh interface ipv6 show route | findstr "::/0"
```

## Setting the Gateway with PowerShell

```powershell
# Get the interface index

$ifIndex = (Get-NetAdapter -Name "Ethernet").ifIndex

# Remove any existing default route
Get-NetRoute -DestinationPrefix "::/0" -AddressFamily IPv6 -InterfaceIndex $ifIndex -ErrorAction SilentlyContinue |
  Remove-NetRoute -Confirm:$false

# Add the new default gateway
New-NetRoute -DestinationPrefix "::/0" `
             -InterfaceIndex $ifIndex `
             -AddressFamily IPv6 `
             -NextHop "2001:db8::1" `
             -RouteMetric 256

# Verify
Get-NetRoute -DestinationPrefix "::/0" -AddressFamily IPv6 |
  Format-List DestinationPrefix, NextHop, RouteMetric, InterfaceAlias
```

## Verifying the Default Gateway

```cmd
:: Check the IPv6 routing table for default route
route print -6 | findstr "::/0"

:: Output example:
:: 12    256    ::/0    2001:db8::1
```

```powershell
# Verify reachability of the gateway
Test-NetConnection -ComputerName "2001:db8::1" -InformationLevel Detailed

# Trace the route to an IPv6-capable host
Test-NetConnection -ComputerName "ipv6.google.com" -TraceRoute
```

## Checking if Gateway Was Learned Automatically or Set Manually

```powershell
# Show the default IPv6 route on the interface
Get-NetRoute -DestinationPrefix "::/0" -AddressFamily IPv6 -InterfaceAlias "Ethernet" |
  Select-Object Protocol, NextHop, InterfaceAlias

# Check whether the interface can learn routes from Router Advertisement
Get-NetIPInterface -InterfaceAlias "Ethernet" -AddressFamily IPv6 |
  Select-Object InterfaceAlias, RouterDiscovery

# Notes:
# IPv6 default routers are learned from Router Advertisement, not DHCPv6.
# A manually added route appears as a static route, for example Protocol = NetMgmt.
```

## Resetting IPv6 Network Configuration

If the gateway is misconfigured and you want to start fresh:

```cmd
:: Reset all IPv6 settings. Defaults are restored after a restart.
netsh interface ipv6 reset
```

Restart Windows after the reset so the default IPv6 settings are restored and the adapter can relearn Router Advertisements.

## Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| No default route | RA not received or manual config missing | Check router RA config or add route manually |
| Wrong metric | Multiple gateways with same metric | Set explicit metric with RouteMetric |
| Gateway unreachable | Firewall or wrong on-link configuration | Verify the gateway is on-link for the client interface |
| IPv6 disabled | IPv6 may be unbound or disabled system-wide | Re-enable the IPv6 binding, or set `DisabledComponents` to `0` and restart Windows |

## Summary

On Windows, set the IPv6 default gateway via the GUI, `netsh interface ipv6 add route ::/0`, or `New-NetRoute`. Verify with `route print -6` and test connectivity with `Test-NetConnection`. In auto-configured environments, the gateway is learned from Router Advertisement.
