# How to View IPv6 Routing Table on Windows with route print

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Window, Routing, Route print, Network Diagnostics

Description: Learn how to view and interpret the IPv6 routing table on Windows using route print and PowerShell, including filtering routes and understanding route metrics.

## Viewing the IPv6 Routing Table

```cmd
:: Show both IPv4 and IPv6 routing tables
route print

:: Show only IPv6 routing table
route print -6

:: PowerShell equivalent
Get-NetRoute -AddressFamily IPv6
```

## Understanding route print -6 Output

```text
===========================================================================
IPv6 Route Table
===========================================================================
Active Routes:
 If Metric Network Destination      Gateway
 12     281 ::/0                    fe80::1
 1      306 ::1/128                 On-link
 12     281 2001:db8::/64           On-link
 12     281 2001:db8::10/128        On-link
 12     281 fe80::/64               On-link
 12     281 fe80::1234:5678/128     On-link
 1      306 ff00::/8                On-link
===========================================================================
```

Column meanings:
- **If**: Interface index (use `netsh interface ipv6 show interfaces` to map to names)
- **Metric**: Route cost (lower = preferred)
- **Network Destination**: Destination prefix
- **Gateway**: Next-hop (`On-link` = directly connected)

## PowerShell for More Detail

```powershell
# Show all IPv6 routes with interface names

Get-NetRoute -AddressFamily IPv6 |
    Select-Object InterfaceAlias, DestinationPrefix, NextHop, RouteMetric, Protocol |
    Format-Table -AutoSize

# Show only default route
Get-NetRoute -AddressFamily IPv6 -DestinationPrefix "::/0"

# Show routes for a specific interface
Get-NetRoute -AddressFamily IPv6 -InterfaceAlias "Ethernet"

# Show routes learned from Router Advertisements
Get-NetRoute -AddressFamily IPv6 | Where-Object {$_.Protocol -eq "RouterAdvertisement"}
```

## Route Protocol Values

```powershell
# Check how routes were learned
Get-NetRoute -AddressFamily IPv6 | Select-Object DestinationPrefix, Protocol

# Common protocol values:
# NetMgmt        = Manually configured (netsh or PowerShell)
# RouterAdvertisement = Learned from RA (SLAAC)
# Dhcp           = Learned from DHCPv6
# Local          = Connected routes (interface addresses)
# Other          = Kernel/auto-generated
```

## Finding the Route for a Destination

```cmd
:: Find which route will be used to reach a destination
route print -6 | findstr "::/0"

:: Or use pathping for more detail
pathping -6 2001:4860:4860::8888
```

```powershell
# PowerShell: find best route to a destination
Find-NetRoute -RemoteIPAddress "2001:4860:4860::8888"

# Output includes:
# - InterfaceAlias: which interface will be used
# - LocalIPAddress: which source address will be used
# - NextHop: next-hop gateway
```

## Managing Routes with PowerShell

```powershell
# Add a default IPv6 route
New-NetRoute -InterfaceAlias "Ethernet" `
    -DestinationPrefix "::/0" `
    -NextHop "2001:db8::1" `
    -RouteMetric 10

# Add a specific route
New-NetRoute -InterfaceAlias "Ethernet" `
    -DestinationPrefix "2001:db8:1::/48" `
    -NextHop "2001:db8::1"

# Remove a route
Remove-NetRoute -DestinationPrefix "::/0" -InterfaceAlias "Ethernet" -Confirm:$false

# View final routing table
Get-NetRoute -AddressFamily IPv6 | Sort-Object RouteMetric
```

## Summary

View the IPv6 routing table with `route print -6` or `Get-NetRoute -AddressFamily IPv6`. The table shows interface index, metric, destination prefix, and next-hop. Use `Get-NetRoute` with filters like `-DestinationPrefix "::/0"` for the default route or `-InterfaceAlias "Ethernet"` for per-interface routes. `Find-NetRoute -RemoteIPAddress` shows which route and source address will be used for a specific destination. Manage routes with `New-NetRoute` and `Remove-NetRoute`.
