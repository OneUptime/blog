# How to Configure VXLAN MTU for Overlay Networks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, VXLAN, MTU, Overlay Network, Fragmentation, Networking, Performance

Description: Configure the correct MTU on VXLAN interfaces and bridge devices to prevent packet fragmentation in overlay networks.

## Introduction

VXLAN adds significant overhead to each packet: outer IP header (20 bytes) + outer UDP header (8 bytes) + VXLAN header (8 bytes) + inner Ethernet header (14 bytes) = 50 bytes total overhead. This reduces the effective MTU for the overlay payload from 1500 bytes to 1450 bytes. Setting the correct MTU prevents fragmentation and improves overlay network performance.

## VXLAN MTU Calculation

```text
Physical MTU:        1500 bytes
VXLAN overhead:       -50 bytes (14 inner Ethernet + 20 outer IP + 8 UDP + 8 VXLAN)
VXLAN payload MTU:   1450 bytes

Note: The 50-byte overhead accounts for the outer encapsulation headers.
The commonly used value is 1450 bytes.
```

## Set MTU on VXLAN Interface

```bash
# Set MTU on the VXLAN interface

ip link set vxlan0 mtu 1450

# Verify
ip link show vxlan0 | grep mtu
```

## Set MTU on the Bridge

If the VXLAN is attached to a bridge, set the MTU there too:

```bash
ip link set br-overlay mtu 1450
```

## Jumbo Frames for Higher Throughput

If your physical network supports jumbo frames (9000 MTU), configure accordingly:

```bash
# Physical MTU = 9000
# VXLAN overhead = 50
# Overlay MTU = 8950

ip link set eth0 mtu 9000       # Physical interface
ip link set vxlan0 mtu 8950     # VXLAN overlay
ip link set br-overlay mtu 8950 # Bridge
```

## Configure MSS Clamping

TCP MSS clamping ensures TCP connections don't exceed the tunnel MTU:

```bash
# Clamp MSS for traffic going through the VXLAN overlay
# MSS = VXLAN_MTU - 40 (IP+TCP headers) = 1410
iptables -A FORWARD -o vxlan0 -p tcp --tcp-flags SYN,RST SYN \
    -j TCPMSS --set-mss 1410

iptables -A FORWARD -o br-overlay -p tcp --tcp-flags SYN,RST SYN \
    -j TCPMSS --clamp-mss-to-pmtu
```

## Test for MTU Issues

```bash
# Test with a packet that fits within VXLAN MTU (1422 bytes of ICMP payload)
ping -s 1422 -M do -c 3 10.200.0.2

# Test with a packet too large for VXLAN (should fail with DF bit)
ping -s 1452 -M do -c 3 10.200.0.2
# ping: local error: message too long, mtu=1450
```

## systemd-networkd MTU Configuration

```ini
# /etc/systemd/network/10-vxlan0.network
[Match]
Name=vxlan0

[Link]
MTUBytes=1450

[Network]
Bridge=br-overlay
```

## Persistent MTU with Netplan

```yaml
# For the bridge containing the VXLAN
bridges:
  br-overlay:
    mtu: 1450
    interfaces: [vxlan0]
```

## Conclusion

VXLAN MTU must be set to 1450 bytes (physical MTU 1500 minus 50 bytes overhead) to prevent fragmentation. Set the MTU on both the VXLAN interface and any bridge it is attached to. Use TCP MSS clamping for TCP connections traversing the overlay. If your underlay supports jumbo frames, increase both underlay and overlay MTUs proportionally for higher performance.
