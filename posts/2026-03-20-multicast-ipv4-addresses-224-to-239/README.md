# How to Identify Multicast IPv4 Addresses (224.0.0.0 to 239.255.255.255)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Multicast, Networking, IGMP, IP Addressing

Description: IPv4 multicast addresses in the 224.0.0.0/4 range allow a single packet to be delivered to a group of interested receivers, enabling efficient one-to-many data distribution for streaming, routing...

## The Multicast Address Space

The entire `224.0.0.0/4` block (224.0.0.0 through 239.255.255.255) is reserved for multicast. This corresponds to Class D in the original classful scheme.

## Multicast Address Ranges

| Range | Description |
|-------|-------------|
| 224.0.0.0/24 | Link-local multicast (TTL=1, not routed) |
| 224.0.1.0/24 | Internetwork control |
| 232.0.0.0/8 | Source-Specific Multicast (SSM) |
| 233.0.0.0/8 | GLOP addressing (AS-based) |
| 239.0.0.0/8 | Administratively scoped (organization-internal) |

## Well-Known Link-Local Multicast Addresses

| Address | Protocol | Use |
|---------|---------|-----|
| 224.0.0.1 | All Hosts | All systems on segment |
| 224.0.0.2 | All Routers | All routers on segment |
| 224.0.0.5 | OSPF | All OSPF routers |
| 224.0.0.6 | OSPF DR/BDR | Designated routers |
| 224.0.0.9 | RIPv2 | All RIP routers |
| 224.0.0.12 | DHCP | DHCP servers/relays |
| 224.0.0.18 | VRRP | Virtual Router Redundancy |
| 224.0.0.22 | IGMP | IGMP membership reports |
| 239.255.255.250 | SSDP/UPnP | Device discovery |

## Checking Multicast Membership on Linux

```bash
# View multicast group memberships
ip maddr show

# View IGMP group membership
cat /proc/net/igmp
```

Join a multicast group with Python:

```python
import socket
import struct

MCAST_GRP = "224.1.1.1"
MCAST_PORT = 5007

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
sock.bind(("", MCAST_PORT))

# Join the multicast group
mreq = struct.pack("4sL", socket.inet_aton(MCAST_GRP), socket.INADDR_ANY)
sock.setsockopt(socket.IPPROTO_IP, socket.IP_ADD_MEMBERSHIP, mreq)
print(f"Joined {MCAST_GRP}:{MCAST_PORT}")
```

## Sending Multicast Traffic

```python
import socket

MCAST_GRP = "224.1.1.1"
MCAST_PORT = 5007

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
# Set TTL for multicast packets (1 = local segment only)
sock.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_TTL, 1)
sock.sendto(b"Hello, multicast group!", (MCAST_GRP, MCAST_PORT))
sock.close()
```

## Multicast MAC Address Mapping

Multicast IPs map to Ethernet multicast MACs using the formula:
- Take the low 23 bits of the IP multicast address.
- Map onto the base `01:00:5E:xx:xx:xx` MAC prefix.

Example: `224.0.0.5` → `01:00:5E:00:00:05`

## Key Takeaways

- Multicast addresses are in 224.0.0.0/4 (Class D range).
- Link-local multicast (224.0.0.0/24) uses TTL=1 and is not forwarded by routers.
- IGMP manages multicast group membership between hosts and routers.
- The administratively scoped range (239.0.0.0/8) is the private multicast equivalent of RFC 1918.
