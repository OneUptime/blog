# How to Assign an IPv4 Address to a VXLAN Interface

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, VXLAN, IPv4, Overlay Network, iproute2, Networking

Description: Assign an IPv4 address to a VXLAN interface as the overlay network endpoint IP, enabling host communication within the VXLAN segment.

## Introduction

A VXLAN interface can operate in two ways: it can have an IP address assigned directly to it so the host can communicate over the overlay, or be added to a bridge for Layer 2 overlay. This guide covers the IP address assignment approach, where each host gets an overlay IP on the VXLAN interface.

## Create VXLAN and Assign an IP

```bash
# Create the VXLAN interface with VNI 100

ip link add vxlan0 type vxlan \
    id 100 \
    dstport 4789 \
    remote 10.0.0.2 \
    local 10.0.0.1 \
    dev eth0

# Assign the overlay IP address
ip addr add 192.168.100.1/24 dev vxlan0

# Bring up the interface
ip link set vxlan0 up

# Verify
ip addr show vxlan0
```

## Choose the Right Subnet for the Overlay

The overlay IP subnet is independent of the underlay:
- Underlay: `10.0.0.0/24` (the network that carries VXLAN UDP packets)
- Overlay: `192.168.100.0/24` (the network inside the VXLAN tunnel)

```bash
# Example overlay subnet assignments
# Host 1: underlay 10.0.0.1 → overlay 192.168.100.1/24
# Host 2: underlay 10.0.0.2 → overlay 192.168.100.2/24
# Host 3: underlay 10.0.0.3 → overlay 192.168.100.3/24
```

## Two-Host VXLAN with IP Addresses

### Host 1

```bash
ip link add vxlan0 type vxlan id 100 dstport 4789 \
    remote 10.0.0.2 local 10.0.0.1 dev eth0
ip addr add 192.168.100.1/24 dev vxlan0
ip link set vxlan0 up
```

### Host 2

```bash
ip link add vxlan0 type vxlan id 100 dstport 4789 \
    remote 10.0.0.1 local 10.0.0.2 dev eth0
ip addr add 192.168.100.2/24 dev vxlan0
ip link set vxlan0 up
```

## Test Overlay Connectivity

```bash
# From Host 1, ping Host 2's overlay IP
ping -c 3 192.168.100.2

# Verify route is correct
ip route get 192.168.100.2
# Should show: dev vxlan0 src 192.168.100.1
```

## Multiple VXLANs with Different IPs

```bash
# VNI 100 - Overlay subnet A
ip link add vxlan100 type vxlan id 100 dstport 4789 \
    remote 10.0.0.2 local 10.0.0.1 dev eth0
ip addr add 10.100.0.1/24 dev vxlan100
ip link set vxlan100 up

# VNI 200 - Overlay subnet B
ip link add vxlan200 type vxlan id 200 dstport 4789 \
    remote 10.0.0.2 local 10.0.0.1 dev eth0
ip addr add 10.200.0.1/24 dev vxlan200
ip link set vxlan200 up
```

## Remove IP from VXLAN Interface

```bash
# Remove the IP (e.g., before switching to bridge mode)
ip addr del 192.168.100.1/24 dev vxlan0
```

## Conclusion

Assigning an IPv4 address to a VXLAN interface gives the host a routable IP on the overlay. Use a separate overlay subnet that is distinct from the underlay. Each host's VXLAN interface gets a unique IP in the same overlay subnet. VXLAN handles the encapsulation of frames, and the IP address allows standard routing to function over the virtual network.
