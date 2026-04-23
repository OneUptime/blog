# How to Reduce Broadcast Domain Size with VLANs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, VLAN, Broadcast, Switching, Network Design, Cisco

Description: Reduce the size of broadcast domains by segmenting a flat network into multiple VLANs, limiting the reach of ARP, DHCP, and other broadcast traffic to smaller, more manageable groups.

## Introduction

A broadcast domain is the set of all devices that receive a broadcast frame. In a flat network, every device hears every broadcast. As networks grow, broadcast overhead consumes increasing bandwidth and CPU. VLANs solve this by partitioning the Layer 2 domain into isolated segments - each VLAN is its own broadcast domain.

## Why Broadcast Domain Size Matters

In a single VLAN with 500 hosts:
- Every ARP request reaches all 500 hosts
- Every DHCP Discover reaches all 500 hosts
- A broadcast storm affects all 500 hosts

Splitting into 10 VLANs of 50 hosts each reduces broadcast radius by 90%.

## Creating VLANs on a Cisco Switch

```text
! Create VLANs 10, 20, and 30
vlan 10
 name Engineering

vlan 20
 name Marketing

vlan 30
 name Finance

! Assign access ports to VLANs
interface GigabitEthernet0/1
 switchport mode access
 switchport access vlan 10

interface GigabitEthernet0/2
 switchport mode access
 switchport access vlan 20

interface GigabitEthernet0/3
 switchport mode access
 switchport access vlan 30

! Configure 802.1Q trunk uplink
interface GigabitEthernet0/24
 switchport mode trunk
 switchport trunk allowed vlan 10,20,30
```

## Configuring SVIs for Inter-VLAN Routing

To allow traffic between VLANs, configure Switch Virtual Interfaces (SVIs):

```text
! Create L3 gateway for each VLAN (on a multilayer switch)
interface vlan 10
 ip address 192.168.10.1 255.255.255.0
 no shutdown

interface vlan 20
 ip address 192.168.20.1 255.255.255.0
 no shutdown

interface vlan 30
 ip address 192.168.30.1 255.255.255.0
 no shutdown

ip routing
```

## Creating VLANs on Linux with ip link

```bash
# Create VLAN 10 and VLAN 20 subinterfaces on eth0

sudo ip link add link eth0 name eth0.10 type vlan id 10
sudo ip link add link eth0 name eth0.20 type vlan id 20

# Assign IP addresses
sudo ip addr add 192.168.10.1/24 dev eth0.10
sudo ip addr add 192.168.20.1/24 dev eth0.20

# Bring them up
sudo ip link set eth0.10 up
sudo ip link set eth0.20 up
```

## Broadcast Isolation Verification

After VLAN segmentation, confirm broadcasts do not cross VLAN boundaries:

```bash
# Send a broadcast from a host on VLAN 10
echo "test" | socat - UDP-DATAGRAM:192.168.10.255:9999,broadcast

# Verify it is NOT received by a host on VLAN 20
sudo tcpdump -i eth0.20 -n "dst 192.168.10.255"
# Should show: 0 packets captured
```

## Sizing VLANs Correctly

| Network Size | Recommended VLAN Size | Max Broadcast Rate |
|---|---|---|
| Data center server VLAN | /24 (254 hosts) | Low (servers rarely broadcast) |
| Office workstation VLAN | /25 (126 hosts) | Medium |
| IoT / building automation | /26 (62 hosts) | Low - isolate from user VLANs |
| VoIP phones | Dedicated /24 | Keep QoS isolated |

## Conclusion

VLANs are the primary tool for controlling broadcast domain size. Segment by function or department, size each VLAN to match actual host counts (avoid oversized /16 flat networks), and use SVIs or a router for inter-VLAN routing. The result is a dramatically quieter, more resilient network.
