# How to Understand Segment Routing over IPv6 (SRv6) - Understand

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SRv6, Segment Routing, IPv6, RFC 8986, Networking, Traffic Engineering

Description: Understand Segment Routing over IPv6 (SRv6), its architecture, how SIDs encode network instructions, and how SRv6 simplifies traffic engineering and service chaining.

## Introduction

Segment Routing over IPv6 (SRv6) is a source routing architecture where the packet's path through the network is encoded in the IPv6 header. Defined in RFC 8986, SRv6 eliminates MPLS for traffic engineering while leveraging native IPv6 forwarding. Each hop is identified by a Segment Identifier (SID), which is a 128-bit IPv6 address with an embedded behavior.

## Core Concepts

### Segment Identifier (SID)

A SID is an IPv6 address in the `5f00::/16` space (RFC 9602) that encodes:

```javascript
 |   Locator (N bits)   | Function (F bits) | Args (A bits) |
 +----------------------+-------------------+---------------+
 | 5f00:node::/48       |  :e001:           |    ::         |

 Example SID: 5f00:1:0:e001::
   Locator: 5f00:1::/48  (identifies node R1)
   Function: e001       (End.X to next-hop A)
   Arguments: ::        (none in this case)
```

### Segment Routing Header (SRH)

```text
 +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 | Next Header   |  Hdr Ext Len  | Routing Type  | Segments Left |
 +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 |  Last Entry   |     Flags     |              Tag              |
 +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 |                                                               |
 |            Segment List[0] (Last SID)                        |
 |                                                               |
 +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 |                                                               |
 |            Segment List[1]                                    |
 |                                                               |
 +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

## How SRv6 Forwarding Works

```text
Packet flow through R1 → R2 → R3:
  Ingress (R1):
    IPv6 dst = 5f00:2:0:e001::  (R2's End.X SID)
    SRH: [5f00:3:0:e000::, 5f00:2:0:e001::]
    Segments Left = 1

  At R2 (processes End.X):
    IPv6 dst = SRH[Segments Left] = 5f00:3:0:e000::
    Segments Left = 0
    Packet forwarded via Next-Hop defined by End.X

  At R3 (processes End.DT6):
    SRH consumed, decapsulate inner packet
    Lookup destination in VRF table 254
```

## SRv6 Endpoint Functions (RFC 8986)

| Function | Description |
|---|---|
| End | Basic segment endpoint (decrement SL, update dst) |
| End.X | Endpoint with cross-connect to L3 next-hop |
| End.T | Endpoint with specific routing table lookup |
| End.DX6 | Decapsulate and forward to IPv6 next-hop |
| End.DT6 | Decapsulate and do IPv6 table lookup |
| End.DT4 | Decapsulate and do IPv4 table lookup |
| End.DT46 | Decapsulate and do IPv4 or IPv6 table lookup |
| End.B6.Encaps | Endpoint bound to an SRv6 policy with encapsulation (push new outer IPv6 header + SRH) |

## SRv6 vs MPLS

```text
MPLS:
  Label stack: [label1, label2, label3] + IP payload
  Requires LDP/RSVP-TE for label distribution
  Label space is local to each node

SRv6:
  IPv6 header + SRH: [SID1, SID2, SID3] + IP payload
  SIDs are globally unique IPv6 addresses
  No separate label distribution protocol needed
  Native IPv6 forwarding on transit nodes
  Programmable behaviors encoded in SIDs
```

## Practical SRv6 Use Cases

```text
1. Traffic Engineering:
   Steer flows through specific paths
   SID list = [R2's SID, R4's SID, R6's SID, destination]

2. VPN Services (L3VPN):
   End.DT4/End.DT6 SIDs replace MPLS VPN labels
   Simpler: no LDP, no MPLS, pure IPv6

3. Service Chaining:
   SID list = [firewall SID, load-balancer SID, destination SID]
   Packets traverse services in order

4. Network Slicing (5G):
   Different SID paths for different service slices
   Latency-optimized path for URLLC
   Throughput-optimized path for eMBB
```

## Conclusion

SRv6 unifies traffic engineering, VPN services, and network programmability under a single IPv6-native architecture. SIDs encode both addressing and behaviors, eliminating MPLS complexity. Start with RFC 8986 for the SRv6 Network Programming architecture. Use OneUptime to monitor SRv6 path availability and SID reachability in production deployments.
