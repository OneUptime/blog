# How to Understand SRv6 End Functions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SRv6, End Functions, SID, Segment Routing, RFC 8986, Networking

Description: Understand SRv6 Endpoint (End) functions defined in RFC 8986, including End, End.X, End.T, End.DX4, End.DT6, and their roles in forwarding and service delivery.

## Introduction

SRv6 Endpoint functions define what a node does when it receives a packet with a matching local SID. They are the "verbs" of SRv6 network programming. RFC 8986 defines the standard End functions.

## Endpoint Function Overview

All End functions start from the same basic match:
1. Verify the packet is intended for this node
2. Execute the function-specific action
3. For transit functions such as End, End.X, and End.T: require Segments Left > 0, advance to the next segment, and forward
4. For decapsulation functions such as End.DX4, End.DX6, End.DT4, End.DT6, and End.DT46: require Segments Left = 0 (or no SRH) and forward the inner packet

## End - Plain IPv6 Endpoint

The simplest End function: for a transit packet with non-zero Segments Left, decrement Segments Left and forward to the next SID.

```bash
# Linux: configure End behavior

ip -6 route add 5f00:1:1::1/128 \
  encap seg6local action End \
  dev lo

# When a packet arrives with dst=5f00:1:1::1 and non-zero SL:
# 1. SL is decremented
# 2. New destination = Segment List[SL]
# 3. Packet forwarded normally
```

**Use case**: Plain transit hop in a segment list.

## End.X - Cross-Connect to Specific Interface/Next-Hop

End.X advances the segment pointer and forwards via a specified L3 adjacency.

```bash
# Forward to a specific neighbor after SID processing
# nh6 is the next-hop to send out
ip -6 route add 5f00:1:1:0:e001::/128 \
  encap seg6local action End.X \
  nh6 fe80::2 \
  dev eth0

# Use case: explicit interface selection in TE paths
# Traffic destined for this SID always exits via eth0 to fe80::2
```

**Use case**: Traffic Engineering - force traffic through a specific link.

## End.T - Table Lookup

End.T advances the segment pointer and looks up the next destination in a specified routing table.

```bash
# Lookup in routing table 100 after processing SID
ip -6 route add 5f00:1:1:0:e002::/128 \
  encap seg6local action End.T \
  table 100 \
  dev lo

# All packets hitting this SID use table 100 for next-hop lookup
```

**Use case**: Multi-table IPv6 forwarding without decapsulation.

## End.DX4 - Decapsulate and IPv4 Cross-Connect

Removes the outer IPv6 header and forwards the inner IPv4 packet to a specific IPv4 next-hop.

```bash
# IPv4 next-hop after decapsulation
ip -6 route add 5f00:1:1:0:e003::/128 \
  encap seg6local action End.DX4 \
  nh4 192.168.1.1 \
  dev eth1
```

**Use case**: SRv6 → IPv4 gateway function.

## End.DX6 - Decapsulate and IPv6 Cross-Connect

Removes the outer SRv6 encapsulation and forwards the inner IPv6 packet.

```bash
ip -6 route add 5f00:1:1:0:e004::/128 \
  encap seg6local action End.DX6 \
  nh6 2001:db8::1 \
  dev eth0
```

**Use case**: Final decapsulation at the egress PE into a customer segment.

## End.DT4 - Decapsulate into IPv4 VPN Table

Removes outer IPv6 header and routes the inner IPv4 packet using a specified VRF table.

```bash
# Requires a VRF device using table 100 and net.vrf.strict_mode=1
ip -6 route add 5f00:1:1:0:e005::/128 \
  encap seg6local action End.DT4 \
  vrftable 100 \
  dev vrf100
```

**Use case**: IPv4 L3VPN delivery.

## End.DT6 - Decapsulate into IPv6 VPN Table

Removes outer IPv6 header and routes the inner IPv6 packet using a specified VRF table.

```bash
# Requires a VRF device using table 200 and net.vrf.strict_mode=1
ip -6 route add 5f00:1:1:0:e006::/128 \
  encap seg6local action End.DT6 \
  vrftable 200 \
  dev vrf200
```

**Use case**: IPv6 L3VPN delivery.

## End.DT46 - Decapsulate into IPv4 or IPv6 Table

Handles both IPv4 and IPv6 inner packets, using the same VRF table.

```bash
# Requires a VRF device using table 300 and net.vrf.strict_mode=1
ip -6 route add 5f00:1:1:0:e007::/128 \
  encap seg6local action End.DT46 \
  vrftable 300 \
  dev vrf300
```

## End.B6.Encaps - Encapsulate with New IPv6 Header and SRH

Applies a new SRv6 policy by encapsulating the packet in an outer IPv6 header and SRH (policy-based chaining).

```bash
ip -6 route add 5f00:1:1:0:e008::/128 \
  encap seg6local action End.B6.Encaps \
  srh segs 5f00:2:1::,5f00:3:1:: \
  dev eth0
```

## Summary Table

| Function | Decap | Inner IPv4 | Inner IPv6 | Specific Table/VRF | Cross-Connect |
|---|---|---|---|---|---|
| End | No | No | No | No | No |
| End.X | No | No | No | No | Yes |
| End.T | No | No | No | Yes | No |
| End.DX4 | Yes | Yes | No | No | Yes |
| End.DX6 | Yes | No | Yes | No | Yes |
| End.DT4 | Yes | Yes | No | Yes | No |
| End.DT6 | Yes | No | Yes | Yes | No |
| End.DT46 | Yes | Yes | Yes | Yes | No |

## Conclusion

SRv6 End functions define the network's instruction set. Selecting the right function for each network element is the core of SRv6 network programming. Use OneUptime to monitor service-level objectives for each SRv6 service chain by probing through the entire path.
