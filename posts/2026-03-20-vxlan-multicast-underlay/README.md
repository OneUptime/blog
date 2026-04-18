# How to Configure VXLAN with Multicast Underlay

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, VXLAN, Multicast, Overlay Network, Networking, SDN, iproute2

Description: Configure VXLAN to use IP multicast for BUM (Broadcast, Unknown Unicast, Multicast) traffic flooding, enabling dynamic VTEP discovery without manual configuration.

## Introduction

VXLAN with multicast underlay uses an IP multicast group to handle BUM traffic - broadcasts, unknown unicast, and multicast frames. When a VTEP needs to send a frame but doesn't know the destination VTEP, it sends to the multicast group. All VTEPs subscribed to the group receive the frame and learn the source MAC-to-VTEP mapping.

## Prerequisites

- Multicast routing enabled in the underlay network
- All VTEP hosts can send/receive multicast
- Root access

## Create VXLAN with Multicast Group

```bash
# On all VTEP hosts (each host runs this command)

# Create VXLAN interface with multicast group 239.1.1.1
# id = VNI, dstport = UDP port, group = multicast group for BUM flooding,
# dev = underlay interface used to send/receive multicast

ip link add vxlan0 type vxlan \
    id 100 \
    dstport 4789 \
    group 239.1.1.1 \
    dev eth0

ip addr add 10.100.0.1/24 dev vxlan0
ip link set vxlan0 up
```

## Example: Three-Host VXLAN Network

### Host 1 (underlay: 10.0.0.1, overlay: 10.100.0.1)

```bash
ip link add vxlan0 type vxlan id 100 dstport 4789 \
    group 239.1.1.1 dev eth0
ip addr add 10.100.0.1/24 dev vxlan0
ip link set vxlan0 up
```

### Host 2 (underlay: 10.0.0.2, overlay: 10.100.0.2)

```bash
ip link add vxlan0 type vxlan id 100 dstport 4789 \
    group 239.1.1.1 dev eth0
ip addr add 10.100.0.2/24 dev vxlan0
ip link set vxlan0 up
```

### Host 3 (underlay: 10.0.0.3, overlay: 10.100.0.3)

```bash
ip link add vxlan0 type vxlan id 100 dstport 4789 \
    group 239.1.1.1 dev eth0
ip addr add 10.100.0.3/24 dev vxlan0
ip link set vxlan0 up
```

## Test VXLAN Multicast Connectivity

```bash
# From Host 1, ping Host 2 and Host 3
ping -c 3 10.100.0.2
ping -c 3 10.100.0.3

# Check the VXLAN FDB to see learned VTEP mappings
bridge fdb show dev vxlan0
```

## Allow Multicast and VXLAN UDP

```bash
# Allow multicast traffic
iptables -A INPUT -d 239.0.0.0/8 -j ACCEPT

# Allow VXLAN UDP
iptables -A INPUT -p udp --dport 4789 -j ACCEPT
```

## Monitor Multicast Group Membership

```bash
# Check if the host has joined the multicast group
ip maddr show dev eth0

# Should show the VXLAN multicast group:
# link  01:00:5e:01:01:01
# inet  239.1.1.1
```

## Verify VXLAN FDB Learning

```bash
# After generating traffic, check FDB for remote VTEP entries
bridge fdb show dev vxlan0

# Example output (after MAC learning):
# aa:bb:cc:dd:ee:11 dev vxlan0 dst 10.0.0.2 self    <- learned unicast entry
# 00:00:00:00:00:00 dev vxlan0 dst 239.1.1.1 via eth0  <- multicast entry
```

## Conclusion

VXLAN multicast underlay enables dynamic VTEP discovery: all VTEPs join a common multicast group and flood BUM traffic to it. After MAC learning, subsequent unicast traffic goes directly to the known VTEP. This eliminates the need to manually configure remote VTEP IPs but requires multicast routing in the underlay network. For environments without multicast, use unicast head-end replication instead.
