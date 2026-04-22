# How to Set Multicast TTL for Controlling Scope

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, Multicast, TTL, IPv4, Linux, Scoping

Description: Control the reach of multicast packets by setting the IP TTL value in your application or with iptables, limiting traffic to a local segment or allowing it to traverse multiple router hops.

## Introduction

The Time-to-Live (TTL) field in IPv4 multicast packets controls how many router hops the traffic can traverse. Each router decrements the TTL; when it reaches zero, the packet is discarded. Setting the right TTL is the simplest way to scope multicast to a specific administrative boundary.

## TTL Threshold Convention

Multicast routers enforce TTL thresholds on outbound interfaces. If a packet's remaining TTL is less than or equal to the threshold, the router will not forward it.

| TTL Value | Typical Scope |
|---|---|
| 0 | Restricted to the same host |
| 1 | Restricted to the same subnet (link-local) |
| 15 | Site-local scope |
| 63 | Regional scope |
| 127 | Continental scope |
| 255 | Global (unrestricted) |

## Setting TTL in a Python Application

```python
#!/usr/bin/env python3
import socket

GROUP = "239.1.2.3"
PORT  = 5000

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)

# Set TTL = 1: multicast stays on the local subnet only

ttl = 1
sock.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_TTL, ttl)

sock.sendto(b"Hello multicast segment", (GROUP, PORT))
print(f"Sent with TTL={ttl}")
```

To allow the packet to cross routers, increase the TTL:

```python
# TTL = 32: allow up to 32 router hops
sock.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_TTL, 32)
```

## Setting TTL with iptables MANGLE

If you cannot modify the application, use `iptables` to rewrite the TTL on outgoing multicast:

```bash
# Set TTL to 15 for all outgoing multicast from this host
sudo iptables -t mangle -A OUTPUT \
  -d 224.0.0.0/4 \
  -j TTL --ttl-set 15
```

## Capping Incoming Multicast TTL

To prevent high-TTL multicast from reaching this host:

```bash
# Drop multicast packets with TTL > 15 arriving on eth0 for this host
sudo iptables -A INPUT -i eth0 \
  -d 224.0.0.0/4 \
  -m ttl --ttl-gt 15 \
  -j DROP
```

## Verifying TTL in Captured Packets

```bash
# Check the TTL field of multicast packets arriving on eth0
sudo tcpdump -i eth0 -n -v "dst net 224.0.0.0/4" | grep "ttl"
```

Example output showing TTL = 1 (link-local sender):

```text
IP (ttl 1, proto UDP, length 52) 192.168.1.10.5000 > 239.1.2.3.5000
```

## Configuring Router Interface TTL Thresholds (Cisco)

On a Cisco IOS release that supports this command, set the TTL threshold per interface to prevent forwarding low-TTL multicast:

```text
interface GigabitEthernet0/1
 ip multicast ttl-threshold 16
```

Packets with TTL <= 16 will not be forwarded out of this interface.

## Recommended Settings

- **Service discovery on custom multicast groups**: TTL = 1 (never leaves subnet; mDNS itself uses 224.0.0.251 and should send responses with IP TTL = 255)
- **LAN streaming**: TTL = 15 (site-local)
- **Enterprise-wide multicast**: TTL = 63
- **Global multicast**: TTL = 255

## Conclusion

TTL is the most direct mechanism for scoping multicast traffic. Combine application-level `IP_MULTICAST_TTL` settings with router TTL thresholds to enforce precise administrative boundaries and prevent multicast from leaking beyond its intended scope.
