# How to Configure VRF (Virtual Routing and Forwarding) on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Networking, VRF, Routing, Network Isolation, IPv4

Description: Configure Virtual Routing and Forwarding (VRF) on Linux to create multiple isolated routing tables within a single host for network segmentation and multi-tenancy.

## Introduction

VRF (Virtual Routing and Forwarding) creates separate, isolated routing table instances within a single router or Linux host. Interfaces assigned to a VRF participate in that VRF's routing table exclusively, providing network segmentation without requiring separate physical devices. VRFs are widely used in ISPs, data centers, and multi-tenant environments.

## Creating a VRF on Linux

```bash
# Create a VRF named "customer-a" with routing table ID 10

ip link add customer-a type vrf table 10
ip link set customer-a up

# Verify the VRF was created
ip link show type vrf
ip vrf show
```

## Assigning Interfaces to a VRF

```bash
# Assign eth1 to the customer-a VRF
# Note: assigning removes it from the main routing table
ip link set eth1 master customer-a

# Assign IP to eth1 (it now routes via VRF table 10)
ip addr add 192.168.10.1/24 dev eth1

# Verify interface is in the VRF
ip link show eth1
# eth1: ... master customer-a ...
```

## Viewing VRF-Specific Routing Tables

```bash
# Show the routing table for a specific VRF
ip route show vrf customer-a

# Show all VRFs and their routes
ip vrf show
ip route show table 10    # by table number

# Check connected routes in the VRF
ip route show vrf customer-a
# 192.168.10.0/24 dev eth1 proto kernel scope link src 192.168.10.1
```

## Adding Routes Within a VRF

```bash
# Add a static route in the customer-a VRF
ip route add 10.50.0.0/24 via 192.168.10.254 vrf customer-a

# Add a default route for the VRF
ip route add default via 192.168.10.254 vrf customer-a
```

## Running Commands in VRF Context

```bash
# Execute a command within a specific VRF context
ip vrf exec customer-a ping 10.50.0.1

# Test HTTP connectivity within VRF
ip vrf exec customer-a curl http://10.50.0.1

# Open a bash shell in VRF context (useful for testing)
ip vrf exec customer-a bash
```

## Using Multiple VRFs for Multi-Tenancy

```bash
# Create second VRF for customer-b
ip link add customer-b type vrf table 20
ip link set customer-b up
ip link set eth2 master customer-b
ip addr add 192.168.20.1/24 dev eth2

# The two VRFs are fully isolated - no cross-VRF routing by default
ip vrf show
# Name              Table
# customer-a        10
# customer-b        20
```

## Persistent VRF Configuration (systemd-networkd)

```ini
# /etc/systemd/network/10-vrf-customer-a.netdev
[NetDev]
Name=customer-a
Kind=vrf

[VRF]
Table=10
```

```ini
# /etc/systemd/network/20-eth1.network
[Match]
Name=eth1

[Network]
VRF=customer-a
Address=192.168.10.1/24
```

## Conclusion

Linux VRFs provide kernel-level routing isolation between tenants or network segments on a single host. Combined with network namespaces (for process-level isolation), VRFs are powerful building blocks for multi-tenant networking. Remember that VRF isolation is at the routing level only - use iptables or network namespaces for stronger security boundaries.
