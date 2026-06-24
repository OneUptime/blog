# How to Add IPv6 Static Routes on Windows with netsh

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Window, Static Routes, Netsh, PowerShell

Description: Learn how to add, verify, and persist IPv6 static routes on Windows using netsh and PowerShell New-NetRoute cmdlet.

## Overview

Windows provides two main approaches for managing IPv6 static routes: the classic `netsh` command and the modern PowerShell `New-NetRoute` cmdlet. By default, `netsh` writes routes to the persistent store, and `New-NetRoute` saves routes in both the active and persistent stores, so the routes survive reboots.

## Adding Routes with netsh

```cmd
:: Syntax:
:: netsh interface ipv6 add route <prefix> <interface> [nexthop=<gateway>]

:: Add a route to a specific prefix via a gateway
netsh interface ipv6 add route 2001:db8:1::/48 "Ethernet" nexthop=2001:db8::1

:: Add a route using a link-local gateway (include interface name)
netsh interface ipv6 add route 2001:db8:1::/48 "Ethernet" nexthop=fe80::1

:: Add the IPv6 default route
netsh interface ipv6 add route ::/0 "Ethernet" nexthop=2001:db8::1

:: Add a route with a specific metric
netsh interface ipv6 add route 2001:db8:1::/48 "Ethernet" nexthop=2001:db8::1 metric=100
```

## Finding the Interface Name

```cmd
:: List available interfaces to find the correct name
netsh interface show interface

:: Or use route print to see interface indices
route print -6

:: Interfaces are listed at the top of the output:
:: Interface List
:: 12...aa bb cc dd ee ff ......Ethernet
::  1...........................Software Loopback Interface 1
```

## Adding Routes with PowerShell

```powershell
# Get the interface index first

Get-NetAdapter | Select-Object Name, ifIndex

# Add a static IPv6 route
New-NetRoute -DestinationPrefix "2001:db8:1::/48" `
             -InterfaceIndex 12 `
             -NextHop "2001:db8::1" `
             -RouteMetric 100

# Add the default IPv6 route
New-NetRoute -DestinationPrefix "::/0" `
             -InterfaceIndex 12 `
             -NextHop "fe80::1"
```

## Verifying Routes

```cmd
:: Show all IPv6 routes
route print -6

:: Filter for a specific prefix
netsh interface ipv6 show route | findstr "2001:db8:1"
```

```powershell
# Verify the route was added
Get-NetRoute -DestinationPrefix "2001:db8:1::/48" -AddressFamily IPv6

# Check if route resolves correctly
Find-NetRoute -RemoteIPAddress "2001:db8:1::100"
```

## Removing Routes

```cmd
:: Remove a route with netsh
netsh interface ipv6 delete route 2001:db8:1::/48 "Ethernet" nexthop=2001:db8::1

:: Remove the default route
netsh interface ipv6 delete route ::/0 "Ethernet"
```

```powershell
# Remove a route with PowerShell
Remove-NetRoute -DestinationPrefix "2001:db8:1::/48" -InterfaceIndex 12 -Confirm:$false

# Remove all routes for a specific interface
Get-NetRoute -InterfaceIndex 12 -AddressFamily IPv6 | Remove-NetRoute -Confirm:$false
```

## Route Persistence

Unlike Linux where `ip route add` is temporary, Windows routes added via `netsh` or `New-NetRoute` are persistent by default. To add a non-persistent (session-only) route with PowerShell:

```powershell
# Add a route that is removed on reboot
New-NetRoute -DestinationPrefix "2001:db8:1::/48" `
             -InterfaceIndex 12 `
             -NextHop "2001:db8::1" `
             -PolicyStore ActiveStore
# ActiveStore = non-persistent; omitting -PolicyStore saves the route in both ActiveStore and PersistentStore by default
```

## Scripting Multiple Routes

```powershell
# Define multiple routes and add them in a loop
$routes = @(
    @{ Prefix="2001:db8:1::/48"; NextHop="2001:db8::1" },
    @{ Prefix="2001:db8:2::/48"; NextHop="2001:db8::1" },
    @{ Prefix="2001:db8:3::/48"; NextHop="fe80::1" }
)

$ifIndex = (Get-NetAdapter -Name "Ethernet").ifIndex

foreach ($route in $routes) {
    New-NetRoute -DestinationPrefix $route.Prefix `
                 -InterfaceIndex $ifIndex `
                 -NextHop $route.NextHop
}
```

## Summary

Windows IPv6 static routes can be added with `netsh interface ipv6 add route` or the PowerShell `New-NetRoute` cmdlet. By default, `netsh` uses the persistent store and `New-NetRoute` saves to both the active and persistent stores. Always identify the correct interface name or index before adding routes, and verify with `route print -6` or `Get-NetRoute`.
