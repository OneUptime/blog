# How to View the IPv6 Routing Table on Windows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Window, Routing Table, Netsh, PowerShell

Description: Learn how to view and interpret the IPv6 routing table on Windows using netsh, route, and PowerShell commands.

## Overview

Windows provides several command-line tools for viewing the IPv6 routing table, including `route print`, `netsh`, and PowerShell cmdlets. Each offers a different level of detail.

## Using route print (Quick View)

```cmd
:: Show both IPv4 and IPv6 routing tables
route print

:: Show only IPv6 routing table
route print -6

:: Sample IPv6 output:
:: ===========================================================================
:: IPv6 Route Table
:: ===========================================================================
:: Active Routes:
::  If  Metric  Network Destination        Gateway
::   1     331  ::1/128                    On-link
::  12    1001  ::/0                       fe80::1
::  12     291  2001:db8::/64              On-link
::  12     291  2001:db8::1/128            On-link
::  12     291  fe80::/64                  On-link
::  12     291  fe80::aabb:ccdd:eeff/128   On-link
::   1     331  ff00::/8                   On-link
```

## Using netsh

```cmd
:: Show IPv6 routing table via netsh
netsh interface ipv6 show route

:: Show routes from the persistent store
netsh interface ipv6 show route store=persistent

:: Show route details
netsh interface ipv6 show route level=verbose

:: Search displayed routes for a specific prefix
netsh interface ipv6 show route | findstr "2001:db8"
```

## Using PowerShell (Modern Approach)

```powershell
# Show all IPv6 routes

Get-NetRoute -AddressFamily IPv6

# Sample output:
# ifIndex DestinationPrefix                  NextHop       RouteMetric
# ------- -----------------                  -------       -----------
# 12      ::/0                               fe80::1            256
# 12      2001:db8::/64                      ::                   0
# 12      fe80::/64                          ::                   0
# 1       ::1/128                            ::                 256

# Filter by interface
Get-NetRoute -AddressFamily IPv6 -InterfaceAlias "Ethernet"

# Show only default routes
Get-NetRoute -AddressFamily IPv6 -DestinationPrefix "::/0"

# Show routes learned via ICMP
Get-NetRoute -AddressFamily IPv6 -Protocol Icmp
```

## Understanding the Output Fields

| Field | Meaning |
|-------|---------|
| **ifIndex** | Numeric ID of the network interface |
| **DestinationPrefix** | The IPv6 network this route covers |
| **NextHop** | Next-hop router (`::` means on-link, no gateway needed) |
| **RouteMetric** | Lower value is preferred when multiple routes exist |
| **Protocol** | How the route was learned (Icmp, Local, NetMgmt, etc.) |

## Finding Your Gateway

```powershell
# Find the IPv6 default gateway
Get-NetRoute -AddressFamily IPv6 -DestinationPrefix "::/0" |
  Select-Object -ExpandProperty NextHop

# Or view all gateway information
Get-NetIPConfiguration | Select-Object InterfaceAlias, IPv6DefaultGateway
```

## Tracing the Route to a Destination

```cmd
:: Trace IPv6 path to a destination
tracert -6 2001:4860:4860::8888

:: On PowerShell
Test-NetConnection -ComputerName "ipv6.google.com" -TraceRoute
```

## Comparing Interfaces

```powershell
# Show interface indices to correlate with routes
Get-NetAdapter | Select-Object ifIndex, Name, Status

# Show route entries with interface names
Get-NetRoute -AddressFamily IPv6 |
  Select-Object ifIndex, InterfaceAlias, DestinationPrefix, NextHop
```

## Summary

Windows offers `route print -6`, `netsh interface ipv6 show route`, and the PowerShell cmdlet `Get-NetRoute -AddressFamily IPv6`. PowerShell is the most scriptable and detailed option, while `route print -6` provides a quick overview. Use `Get-NetRoute` to filter by interface, prefix, or protocol in automation scripts.
