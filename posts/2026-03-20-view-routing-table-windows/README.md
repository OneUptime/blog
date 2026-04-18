# How to View the Routing Table on Windows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, Routing, Window, IPv4

Description: Learn how to view and interpret the IPv4 routing table on Windows using route print and PowerShell commands.

## Viewing the Routing Table with `route print`

```cmd
route print
```

Sample output:

```text
===========================================================================
Interface List
  4...00 50 56 c0 00 08 ......vmxnet3 Ethernet Adapter
  1...........................Software Loopback Interface 1
===========================================================================

IPv4 Route Table
===========================================================================
Active Routes:
Network Destination        Netmask          Gateway       Interface  Metric
          0.0.0.0          0.0.0.0      192.168.1.1    192.168.1.10      25
        127.0.0.0        255.0.0.0         On-link       127.0.0.1     331
      192.168.1.0    255.255.255.0         On-link    192.168.1.10     281
    192.168.1.10  255.255.255.255         On-link    192.168.1.10     281
    192.168.1.255  255.255.255.255         On-link    192.168.1.10     281
        224.0.0.0        240.0.0.0         On-link       127.0.0.1     331
  255.255.255.255  255.255.255.255         On-link       127.0.0.1     331
===========================================================================
```

### Column Meanings

| Column | Description |
|--------|-------------|
| Network Destination | Destination IP or network |
| Netmask | Subnet mask for this route |
| Gateway | Next-hop router IP (or On-link if directly connected) |
| Interface | Local IP of the outgoing interface |
| Metric | Route cost (lower = preferred) |

### Special Entries

| Destination | Purpose |
|-------------|---------|
| 0.0.0.0 | Default route (gateway of last resort) |
| 127.0.0.0/8 | Loopback |
| 224.0.0.0/4 | Multicast |
| 255.255.255.255 | Limited broadcast |

## Filtering with route print -4 or -6

```cmd
# Show only IPv4 routes

route print -4

# Show only IPv6 routes
route print -6
```

## Using PowerShell

```powershell
# Get all routes
Get-NetRoute

# IPv4 only
Get-NetRoute -AddressFamily IPv4

# Filter by destination
Get-NetRoute -DestinationPrefix "0.0.0.0/0"

# Show specific interface routes
Get-NetRoute -InterfaceAlias "Ethernet"

# Formatted table
Get-NetRoute -AddressFamily IPv4 | Select-Object DestinationPrefix, NextHop, RouteMetric, InterfaceAlias | Format-Table -AutoSize
```

Sample PowerShell output:

```text
DestinationPrefix  NextHop       RouteMetric InterfaceAlias
-----------------  -------       ----------- --------------
0.0.0.0/0          192.168.1.1   25          Ethernet
127.0.0.0/8        0.0.0.0       281         Loopback Pseudo-Interface 1
192.168.1.0/24     0.0.0.0       281         Ethernet
```

## Find the Route for a Specific Destination

```cmd
# Filter routing table output by a matching string (e.g. default route)
route print | findstr "0.0.0.0"

# PowerShell: find which route would be used to reach 8.8.8.8
Find-NetRoute -RemoteIPAddress 8.8.8.8
```

## Exporting the Routing Table

```cmd
# To text file
route print > C:\routes.txt

# PowerShell CSV export
Get-NetRoute -AddressFamily IPv4 | Export-Csv C:\routes.csv -NoTypeInformation
```

## Key Takeaways

- `route print` shows the IPv4 routing table including the default gateway.
- `On-link` gateway means the destination is directly on the same subnet.
- Use `route print -4` for IPv4-only output.
- `Get-NetRoute` in PowerShell provides richer filtering and scripting support.

**Related Reading:**

- [How to Add a Static Route on Windows](https://oneuptime.com/blog/post/2026-03-20-add-static-route-windows/view)
- [How to View the Routing Table on Linux](https://oneuptime.com/blog/post/2026-03-20-view-routing-table-linux/view)
- [How to Understand How IPv4 Routing Decisions Are Made](https://oneuptime.com/blog/post/2026-03-20-ipv4-routing-decisions/view)
