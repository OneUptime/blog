# How to Use the Don't Fragment Flag in IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Networking, MTU, Fragmentation, TCP/IP, Path MTU Discovery

Description: The Don't Fragment (DF) flag in the IPv4 header instructs routers not to fragment a packet, enabling path MTU discovery and preventing fragmentation-related performance issues.

## What Is the Don't Fragment Flag?

The IPv4 header contains a 3-bit Flags field. The Don't Fragment (DF) bit is bit 1 of that field. When set to 1, it instructs every router along the path not to fragment the packet. If the packet is larger than the next-hop MTU and the DF bit is set, the router discards the packet and sends an ICMP "Fragmentation Needed" message back to the sender.

## Flags Field Layout

```text
Bit 0: Reserved (must be 0)
Bit 1: DF - Don't Fragment
Bit 2: MF - More Fragments
```

In the raw header bytes, the Flags field occupies the top 3 bits of byte offset 6.

## Setting the DF Bit with Python (Scapy)

Run the script with privileges that allow raw packet sending. The following script sends an ICMP Echo Request with the DF flag set; if the path MTU is smaller than the packet size, an ICMP Fragmentation Needed response may be returned:

```python
from scapy.all import IP, ICMP, Raw, sr1

# 'DF' = 2 in Scapy's flags field

pkt = IP(dst="8.8.8.8", flags="DF") / ICMP() / Raw(b"A" * 1400)

# Send and wait for a response
reply = sr1(pkt, timeout=2, verbose=False)

if reply:
    # ICMP type 3, code 4 = Fragmentation Needed
    print(f"Reply type={reply[ICMP].type} code={reply[ICMP].code}")
else:
    print("No reply received")
```

## Path MTU Discovery (PMTUD)

PMTUD relies on the DF flag to determine the smallest MTU along a network path:

1. The sender starts with a packet size based on the first-hop MTU and sets DF=1 on datagrams sent along that path.
2. If a router cannot forward the packet without fragmentation, it drops it and returns ICMP type 3 code 4, including the next-hop MTU.
3. The sender reduces its assumed PMTU and retries with smaller packets.
4. This continues until packets traverse the path without triggering ICMP responses.

```mermaid
sequenceDiagram
    participant Sender
    participant Router
    participant Destination
    Sender->>Router: Packet (1500 bytes, DF=1)
    Router-->>Sender: ICMP Fragmentation Needed (MTU=1400)
    Sender->>Router: Packet (1400 bytes, DF=1)
    Router->>Destination: Packet delivered
```

## Checking DF on Linux

You can inspect the route lookup and test DF behavior:

```bash
# Inspect the route lookup; if PMTU has been learned, the output may include an mtu field
ip route get 8.8.8.8

# Force PMTUD with ping (Linux)
ping -M do -s 1400 8.8.8.8
# -M do sets DF and subjects the probe to PMTU checks; if ICMP Fragmentation Needed is received,
# ping reports "Frag needed and DF set"
```

## Common Issues with DF

- **ICMP blocking**: Firewalls that block ICMP break PMTUD, causing "black hole" connections where large packets silently disappear.
- **VPN and tunnels**: Tunneling adds overhead (e.g., IPsec headers), reducing effective MTU. Always account for tunnel overhead when setting MSS clamp values.

Work around ICMP black holes for forwarded TCP traffic on Linux by clamping TCP MSS:

```bash
# Clamp MSS to PMTU for forwarded TCP SYN packets
iptables -t mangle -A FORWARD -p tcp --tcp-flags SYN,RST SYN \
  -j TCPMSS --clamp-mss-to-pmtu
```

## Key Takeaways

- The DF flag prevents routers from fragmenting a packet.
- It is the foundation of Path MTU Discovery.
- Blocking ICMP Fragmentation Needed messages causes silent connectivity failures.
- Clamping TCP MSS can help on VPN gateways when PMTUD is unreliable.
