# How to Understand the Mobility Header in IPv6 - Part 2

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Mobile IPv6, Mobility Header, IPv6 Extension Headers, Networking, RFC 6275

Description: Understand the IPv6 Mobility Header extension header structure, message types, and how it carries Mobile IPv6 signaling messages between Mobile Nodes, Home Agents, and Correspondent Nodes.

## Introduction

The IPv6 Mobility Header is an extension header (Next Header value = 135) defined in RFC 6275. It carries all Mobile IPv6 signaling messages - Binding Updates, Binding Acknowledgements, and Return Routability messages - as the payload of IPv6 packets.

## Mobility Header Structure

```text
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|  Payload Proto|  Header Len   |   MH Type    |   Reserved    |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|           Checksum            |                               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+                               +
|                   Message Data (variable)                     |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

| Field | Size | Description |
|---|---|---|
| Payload Proto | 8 bits | Next header after Mobility Header (59 = No Next Header) |
| Header Len | 8 bits | Length in 8-octet units, excluding first 8 octets |
| MH Type | 8 bits | Identifies the specific mobility message |
| Reserved | 8 bits | Must be zero |
| Checksum | 16 bits | ICMPv6-style checksum over pseudo-header |
| Message Data | variable | Type-specific content |

## Mobility Header Message Types

| MH Type | Name | Direction | Description |
|---|---|---|---|
| 0 | Binding Refresh Request | HA/CN → MN | Request new BU before lifetime expires |
| 1 | Home Test Init (HoTI) | MN → CN | Start Return Routability (via HA) |
| 2 | Care-of Test Init (CoTI) | MN → CN | Start RR (direct) |
| 3 | Home Test (HoT) | CN → MN | RR cookie (via HA) |
| 4 | Care-of Test (CoT) | CN → MN | RR cookie (direct) |
| 5 | Binding Update (BU) | MN → HA/CN | Register CoA |
| 6 | Binding Acknowledgement (BA) | HA/CN → MN | Confirm registration |
| 7 | Binding Error | CN → MN | Report binding problem |

## Binding Update Message (Type 5)

```text
BU Message Data:
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|         Sequence Number       |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+- ...
|A|H|L|K|M|R|P| Reserved        |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|         Lifetime               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|   Mobility Options (variable) |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

Flag meanings:
- **A**: Acknowledge - request a Binding Acknowledgement
- **H**: Home Registration - BU is a home registration (sent to HA)
- **L**: Link-Local Address Compatibility - CoA has link-local address
- **K**: Key Management Mobility Capability

## Parsing the Mobility Header with Scapy

```python
from scapy.all import *

# Craft a Binding Update packet

bu_packet = (
    IPv6(src="2001:db8:foreign::50", dst="2001:db8:home::1") /
    MIP6MH_BU(
        seq=42,          # Sequence number
        flags="AH",      # Acknowledge + Home Registration
        mhtime=150,      # Lifetime = 150 * 4 = 600 seconds
    ) /
    MIP6OptAltCoA(acoa="2001:db8:foreign::50")
)

# Show the packet structure
bu_packet.show()

# Send the packet
send(bu_packet)

# Sniff for Mobility Header packets
sniff(
    filter="proto 135",  # Mobility Header
    prn=lambda p: p.show()
)
```

## Dissecting a Mobility Header Packet with tcpdump

```bash
# Capture mobility messages (proto 135)
sudo tcpdump -i eth0 -n -vv "ip6 proto 135"

# Decode a captured pcap
tcpdump -r capture.pcap -n -vv "ip6 proto 135" | head -50

# Example output:
# IPv6 (src=2001:db8:foreign::50, dst=2001:db8:home::1)
#   MH Type: Binding Update (5)
#   Flags: [A H]
#   Lifetime: 600s
```

## Wireshark Filter

Use Wireshark display filter `mip6` to see all Mobile IPv6 messages, or `mip6.mh_type == 5` for Binding Updates specifically.

## Conclusion

The IPv6 Mobility Header carries all MIPv6 signaling in a compact, extensible format. Understanding MH Type values and flag bits enables effective debugging with tcpdump and Wireshark. Monitor Binding Update success rates and Home Agent availability with OneUptime to ensure MIPv6 mobility operations remain healthy.
