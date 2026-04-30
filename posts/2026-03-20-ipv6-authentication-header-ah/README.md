# How to Understand the Authentication Header (AH) in IPv6 - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, IPsec, AH, Authentication, Security

Description: Learn how the IPv6 Authentication Header provides data integrity and authentication without encryption, and understand its structure, limitations with NAT, and practical use cases.

## Overview

The Authentication Header (AH) is IPsec protocol 51 (Next Header value 51 in IPv6). It provides data integrity and authentication for IPv6 packets - ensuring the packet came from a legitimate sender and was not modified in transit. AH does NOT provide confidentiality (no encryption). It is rarely used alone today, because most deployments can meet their requirements with ESP.

## AH Header Structure

```text
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
| Next Header   |  Payload Len  |          RESERVED             |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                 Security Parameters Index (SPI)               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                    Sequence Number Field                      |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                                                               |
+                Integrity Check Value (ICV)                    +
|             (variable length, typically 12 or 16 bytes)       |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

- **SPI**: 32-bit identifier - with destination IP and protocol, identifies the SA
- **Sequence Number**: Anti-replay protection (increments with each packet)
- **ICV**: Integrity value selected by the SA, commonly HMAC-SHA1-96 or HMAC-SHA-256-128

## What AH Authenticates

AH calculates an ICV over immutable or predictable parts of the IPv6 header, relevant extension headers, and payload; mutable fields are zeroed:

**Covered by AH (immutable or predictable):**
- IPv6 version, payload length
- Next Header field
- Source address
- Destination address (or its predictable value when a Routing header is present)
- Extension headers and upper-layer data, with mutable options zeroed where required
- TCP/UDP header and payload

**Zeroed for AH calculation (mutable):**
- Traffic Class (DSCP/ECN may be rewritten)
- Flow Label
- Hop Limit (decremented at each hop)

## AH in Transport Mode (Host-to-Host)

In the simplest transport-mode case, AH is inserted between the IPv6 header and the upper-layer header. With IPv6 extension headers, AH appears after the base header and the extension headers that must precede it:

```text
Before AH:
[IPv6: src=A, dst=B, NH=TCP] [TCP] [Data]

After AH Transport Mode:
[IPv6: src=A, dst=B, NH=51] [AH: Next=TCP, SPI=0x1234, ICV=...] [TCP] [Data]
```

## AH in Tunnel Mode (Gateway-to-Gateway)

In tunnel mode, the original packet is encapsulated:

```text
[Outer IPv6: src=GW1, dst=GW2, NH=51] [AH: Next=IPv6, ICV=...] [Inner IPv6] [TCP] [Data]
```

## Configuring AH on Linux with ip xfrm

```bash
# Create AH Security Association (SA)

ip xfrm state add \
  src 2001:db8:1::1 dst 2001:db8:2::1 \
  proto ah spi 0x100 \
  auth-trunc 'hmac(sha256)' 0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef 128 \
  mode transport

ip xfrm state add \
  src 2001:db8:2::1 dst 2001:db8:1::1 \
  proto ah spi 0x200 \
  auth-trunc 'hmac(sha256)' 0xfedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210 128 \
  mode transport

# Create Security Policy (SP)
ip xfrm policy add \
  src 2001:db8:1::1/128 dst 2001:db8:2::1/128 \
  proto any dir out \
  tmpl src 2001:db8:1::1 dst 2001:db8:2::1 proto ah mode transport

ip xfrm policy add \
  src 2001:db8:2::1/128 dst 2001:db8:1::1/128 \
  proto any dir in \
  tmpl src 2001:db8:2::1 dst 2001:db8:1::1 proto ah mode transport

# Verify
ip xfrm state list
ip xfrm policy list
```

## Verify AH Traffic with tcpdump

```bash
# Capture AH traffic anywhere in the IPv6 header chain
tcpdump -i eth0 'ip6 protochain 51' -n -v

# Output example:
# 2001:db8:1::1 > 2001:db8:2::1: AH(spi=0x00000100,seq=0x1)
```

## Why AH Is Rarely Used Alone

1. **No encryption**: Data is visible in plaintext - any eavesdropper can read it
2. **NAT incompatibility**: AH authenticates the IP header including addresses - NAT changes the source address, breaking AH verification
3. **ESP covers most deployments**: ESP can provide authentication with or without confidentiality, and most IPsec requirements can be met with ESP alone
4. **Deployment complexity**: Most IPsec deployments use ESP-only; ESP+AH is a niche combination

## When AH Makes Sense

AH is appropriate when:
- Confidentiality is not required
- Integrity of selected outer IPv6 header or extension-header fields is required
- Protocol-level integrity verification is needed in addition to application-layer TLS
- Combined with ESP when outer-header integrity is specifically required

## AH + ESP (Combined Use)

When both are used together:

```text
[IPv6] [AH] [ESP] [Encrypted TCP/Data] [ESP-Trailer] [ESP-ICV]

AH authenticates: immutable/predictable parts of the outer IPv6 header, the AH header, and the ESP packet that follows
ESP authenticates: the ESP SPI/Sequence Number, Payload Data, and ESP trailer (when integrity is enabled)
Combined: AH protects selected outer-header fields that ESP transport mode does not cover
```

```bash
# Rarely needed, but possible with multiple `tmpl` entries in one policy.
# Exact template ordering must match the SA bundle you want to build.
```

## Summary

AH (Authentication Header, NH=51) provides integrity and authentication for IPv6 packets without encryption. In IPv6 transport mode, it appears after the base header and any extension headers that must precede it, calculating an ICV over immutable or predictable header fields and payload. AH is incompatible with NAT (because NAT modifies the source address, invalidating the ICV) and is rarely used alone - most deployments use ESP instead. AH is still relevant in specific scenarios requiring integrity protection for selected outer IPv6 header fields.
