# How to Add a Static Route on Windows Using route add

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Window, Networking, Route, Static Routes, IPv4, Routing

Description: Add temporary and persistent static IPv4 routes on Windows using the route add command, specify the metric, and verify the route was added to the routing table.

## Introduction

The Windows `route` command manages the IPv4 routing table from the command line. Adding a static route tells Windows to send traffic destined for a specific subnet through a designated gateway, overriding the default route.

## Adding a Temporary Static Route

Without the `-p` flag, the route exists only until the next reboot:

```cmd
:: Route 10.0.0.0/255.0.0.0 (10.0.0.0/8) via 192.168.1.254
route add 10.0.0.0 mask 255.0.0.0 192.168.1.254

:: Route a specific /24
route add 172.16.5.0 mask 255.255.255.0 192.168.1.254
```

## Adding a Persistent Static Route

Use the `-p` flag to make the route survive reboots:

```cmd
:: Persistent route
route add -p 10.0.0.0 mask 255.0.0.0 192.168.1.254
```

Persistent routes are stored in the registry under:
`HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\PersistentRoutes`

## Specifying a Metric

The metric determines route preference (lower = preferred):

```cmd
:: Add route with metric 10
route add 10.0.0.0 mask 255.0.0.0 192.168.1.254 metric 10
```

## Specifying the Interface

When multiple NICs are present, pin the route to a specific interface:

```cmd
:: Find interface index
route print

:: Add route via specific interface (IF index)
route add 10.0.0.0 mask 255.0.0.0 192.168.1.254 if 12
```

## Verifying the Route Was Added

```cmd
:: Show all routes
route print

:: Filter for the specific subnet
route print | findstr "10.0.0.0"
```

## PowerShell Alternative

```powershell
# Add route using PowerShell (persistent by default)

New-NetRoute -InterfaceAlias "Ethernet" `
    -DestinationPrefix "10.0.0.0/8" `
    -NextHop "192.168.1.254" `
    -RouteMetric 10
```

## Confirming the Route Is Used

```cmd
:: Check which route would be used to reach a destination
tracert 10.5.5.5

:: Or use PowerShell
Find-NetRoute -RemoteIPAddress 10.5.5.5
```

## Complete Route Add Syntax

```text
route [-p] add <destination> mask <mask> <gateway> [metric <M>] [if <interface>]

  -p              Persistent (survives reboot)
  destination     Network address
  mask            Subnet mask
  gateway         Next-hop IP address
  metric          Route cost (optional, 1-9999)
  if              Interface index (optional)
```

## Conclusion

`route add` with the `-p` flag creates persistent static routes on Windows. Always verify with `route print` after adding, and use `tracert` to confirm traffic follows the new path. For scripting, PowerShell's `New-NetRoute` provides a more structured interface.
