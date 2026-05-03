# How to Delete a Static Route on Windows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Window, Networking, Route, Static Routes, IPv4, Network Configuration

Description: Delete specific static routes from the Windows routing table using route delete, remove persistent routes, and clean up the routing table after network reconfiguration.

## Introduction

Removing an incorrect or obsolete static route prevents Windows from misrouting traffic. The `route delete` command removes a route immediately from the active routing table and, for persistent routes, from the registry.

## Deleting a Route by Destination

```cmd
:: Delete the route to 10.0.0.0/255.0.0.0
route delete 10.0.0.0 mask 255.0.0.0

:: Delete a specific /24 route
route delete 172.16.5.0 mask 255.255.255.0
```

## Deleting by Destination and Gateway

When multiple routes exist for the same destination (different gateways):

```cmd
:: Delete only the route via 192.168.1.254
route delete 10.0.0.0 mask 255.0.0.0 192.168.1.254
```

## Deleting the Default Route

```cmd
:: Delete the default gateway (WARNING: will break all off-subnet connectivity)
route delete 0.0.0.0 mask 0.0.0.0
```

## Deleting All Routes to a Network

Using a wildcard - `*` matches any string in the destination, and `?` matches any single character:

```cmd
:: Delete all routes whose destination begins with 10.
route delete 10.*
```

## Verifying the Deletion

```cmd
:: Confirm the route is gone
route print | findstr "10.0.0"
:: Should show no matching line
```

## Deleting Persistent Routes

`route delete` removes both active and persistent routes simultaneously. Verify that persistent routes are also removed:

```cmd
route print | findstr /i "persistent"
```

If the route still appears in the Persistent Routes section, it survived as a registry entry - use PowerShell:

```powershell
# Remove persistent route via PowerShell

Remove-NetRoute -DestinationPrefix "10.0.0.0/8" -NextHop "192.168.1.254" -Confirm:$false
```

## PowerShell Alternative

```powershell
# Find and delete a specific route
Get-NetRoute -DestinationPrefix "10.0.0.0/8" | Remove-NetRoute -Confirm:$false

# Delete all non-system routes from an interface
Get-NetRoute -InterfaceAlias "Ethernet" | Where-Object {$_.RouteMetric -ne 0} | Remove-NetRoute -Confirm:$false
```

## Batch Cleanup of Multiple Routes

```cmd
@echo off
:: Remove all custom routes added for the corporate VPN
route delete 10.0.0.0 mask 255.0.0.0
route delete 172.16.0.0 mask 255.240.0.0
route delete 192.168.100.0 mask 255.255.255.0
echo Custom VPN routes removed.
route print
```

## Conclusion

`route delete <destination> mask <mask>` removes a route immediately. Persistent routes are also cleaned up by this command. Use PowerShell's `Remove-NetRoute` for scripted deletion with confirmation control.
