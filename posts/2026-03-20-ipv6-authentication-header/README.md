# How to Understand the Authentication Header (AH) in IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, IPsec, Authentication Header, Security, AH

Description: Understand the IPv6 Authentication Header (AH) extension header, how it provides data origin authentication and integrity for IPv6 packets, and how it relates to IPsec.

## Introduction

The Authentication Header (AH, Next Header = 51) is an IPsec extension header that provides data origin authentication and connectionless integrity for IPv6 packets. AH authenticates the IPv6 packet except for mutable or excluded fields, including parts of the fixed header, using a cryptographic integrity check value (ICV). It does NOT provide confidentiality - for encryption, use ESP instead.

## What AH Provides

```text
AH provides:
  ✓ Data origin authentication (verifies the sender's identity)
  ✓ Data integrity (detects modification of the packet)
  ✓ Optional anti-replay protection (detects replayed packets)
  ✗ Confidentiality (no encryption - use ESP for that)
  ✗ Protection against traffic analysis

Scope of authentication:
  → IPv6 header (excluding mutable or zeroed fields such as DSCP/ECN, Flow Label, and Hop Limit)
  → All extension headers before AH (immutable ones)
  → AH header itself (with ICV field treated as zeros during computation)
  → The payload after AH
```

## AH Header Format

```text
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|  Next Header  |  Payload Len  |          RESERVED             |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                 Security Parameters Index (SPI)               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                    Sequence Number Field                      |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                                                               |
+             Integrity Check Value (ICV) - variable            +
|                                                               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+

Next Header:    Protocol following AH (e.g., 6=TCP, 58=ICMPv6, 50=ESP)
Payload Len:    Length of AH in 4-byte words minus 2
SPI:            Security Parameters Index - identifies the Security Association
Sequence Number: Anti-replay counter (starts at 1, increments per packet)
ICV:            Integrity Check Value (algorithm-specific, variable length, multiple of 32 bits)
```

## Mutable vs Immutable Fields

AH authenticates the IPv6 header but must skip fields that are mutable in transit or otherwise excluded from the ICV:

```python
# Fields EXCLUDED from AH authentication (zeroed or otherwise excluded from ICV processing):

EXCLUDED_IPV6_FIELDS = {
    "Traffic Class": "DSCP/ECN bits may be changed in transit",
    "Flow Label": "excluded from the ICV for AH compatibility; modern IPv6 normally expects it to arrive unchanged",
    "Hop Limit": "decremented at each router hop",
}

# For AH computation, these fields are set to ZERO during ICV calculation,
# and the receiver applies the same normalization before verification.

# Fields INCLUDED in AH authentication:
IMMUTABLE_IPV6_FIELDS = {
    "Version": "always 6",
    "Payload Length": "fixed for a given packet",
    "Next Header": "fixed for a given packet",
    "Source Address": "does not change in transit",
    "Destination Address": "included when no Routing header is present; with a Routing header it is mutable but predictable",
}
```

## IPsec AH in Transport vs Tunnel Mode

```text
Transport Mode (host-to-host):
  [IPv6 Header][AH][TCP/UDP][Data]
  Authenticates from original source to original destination
  IPv6 header remains, AH is inserted before upper-layer

Tunnel Mode (gateway-to-gateway):
  [New IPv6 Header][AH][Original IPv6 Header][TCP/UDP][Data]
  Entire original packet is authenticated
  Outer header is the tunnel header
```

## Configuring AH with IPsec on Linux

```bash
# Using ip xfrm (Linux kernel IPsec) to configure AH

# Add a Security Association (SA) for AH using HMAC-SHA256
sudo ip xfrm state add \
    src 2001:db8::1 dst 2001:db8::2 \
    proto ah spi 0x1234 \
    auth-trunc "hmac(sha256)" \
    0x0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20 \
    128

# Add the reverse SA
sudo ip xfrm state add \
    src 2001:db8::2 dst 2001:db8::1 \
    proto ah spi 0x5678 \
    auth-trunc "hmac(sha256)" \
    0x0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20 \
    128

# Add policy: all traffic from ::1 to ::2 uses AH
sudo ip xfrm policy add \
    src 2001:db8::1 dst 2001:db8::2 dir out \
    tmpl src 2001:db8::1 dst 2001:db8::2 proto ah mode transport

sudo ip xfrm policy add \
    src 2001:db8::2 dst 2001:db8::1 dir in \
    tmpl src 2001:db8::2 dst 2001:db8::1 proto ah mode transport

# Verify AH is being applied
ping -6 -c 3 2001:db8::2
sudo tcpdump -i eth0 'ip6 protochain 51'  # Capture AH packets even with other IPv6 extension headers
```

## AH vs ESP: When to Use Which

| Property | AH | ESP |
|---|---|---|
| Authentication | Yes (packet except mutable outer-IP fields) | Yes (ESP-protected payload and ESP fields) |
| Encryption | No | Optional |
| Protects IP header | Yes (authenticates immutable/predictable parts) | No (outer IP header remains unprotected) |
| NAT traversal | Breaks with NAT (auth covers src/dst) | Works with NAT-T |
| Common use today | Rare (ESP can provide integrity too) | Common |

AH is rarely used in modern deployments because ESP can provide integrity without confidentiality, and can also provide encryption when needed. The primary reason to use AH is when you need immutable parts of the outer IP header to be authenticated.

## Conclusion

The IPv6 Authentication Header provides cryptographic integrity protection for the IPv6 packet, including fixed-header fields except those that are mutable or excluded from the ICV (such as DSCP/ECN, Flow Label, and Hop Limit). While IPsec AH is technically sound, ESP with integrity protection has largely supplanted it because ESP can provide the same integrity services and, when desired, confidentiality in a single header, and AH breaks NAT traversal (since it authenticates source/destination addresses). When deploying IPsec, prefer ESP unless there is a specific requirement to authenticate the IP header fields.
