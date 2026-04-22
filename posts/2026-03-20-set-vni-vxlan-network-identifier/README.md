# How to Set the VNI (VXLAN Network Identifier) on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, VXLAN, VNI, Overlay Network, Networking, iproute2, SDN

Description: Understand and configure the VXLAN Network Identifier (VNI) to create separate, isolated overlay network segments on Linux VXLAN interfaces.

## Introduction

The VNI (VXLAN Network Identifier) is a 24-bit identifier (0 to 16,777,215) that distinguishes different VXLAN segments. Like a VLAN ID for 802.1Q, the VNI identifies which logical network a frame belongs to. All VTEPs participating in the same VXLAN segment must use the same VNI.

## Setting the VNI

The VNI is specified at VXLAN interface creation time using the `id` parameter:

```bash
# Create VXLAN with VNI 100

ip link add vxlan100 type vxlan id 100 dstport 4789 dev eth0

# Create VXLAN with VNI 200 (different overlay segment)
ip link add vxlan200 type vxlan id 200 dstport 4789 dev eth0

# Create VXLAN with a large VNI
ip link add vxlan-prod type vxlan id 5000100 dstport 4789 dev eth0
```

## Verify the VNI

```bash
# Show VXLAN interface details including VNI
ip -d link show vxlan100

# Sample output:
# vxlan100: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1450 qdisc noqueue
#     link/ether ...
#     vxlan id 100 dev eth0 srcport 0 0 dstport 4789 ageing 300
```

## Multiple Isolated Segments with Different VNIs

```bash
# Segment 1: VNI 100 for production workloads
ip link add vxlan100 type vxlan id 100 dstport 4789 local 10.0.0.1 dev eth0
ip addr add 10.100.0.1/24 dev vxlan100
ip link set vxlan100 up

# Segment 2: VNI 200 for development workloads
ip link add vxlan200 type vxlan id 200 dstport 4789 local 10.0.0.1 dev eth0
ip addr add 10.200.0.1/24 dev vxlan200
ip link set vxlan200 up

# Segment 3: VNI 300 for management
ip link add vxlan300 type vxlan id 300 dstport 4789 local 10.0.0.1 dev eth0
ip addr add 10.10.0.1/24 dev vxlan300
ip link set vxlan300 up
```

## VNI Isolation

Hosts on different VNIs cannot communicate directly - even if they use overlapping IP ranges:

```bash
# Host A: VNI 100, IP 10.100.0.1
# Host B: VNI 200, IP 10.100.0.2 (same IP range, different VNI - isolated at Layer 2)

# This ping will NOT work directly - different VNIs are isolated at Layer 2
# ping 10.100.0.2 from VNI 100 cannot reach Host B on VNI 200
```

## VNI Assignment Conventions

Organizations often standardize VNI assignment:

```bash
# Convention: VNI = VLAN ID × 1000
# VLAN 10 → VNI 10000
# VLAN 20 → VNI 20000

ip link add vxlan10000 type vxlan id 10000 dstport 4789 dev eth0
ip link add vxlan20000 type vxlan id 20000 dstport 4789 dev eth0
```

## Conclusion

The VNI is the core identifier in VXLAN that creates segment isolation, analogous to a VLAN ID. All VTEPs sharing the same VNI participate in the same overlay segment. VNIs range from 0 to 16,777,215 (2^24 - 1), supporting far more segments than 802.1Q VLANs. VNI cannot be changed after interface creation - delete and recreate the interface to change the VNI.
