# How to Display Routing Table Information with Netstat

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: netstat, Routing, Linux, IPv4, Networking, Diagnostic

Description: Use netstat -r to display the kernel IPv4 routing table, understand routing entries, and diagnose routing problems on Linux.

The routing table tells the kernel where to send packets for each destination. Displaying it with netstat reveals your default gateway, directly connected networks, and any static routes - essential for diagnosing connectivity issues.

## Display the Routing Table

```bash
# Show kernel routing table (same output format as route -e)

netstat -r

# Numeric output (no DNS lookups - faster)
netstat -rn

# IPv4 only
netstat -rn4
# or
netstat -rn --inet
```

## Reading Routing Table Output

```bash
netstat -rn

# Kernel IP routing table
# Destination     Gateway         Genmask         Flags   MSS Window  irtt Iface
# 0.0.0.0         192.168.1.1     0.0.0.0         UG        0 0          0 eth0
# 192.168.1.0     0.0.0.0         255.255.255.0   U         0 0          0 eth0
# 10.0.0.0        10.8.0.1        255.0.0.0       UG        0 0          0 tun0

# Destination: 0.0.0.0 = default route (catch-all)
# Gateway:     0.0.0.0 = directly connected (no gateway needed)
# Genmask:     subnet mask (0.0.0.0 = default, 255.255.255.0 = /24)

# Flags:
# U = route is Up
# G = use Gateway (not directly connected)
# H = route to a Host (not network)
# ! = route is rejected
```

## Understanding the Default Route

```bash
netstat -rn | grep '^0.0.0.0'
# 0.0.0.0  192.168.1.1  0.0.0.0  UG  0 0  0 eth0
#                ^
#          Your default gateway
# All traffic not matching a more specific route goes to 192.168.1.1

# If default route is missing:
# No internet connectivity - only local network works
```

## Troubleshoot Routing Problems

```bash
# Check if there's a route to a destination
netstat -rn | grep "10.50.0"
# If nothing shown → no route to 10.50.0.x

# Check which interface handles local traffic
netstat -rn | grep "192.168.1"
# Should show U (not UG) - directly connected

# Check for multiple default routes
netstat -rn | grep '^0.0.0.0'
# Two default routes both showing UG → may cause routing issues
# Use 'route -n' or 'ip route' to compare metric values (lower = preferred)
```

## Comparing with Modern ip Route

The `ip route` command provides the same information with richer output:

```bash
# Modern equivalent of netstat -r
ip route show
# default via 192.168.1.1 dev eth0 proto dhcp metric 100
# 192.168.1.0/24 dev eth0 proto kernel scope link src 192.168.1.100

# ip route is preferred on modern systems for:
# - Multiple routing tables (ip route show table all)
# - Policy routing
# - More detail on each route
```

## Script to Check for Missing Routes

```bash
#!/bin/bash
# check-routes.sh - Verify critical routes exist

check_route() {
    DEST="$1"
    if netstat -rn | grep -q "^${DEST}"; then
        echo "OK: Route to $DEST exists"
    else
        echo "MISSING: No route to $DEST"
    fi
}

check_route "0.0.0.0"         # Default route
check_route "192.168.1.0"     # Local LAN
check_route "10.0.0.0"        # VPN network
```

The routing table is the first place to check when a host can't reach a destination - if there's no matching route, packets are dropped before they ever leave the machine.
