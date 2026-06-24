# How to Add a Static Route on Windows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, Routing, Window, IPv4

Description: Learn how to add static IPv4 routes on Windows using the route add command and PowerShell for both temporary and persistent routing.

## Adding a Temporary Route with `route add`

```cmd
route add DESTINATION mask NETMASK GATEWAY [metric n] [if interface_index]
```

### Examples

```cmd
REM Route to 10.0.0.0/24 via 192.168.1.254

route add 10.0.0.0 mask 255.255.255.0 192.168.1.254

REM Route with specific metric
route add 10.0.0.0 mask 255.255.255.0 192.168.1.254 metric 5

REM Route via specific interface (use route print to find interface index)
route add 10.0.0.0 mask 255.255.255.0 192.168.1.254 if 4

REM Add default gateway
route add 0.0.0.0 mask 0.0.0.0 192.168.1.1
```

## Adding a Persistent Route

Without the `/p` switch, routes are removed at reboot. Use `/p` to make them permanent:

```cmd
REM Persistent route (survives reboot)
route /p add 10.0.0.0 mask 255.255.255.0 192.168.1.254

REM Persistent with metric
route /p add 172.16.0.0 mask 255.240.0.0 192.168.1.254 metric 10
```

Persistent routes are stored in the registry:
`HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\PersistentRoutes`

## Adding Routes with PowerShell

```powershell
# Add temporary route (ActiveStore only)
New-NetRoute -DestinationPrefix "10.0.0.0/24" -InterfaceAlias "Ethernet" `
             -NextHop "192.168.1.254" -RouteMetric 100 -PolicyStore ActiveStore

# Add route via a specific interface
New-NetRoute -DestinationPrefix "10.0.0.0/24" -NextHop "192.168.1.254" `
             -InterfaceAlias "Ethernet" -RouteMetric 100

# By default, New-NetRoute saves the route in both ActiveStore and PersistentStore
# To remove a specific route later:
Remove-NetRoute -DestinationPrefix "10.0.0.0/24" -InterfaceAlias "Ethernet" `
                -NextHop "192.168.1.254"
```

## Verifying the Route

```cmd
REM Show full routing table
route print

REM Show only the new route
route print | findstr "10.0.0"

REM Trace the path packets take to the destination
tracert -d 10.0.0.1
```

## Modifying an Existing Route

```cmd
REM The route change command modifies existing routes
route change 10.0.0.0 mask 255.255.255.0 192.168.1.1

REM PowerShell: modify metric
Set-NetRoute -DestinationPrefix "10.0.0.0/24" -RouteMetric 200
```

## Script: Add Multiple Static Routes

```cmd
@echo off
REM Add corporate network routes
set GATEWAY=192.168.1.254

route /p add 10.10.0.0 mask 255.255.255.0 %GATEWAY%
route /p add 10.20.0.0 mask 255.255.255.0 %GATEWAY%
route /p add 172.16.5.0 mask 255.255.255.0 %GATEWAY%
echo Routes added successfully
```

PowerShell version:

```powershell
$gateway = "192.168.1.254"
$interfaceAlias = "Ethernet"
$routes = @("10.10.0.0/24", "10.20.0.0/24", "172.16.5.0/24")

foreach ($route in $routes) {
    New-NetRoute -DestinationPrefix $route -InterfaceAlias $interfaceAlias `
                 -NextHop $gateway -RouteMetric 100
    Write-Host "Added route: $route via $gateway on $interfaceAlias"
}
```

## Key Takeaways

- `route add DESTINATION mask NETMASK GATEWAY` adds a temporary route on Windows.
- Use the `/p` switch with `route add` to make the route persistent across reboots.
- PowerShell's `New-NetRoute` saves routes in both `ActiveStore` and `PersistentStore` by default.
- Use `route print` to verify routes; `route change` to modify existing ones.

**Related Reading:**

- [How to View the Routing Table on Windows](https://oneuptime.com/blog/post/2026-03-20-view-routing-table-windows/view)
- [How to Add a Static Route on Linux](https://oneuptime.com/blog/post/2026-03-20-add-static-route-linux/view)
- [How to Configure a Default Gateway on Linux](https://oneuptime.com/blog/post/2026-03-20-configure-default-gateway-linux/view)
