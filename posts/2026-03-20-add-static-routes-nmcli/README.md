# How to Add Static Routes with nmcli

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, nmcli, NetworkManager, Static Routes, Routing, Networking

Description: Add persistent static routes to NetworkManager connection profiles using nmcli, including network routes, host routes, and routes with metrics.

## Introduction

Static routes in NetworkManager are stored per-connection in `ipv4.routes`. They are applied when the connection activates and removed when it goes down. Use `nmcli connection modify` to add, remove, or replace routes.

## Add a Static Route

```bash
# Add a route to 192.168.50.0/24 via gateway 10.0.0.2

nmcli connection modify "Wired connection 1" \
    +ipv4.routes "192.168.50.0/24 10.0.0.2"

# Apply
nmcli connection up "Wired connection 1"
```

## Verify the Route Was Applied

```bash
# Check the routing table
ip route show

# Verify the route is stored in the connection
nmcli connection show "Wired connection 1" | grep routes
```

## Add Multiple Static Routes

```bash
# Add multiple routes (run multiple times with +)
nmcli connection modify "myconn" \
    +ipv4.routes "192.168.50.0/24 10.0.0.2"
nmcli connection modify "myconn" \
    +ipv4.routes "172.16.0.0/16 10.0.0.3"
nmcli connection modify "myconn" \
    +ipv4.routes "10.20.0.0/24 10.0.0.4"

nmcli connection up "myconn"
```

## Add a Route with a Custom Metric

```bash
# Format: "destination/prefix gateway metric"
nmcli connection modify "myconn" \
    +ipv4.routes "192.168.50.0/24 10.0.0.2 100"

nmcli connection up "myconn"
```

## Add a Host Route

```bash
# Route to a single host (/32)
nmcli connection modify "myconn" \
    +ipv4.routes "10.5.5.5/32 10.0.0.2"

nmcli connection up "myconn"
```

## Remove a Specific Static Route

```bash
# Use - prefix to remove a route
nmcli connection modify "myconn" \
    -ipv4.routes "192.168.50.0/24 10.0.0.2"

nmcli connection up "myconn"
```

## Replace All Routes

```bash
# Set routes (replaces all existing routes in the profile)
nmcli connection modify "myconn" \
    ipv4.routes "192.168.50.0/24 10.0.0.2, 192.168.60.0/24 10.0.0.3"

nmcli connection up "myconn"
```

## Ignore Routes Pushed by DHCP

```bash
# Do not install routes provided by DHCP server
nmcli connection modify "myconn" \
    ipv4.ignore-auto-routes yes

nmcli connection up "myconn"
```

## Conclusion

Static routes in nmcli are managed via `+ipv4.routes "<dest> <gateway> [metric]"`. Use `+` to append and `-` to remove specific routes. Routes are applied when the connection activates and removed when it deactivates. Verify with `ip route show` after activating.
