# How to Understand IPv4 Multicast Addressing (224.0.0.0/4)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Multicast, Addressing, IGMP, Networking, 224.0.0.0

Description: Understand IPv4 multicast address ranges, the relationship between multicast IP addresses and Ethernet MAC addresses, and how to identify multicast traffic on your network.

## Introduction

IPv4 multicast uses the address range 224.0.0.0/4 (224.0.0.0 to 239.255.255.255). Multicast enables one-to-many communication where a single packet is delivered to all interested receivers without requiring the sender to send individual copies. Applications like video streaming, financial data feeds, service discovery protocols like mDNS, and routing protocols like OSPF and RIP rely on multicast. Understanding the address structure is the foundation for configuring and troubleshooting multicast networks.

## IPv4 Multicast Address Ranges

```text
Multicast Address Space: 224.0.0.0/4

Subranges and their purposes:

224.0.0.0/24  - Link-Local Multicast (Local Network Control Block)
  224.0.0.1   - All Hosts (all systems on subnet)
  224.0.0.2   - All Routers
  224.0.0.5   - OSPF routers (All OSPF Routers)
  224.0.0.6   - OSPF Designated Router
  224.0.0.9   - RIP v2 routers
  224.0.0.12  - DHCP server/relay
  224.0.0.18  - VRRP
  224.0.0.251 - mDNS (Bonjour/Avahi)
  224.0.0.252 - LLMNR (Link-Local Multicast Name Resolution)
  Note: NOT forwarded by routers, regardless of TTL

224.0.1.0/24  - Internetwork Control Block (can be routed)
  224.0.1.1   - NTP (Network Time Protocol)
  224.0.1.22  - SVRLOC (Service Location)

232.0.0.0/8   - Source-Specific Multicast (SSM)
  Used with IGMPv3 - receivers specify source IP
  More efficient: receivers join (S,G) channels directly

233.0.0.0-233.251.255.255 - GLOP Addressing (ASN-based multicast)
  Public 16-bit ASN in middle two octets: 233.x.y.0/24 for AS x*256+y

239.0.0.0/8   - Administratively Scoped (Organization-Local)
  239.255.255.250 - SSDP/UPnP discovery
  Similar to RFC 1918 private addresses: not globally routed
  Use these for internal multicast applications
```

## Multicast IP to Ethernet MAC Mapping

```text
IPv4 multicast IP addresses map to Ethernet multicast MAC addresses:

Formula:
  Ethernet prefix: 01:00:5e
  Append low-order 23 bits of multicast IP address
  (low 7 bits of second octet plus all of third and fourth octets)

Examples:
  IP 224.0.0.1   → MAC 01:00:5e:00:00:01
  IP 224.0.0.251 → MAC 01:00:5e:00:00:fb
  IP 239.255.255.250 → MAC 01:00:5e:7f:ff:fa
  IP 224.1.0.1   → MAC 01:00:5e:01:00:01

Ambiguity:
  Only 23 bits of 28 available multicast bits are used
  5 bits are discarded → 32 IP addresses map to same MAC
  Example: 224.0.0.1 and 225.0.0.1 both map to 01:00:5e:00:00:01
  Layer-2 filtering by MAC alone can forward extra traffic
  Hosts discard unwanted packets at the IP layer
  Important for IGMP snooping design
```

## Identify Multicast Traffic

```bash
# Capture all multicast traffic on interface:

tcpdump -i eth0 -n 'dst net 224.0.0.0/4'

# Capture specific multicast group:
tcpdump -i eth0 -n 'dst host 224.0.0.251'  # mDNS

# Show multicast group memberships on this host:
netstat -g
# Or:
ip maddr show
# Or per-interface:
ip maddr show eth0

# Show multicast routing table:
ip mroute show
# Requires multicast routing daemon (pimd, smcroute)

# Check if interface is in all-multicast mode:
ip -details link show eth0 | grep -o 'allmulti [01]'

# List all multicast groups joined by all interfaces:
cat /proc/net/igmp
# Format: Idx Device Count Querier Group Users Timer Reporter
```

## Join Multicast Group with Python

```python
#!/usr/bin/env python3
# Receive UDP multicast

import socket
import struct

MCAST_GRP = '239.255.0.1'    # Administratively scoped
MCAST_PORT = 5007

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
sock.bind(('', MCAST_PORT))

# Join multicast group:
mreq = struct.pack('4s4s',
    socket.inet_aton(MCAST_GRP),
    socket.inet_aton('0.0.0.0'))  # 0.0.0.0 = default interface
sock.setsockopt(socket.IPPROTO_IP, socket.IP_ADD_MEMBERSHIP, mreq)

print(f"Listening on {MCAST_GRP}:{MCAST_PORT}")
while True:
    data, addr = sock.recvfrom(1024)
    print(f"Received from {addr}: {data.decode()}")
```

## Send Multicast Packets

```python
#!/usr/bin/env python3
# Send UDP multicast

import socket
import time

MCAST_GRP = '239.255.0.1'
MCAST_PORT = 5007
TTL = 2  # Hops: 1=local subnet, 2+=routed

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)

# Set TTL for multicast packets:
sock.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_TTL, TTL)

# Disable loopback (don't receive own packets):
sock.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_LOOP, 0)

for i in range(5):
    msg = f"Hello multicast group, message {i}".encode()
    sock.sendto(msg, (MCAST_GRP, MCAST_PORT))
    print(f"Sent: {msg.decode()}")
    time.sleep(1)

sock.close()
```

## Conclusion

IPv4 multicast uses 224.0.0.0/4, divided into link-local (224.0.0.0/24, not routed), SSM (232.0.0.0/8), and administratively scoped (239.0.0.0/8) ranges for private use. Multicast IP addresses map to Ethernet MAC addresses using the 01:00:5e prefix with the low 23 bits of the IP. For application multicast, use the 239.0.0.0/8 range. For protocol traffic, use the well-known assigned groups: OSPF and mDNS use addresses in 224.0.0.0/24, while SSDP uses 239.255.255.250. Use `ip maddr show` and `cat /proc/net/igmp` to inspect active multicast group memberships on your Linux system.
