# How to Add a Static Route on Linux Using ip route

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Static Routes, Ip route, iproute2, Networking, Routing

Description: Add temporary and persistent static routes on Linux using the ip route add command to direct traffic for specific subnets through designated gateways.

## Introduction

Static routes tell the Linux kernel how to reach specific networks that are not directly connected or reachable via the default gateway. The `ip route add` command from iproute2 adds routes immediately, though they are not persistent across reboots without additional configuration.

## Add a Basic Static Route

```bash
# Route traffic for 192.168.2.0/24 through gateway 10.0.0.1

ip route add 192.168.2.0/24 via 10.0.0.1

# Route through a specific interface
ip route add 192.168.2.0/24 dev eth0

# Route with both gateway and interface specified
ip route add 192.168.2.0/24 via 10.0.0.1 dev eth0
```

## View the Routing Table

```bash
# Show all routes
ip route show

# Show routes for a specific table
ip route show table main

# Show routes for a specific network
ip route show 192.168.0.0/16
```

## Add a Host Route (/32)

```bash
# Route for a single host
ip route add 10.10.10.1/32 via 192.168.1.1
```

## Add a Default Route

```bash
# Add a default gateway
ip route add default via 192.168.1.1

# Add default route through a specific interface
ip route add default via 192.168.1.1 dev eth0
```

## Replace an Existing Route

```bash
# Replace a route without deleting and re-adding
ip route replace 192.168.2.0/24 via 10.0.0.2
```

## Delete a Static Route

```bash
ip route del 192.168.2.0/24
ip route del 192.168.2.0/24 via 10.0.0.1
```

## Verify Which Route Will Be Used

```bash
# Simulate routing decision for a destination
ip route get 192.168.2.100
# Output: 192.168.2.100 via 10.0.0.1 dev eth0 src 10.0.0.2 uid 0
```

## Make Routes Persistent

Routes added with `ip route add` are lost on reboot. Persist with your distribution's tool:

```bash
# Ubuntu/Netplan
# Add to /etc/netplan/01-routes.yaml:
# network:
#   version: 2
#   ethernets:
#     eth0:
#       routes:
#         - to: 192.168.2.0/24
#           via: 10.0.0.1

# RHEL/nmcli
nmcli connection modify id "<connection-name>" +ipv4.routes "192.168.2.0/24 10.0.0.1"

# systemd-networkd (.network file)
# [Route]
# Destination=192.168.2.0/24
# Gateway=10.0.0.1
```

## Conclusion

`ip route add` is the standard command for adding static routes on Linux. Specify the destination network, the gateway IP, and optionally the outgoing interface. Routes are temporary by default - use Netplan, nmcli, or systemd-networkd for persistence. Use `ip route get <destination>` to verify which route would be used for a specific destination.
