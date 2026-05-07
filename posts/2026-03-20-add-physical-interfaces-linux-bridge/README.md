# How to Add Physical Interfaces to a Linux Bridge

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Network Bridge, iproute2, Networking, L2 Switching, Bridging

Description: Add one or more physical network interfaces to a Linux bridge to create a software switch that forwards frames at Layer 2 between connected networks.

## Introduction

Adding physical interfaces to a bridge makes them "bridge ports." The bridge learns MAC addresses and forwards frames between ports, creating a virtual switch. This is used for connecting virtual machines to physical networks, bridging two network segments, and attaching multiple interfaces to the same Layer 2 domain.

## Add a Physical Interface to an Existing Bridge

```bash
# If the physical interface has an IP and you want Layer 3 on the bridge,
# flush it from the physical interface first

ip addr flush dev eth0

# Ensure the interface is up
ip link set eth0 up

# Add eth0 as a port of br0
ip link set eth0 master br0

# Verify the port was added
bridge link show
```

## Check Port State

When STP is disabled, a bridge port typically shows `state forwarding` once the link is up. With STP enabled, a forwarding port goes through listening → learning → forwarding, while a non-forwarding port may remain blocking:

```bash
# Show all bridge ports and their states
bridge link show

# Example output:
# 2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 master br0 state forwarding priority 32 cost 4
```

## Add Multiple Ports

```bash
# Add eth0 and eth1 to the bridge
ip link set eth0 master br0
ip link set eth1 master br0

# Verify both ports are on the bridge
ip link show master br0
```

## Remove a Port from the Bridge

```bash
# Remove eth0 from the bridge
ip link set eth0 nomaster

# Re-assign IP to eth0 if needed
ip addr add 192.168.1.100/24 dev eth0
```

## Set Port Priority

Bridge port priority influences STP root-port and designated-port selection:

```bash
# Set port priority (lower = more preferred, valid range 0-255)
bridge link set dev eth0 priority 16
```

## Set Port Cost

Port cost influences STP path selection (lower cost = preferred):

```bash
# Set path cost for eth0 (lower = preferred)
bridge link set dev eth0 cost 4
```

## Configure Port as Access Port (for VLAN-aware bridges)

```bash
# Enable VLAN filtering on the bridge first
ip link set br0 type bridge vlan_filtering 1

# Add eth0 as an access port for VLAN 10
bridge vlan add dev eth0 vid 10 pvid untagged

# Remove the default VLAN 1
bridge vlan del dev eth0 vid 1
```

## Verify Bridge Forwarding Database

After adding ports and generating traffic, the bridge learns MAC addresses:

```bash
# Show MAC entries for br0
bridge fdb show br br0

# Show only dynamic entries (learned from traffic)
bridge fdb show br br0 dynamic
```

## Conclusion

Adding physical interfaces to a Linux bridge with `ip link set <dev> master <bridge>` creates bridge ports that forward traffic at Layer 2. If a physical interface already has an IP address and you want the bridge interface to handle Layer 3, remove the IP from the bridge port and assign it to the bridge interface. Multiple ports create a virtual switch where the bridge forwards frames based on learned MAC addresses.
