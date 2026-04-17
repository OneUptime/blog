# How to Analyze IPv6 Tunnel Traffic in Wireshark

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Wireshark, IPv6, Tunneling, 6in4, Teredo, GRE, Packet Analysis

Description: A guide to identifying and analyzing IPv6 tunnel traffic in Wireshark, including 6in4, 6to4, Teredo, GRE, and IPsec tunnels.

IPv6 tunneling allows IPv6 packets to travel across IPv4 networks. Wireshark can decode most IPv6 tunnel types, showing both the outer encapsulation and the inner IPv6 payload, making it straightforward to diagnose tunnel configuration issues.

## IPv6 Tunnel Types and Protocols

| Tunnel Type | Outer Protocol | Port/Protocol |
|---|---|---|
| 6in4 (Manual) | IPv4, proto 41 | IP protocol 41 |
| 6to4 | IPv4, proto 41 | IP protocol 41 |
| Teredo | UDP | UDP port 3544 |
| GRE | IPv4/IPv6, proto 47 | IP protocol 47 |
| VXLAN with IPv6 | UDP | UDP port 4789 |
| IPsec ESP | IPv4/IPv6, proto 50 | IP protocol 50 |

## Display Filters for IPv6 Tunnels

```wireshark
# Show 6in4 tunnels (IPv6 in IPv4, protocol number 41)

ip.proto == 41

# Show 6to4 traffic (same as 6in4 but to/from 192.88.99.0/24)
ip.proto == 41 && ip.dst == 192.88.99.0/24

# Show Teredo IPv6 tunneling (UDP 3544)
udp.port == 3544

# Show GRE tunnels that carry IPv6
gre && gre.proto == 0x86dd  # 0x86dd = IPv6 EtherType

# Show VXLAN traffic (may carry IPv6 inner payloads)
vxlan

# Show 6in4 traffic between specific endpoints
ip.proto == 41 && ip.src == 192.0.2.1 && ip.dst == 203.0.113.1
```

## Analyzing 6in4 Tunnel Content

For a 6in4 packet, Wireshark shows two layers:
1. **Outer IPv4 header** (tunnel endpoints)
2. **Inner IPv6 header** (actual source/destination)

```wireshark
# Filter by the inner IPv6 source (tunneled traffic from specific IPv6 source)
# Wireshark auto-dissects 6in4 so you can filter the inner headers directly:
ipv6.src == 2001:db8::10 && ip.proto == 41
```

To see both layers:
1. Click any 6in4 packet
2. Expand **Internet Protocol Version 4** (outer header)
3. Expand **Internet Protocol Version 6** (inner header)

## Teredo Tunnel Analysis

```wireshark
# Show all Teredo traffic
udp.port == 3544

# Show Teredo IPv6 traffic with inner packet details
# Wireshark dissects Teredo and shows the inner IPv6 headers
teredo

# Show Teredo NAT traversal bubbles (IPv6 header only, no payload)
teredo && udp.length == 48
```

## Diagnosing Tunnel Issues

### Inner IPv6 Traffic Not Reaching Destination

```wireshark
# Check if the tunnel endpoints are exchanging packets
ip.proto == 41 && ip.src == <tunnel-endpoint-1>

# Verify inner IPv6 TTL/Hop Limit is not too low
ipv6.hlim < 5 && ip.proto == 41
```

### Tunnel Asymmetry

```wireshark
# Check traffic in both directions
ip.proto == 41 && (
  (ip.src == 192.0.2.1 && ip.dst == 203.0.113.1) ||
  (ip.src == 203.0.113.1 && ip.dst == 192.0.2.1)
)
```

### Path MTU Issues in Tunnels

6in4 tunnels add a 20-byte IPv4 header, reducing effective MTU for inner IPv6 from 1500 to 1480:

```wireshark
# Find large inner IPv6 packets that may exceed tunnel MTU
ip.proto == 41 && frame.len > 1480

# Find ICMPv6 Packet Too Big messages (PMTUD)
icmpv6.type == 2
```

## Capture 6in4 Tunnel Traffic

```bash
# Capture only 6in4 tunnel traffic
sudo tcpdump -i eth0 'ip proto 41' -w 6in4-capture.pcap

# Capture Teredo
sudo tcpdump -i eth0 'udp port 3544' -w teredo-capture.pcap

# Capture GRE tunnels
sudo tcpdump -i eth0 'ip proto 47' -w gre-capture.pcap
```

## Statistics on Tunneled IPv6 Traffic

```bash
# Count 6in4 packets per outer source/destination pair
tshark -r capture.pcap -Y "ip.proto == 41" \
  -T fields -e ip.src -e ip.dst | \
  sort | uniq -c | sort -rn

# Count Teredo packets per inner IPv6 source
tshark -r capture.pcap -Y "teredo" \
  -T fields -e ipv6.src | \
  sort | uniq -c | sort -rn
```

Wireshark's automatic tunnel dissection - showing both outer and inner headers for 6in4, Teredo, and GRE - makes tunnel troubleshooting as straightforward as analyzing native IPv6 traffic.
