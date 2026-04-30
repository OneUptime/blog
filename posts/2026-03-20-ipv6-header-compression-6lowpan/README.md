# How to Understand IPv6 Header Compression in 6LoWPAN

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, 6LoWPAN, Header Compression, IPHC, IoT, Networking

Description: Understand how 6LoWPAN's IPHC (IP Header Compression) scheme compresses 40-byte IPv6 headers to a few bytes, making IPv6 practical for IEEE 802.15.4 constrained networks.

## Introduction

The IPv6 fixed header is 40 bytes. On IEEE 802.15.4 with a maximum payload of ~100 bytes, this leaves only 60 bytes for useful data after accounting for headers. 6LoWPAN's IPHC (IP Header Compression) scheme, defined in RFC 6282, reduces the IPv6 header to as few as 2 bytes in the best case.

## The IPv6 Header Structure

The standard IPv6 header contains:

| Field | Bits | Bytes | Notes |
|---|---|---|---|
| Version | 4 | 0.5 | Always 6 |
| Traffic Class | 8 | 1 | Usually 0 |
| Flow Label | 20 | 2.5 | Usually 0 in IoT |
| Payload Length | 16 | 2 | Can be inferred |
| Next Header | 8 | 1 | Usually UDP (17) |
| Hop Limit | 8 | 1 | Usually 64 |
| Source Address | 128 | 16 | Can be compressed |
| Destination Address | 128 | 16 | Can be compressed |
| **Total** | | **40** | |

## IPHC Compression Techniques

### 1. Traffic Class and Flow Label Elision

In most IoT traffic, Traffic Class = 0 and Flow Label = 0. IPHC can elide (completely omit) both fields:

```text
Original: Version(4b) + TC(8b) + Flow Label(20b) = 32 bits = 4 bytes
IPHC:     If TC=0 and FL=0, both are elided → 0 bytes
Savings:  4 bytes
```

### 2. Next Header Compression

The IPHC `NH` bit indicates whether the IPv6 Next Header field is carried inline or encoded with LOWPAN_NHC. In RFC 6282, LOWPAN_NHC is defined for IPv6 extension headers and UDP:

```text
Original: Next Header field = 1 byte (e.g., 0x11 for UDP)
IPHC:     NH=1 in LOWPAN_IPHC + 1-byte LOWPAN_NHC encoding follows
Note:     UDP can then compress its own header further; TCP and ICMPv6 are not
          compressed by RFC 6282 LOWPAN_NHC
```

### 3. Hop Limit

Hop limit can be compressed to one of three common values using a 2-bit field:

```text
00: Hop limit is inline (not compressed)
01: Hop limit = 1 (elided)
10: Hop limit = 64 (elided, most common)
11: Hop limit = 255 (elided)
Savings: 1 byte for common values
```

### 4. Address Compression

Address compression is the biggest win. IPHC elides the link-local prefix statelessly, or shared routed prefixes via context information:

```text
Stateless compression modes:
- "Fully elided" (SAC=0, SAM=11): Source = fe80:: + IID derived from the link layer (0 bytes inline)
- "16-bit inline" (SAC=0, SAM=10): Source = fe80::0000:00ff:fe00:XXXX (2 bytes inline)
- "64-bit inline" (SAC=0, SAM=01): Source = prefix + 64-bit IID (8 bytes)
- "128-bit inline" (SAC=0, SAM=00): Full 16-byte address (16 bytes)

Stateful compression (with context):
- SAC=1, SAM=11: Prefix comes from shared context; IID is derived from the
  encapsulating header (0 bytes inline)
```

## Practical Compression Example

A typical sensor-to-gateway UDP packet:

```text
Uncompressed IPv6+UDP headers: 40 + 8 = 48 bytes

With IPHC compression:
- LOWPAN_IPHC base encoding: 2 bytes
- Version/TC/FL: elided (all default values)
- Payload length: elided (inferred from frame size)
- Next header: compressed via LOWPAN_NHC
- Hop limit: elided (64)
- Source address: 0 bytes (link-local, derived from the encapsulating header)
- Destination address: 2 bytes (16-bit IID form)
- UDP LOWPAN_NHC: 1 byte
- UDP ports: 1 byte if both ports are in the 0xf0b0-0xf0bf compressible range
- UDP length: elided
- UDP checksum: 2 bytes, or 0 bytes only if checksum elision is used with
  additional integrity protection

Result: ~6-8 bytes for IPv6+UDP headers
Savings: 40-42 bytes (83-88% compression)
```

## 6LoWPAN Packet Capture Analysis

```bash
# Capture traffic on a Linux 6LoWPAN interface

sudo tcpdump -i lowpan0 -v

# Alternatively, use Wireshark with 6LoWPAN dissector
# Filter: wpan or 6lowpan

# On a Contiki-NG node, enable 6LoWPAN debug logging:
# project-conf.h:
# #define SICSLOWPAN_CONF_COMPRESSION_THRESHOLD 0
# #define LOG_CONF_LEVEL_6LOWPAN LOG_LEVEL_DBG
```

## Compression Context

Stateful IPHC uses "contexts" - shared prefix knowledge - for maximum compression. Link-local `fe80::/64` uses stateless compression and does not need a shared context:

```text
Context 0: implied when stateful compression is used without the CID extension
Context 1: prefix assigned by border router (e.g., 2001:db8:1:1::/64)

With context 1, a global unicast address 2001:db8:1:1::1234:5678:9abc:def0
can be compressed to just the 8-byte IID: 1234:5678:9abc:def0
or to 2 bytes when the IID follows the 16-bit short-address mapping.
```

## Conclusion

6LoWPAN IPHC compression transforms the 40-byte IPv6 header into 2-7 bytes for typical IoT traffic patterns, making IPv6 practical on IEEE 802.15.4 links with 80-100 byte payloads. The compression works by exploiting the fact that many IPv6 header fields are constant or predictable in IoT traffic (version, traffic class, flow label, hop limit) and using context tables to elide address prefixes. Understanding IPHC is essential for troubleshooting and optimizing IPv6 IoT network performance.
