# How to Configure Source-Specific Multicast (SSM) on IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, Multicast, SSM, IGMP, IPv4, Linux

Description: Configure Source-Specific Multicast (SSM) on IPv4 using the 232.0.0.0/8 address range, IGMPv3, and the smcroute or mrouted tools on Linux.

## Introduction

Source-Specific Multicast (SSM) restricts multicast delivery to traffic from a single, explicitly named source. Unlike Any-Source Multicast (ASM), SSM eliminates the need for a Rendezvous Point (RP), simplifying routing and improving security.

SSM uses the reserved range **232.0.0.0/8** and requires IGMPv3 on hosts.

## How SSM Differs from ASM

In ASM (`224.0.0.0/4` minus SSM range), any source may send to a group and receivers join with `(*,G)` - any source, group G. With PIM-SM, routers locate sources via an RP.

In SSM, receivers join with `(S,G)` - a specific source S and group G. No RP is needed. PIM-SSM (a subset of PIM-SM) handles routing.

## Prerequisites

- Linux host with kernel ≥ 2.4.22 (source-specific multicast socket options)
- IGMPv3 support (all modern kernels include this)
- `smcroute` for static multicast routing, or a PIM-SSM-capable daemon such as FRRouting `pimd` (if routing between subnets)

## Enabling IGMPv3 on the Receiver Interface

```bash
# Allow IGMPv3 on this interface (0 = default/no forced IGMP version; v1/v2 fallback is allowed)

echo 0 | sudo tee /proc/sys/net/ipv4/conf/eth0/force_igmp_version

# Confirm the interface is multicast-capable
ip link show eth0 | grep MULTICAST
```

## Joining an SSM Group from a Linux Host

Use a small Python script to send an IGMPv3 SSM join using a source-specific socket:

```python
#!/usr/bin/env python3
import socket

# SSM group and source to join
GROUP = "232.1.2.3"
SOURCE = "10.0.0.1"   # The only permitted sender
IFACE_ADDR = "0.0.0.0" # Use routing table; set to eth0's IPv4 address to force eth0

# Create a UDP socket and bind to the multicast group
sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
sock.bind((GROUP, 5000))

# Build the ip_mreq_source structure for SSM (IGMPv3 source-specific join)
group_bin  = socket.inet_aton(GROUP)
source_bin = socket.inet_aton(SOURCE)
iface_bin  = socket.inet_aton(IFACE_ADDR)

mreq = group_bin + iface_bin + source_bin
sock.setsockopt(socket.IPPROTO_IP, socket.IP_ADD_SOURCE_MEMBERSHIP, mreq)

print(f"Joined SSM group ({SOURCE},{GROUP}). Listening...")
while True:
    data, addr = sock.recvfrom(4096)
    print(f"Received {len(data)} bytes from {addr}")
```

## Sending to an SSM Group

```python
#!/usr/bin/env python3
import socket

GROUP = "232.1.2.3"
PORT  = 5000

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
# Set TTL to control scope (1 = link-local, higher = wider)
sock.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_TTL, 32)

sock.sendto(b"SSM test message", (GROUP, PORT))
print("Sent SSM packet")
```

## Verifying SSM Group Membership

```bash
# Show multicast group memberships
ip maddr show dev eth0

# Check /proc for IGMP source filter entries
cat /proc/net/mcfilter
```

The `/proc/net/mcfilter` output shows multicast source filter entries for active SSM joins.

## Configuring smcroute for SSM Routing

If routing SSM between subnets, install `smcroute` and add an (S,G) route:

```bash
sudo apt install smcroute
sudo systemctl enable --now smcroute

# Add a static SSM route: source 10.0.0.1, group 232.1.2.3
# Incoming on eth0, outgoing on eth1
sudo smcroutectl add eth0 10.0.0.1 232.1.2.3 eth1
```

## SSM Address Range Convention

The IANA-assigned SSM range is `232.0.0.0/8`. Routers should apply PIM-SSM behavior (no RP lookup) for any group in this range.

## Conclusion

SSM simplifies multicast architecture by tying delivery to a known source, eliminating RP infrastructure and reducing the attack surface. Enable IGMPv3 on receivers, use the `232.0.0.0/8` range, and leverage `IP_ADD_SOURCE_MEMBERSHIP` in your application for a clean SSM deployment.
