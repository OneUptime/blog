# How to Understand the Encapsulating Security Payload (ESP) in IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, IPsec, ESP, Encryption, Security

Description: Learn how the IPv6 Encapsulating Security Payload provides confidentiality and authentication for IPv6 traffic, including its header structure, cipher suites, and transport vs tunnel mode.

## Overview

ESP (Encapsulating Security Payload) is IPsec protocol 50 (Next Header value 50 in IPv6). It is the primary IPsec protocol for IPv6 because it provides both confidentiality (encryption) and data integrity/authentication. Unlike AH, ESP is NAT-compatible (via NAT-T using UDP encapsulation) and is used in virtually all modern IPsec deployments.

## ESP Header Structure

```text
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|               Security Parameters Index (SPI)                 |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                      Sequence Number                          |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+  ←─ Authenticated
|                    Payload Data* (variable)                  |
|                                                               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                     Padding (0-255 bytes)                     |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|   Pad Length  |  Next Header  |                               |  ←─ Encrypted
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+                               |
|              Integrity Check Value (ICV / tag)                |  ←─ Authenticated
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

* If the selected ESP algorithm needs an explicit IV/nonce, it is carried at the
start of the Payload Data field.

Key points:
- **SPI + Sequence Number**: Unencrypted - receiver uses SPI to find the SA
- **Explicit IV/nonce (if present)**: Carried inside Payload Data and usually sent unencrypted
- **Payload Data + Padding + Next Header**: Encrypted, except for any explicit IV/nonce at the start of Payload Data
- **ICV/tag**: Integrity check over SPI, Sequence Number, Payload Data, Padding, Pad Length, and Next Header

## Recommended Cipher Suites

Modern ESP deployments should use AEAD (Authenticated Encryption with Associated Data) ciphers:

| Algorithm | Key Size | Auth | Notes |
|-----------|----------|------|-------|
| AES-GCM-128 | 128-bit | Built-in | Preferred - AEAD |
| AES-GCM-256 | 256-bit | Built-in | High-security |
| ChaCha20-Poly1305 | 256-bit | Built-in | Software-efficient |
| AES-CBC-256 + HMAC-SHA256 | 256-bit | Separate | Legacy - avoid if possible |

Avoid:
- DES, 3DES (too weak)
- MD5 for HMAC (broken)
- NULL encryption without authentication

## ESP Transport Mode for IPv6

```text
Before ESP:
[IPv6: src=A, dst=B, NH=TCP] [TCP] [Data]

After ESP Transport Mode:
[IPv6: src=A, dst=B, NH=50] [ESP Header (SPI, Seq)] [Optional explicit IV/nonce] [Encrypted TCP+Data] [Padding] [ESP Trailer] [ICV/tag]
```

```bash
# Linux: Create ESP transport mode SA (manual SA example)

ip xfrm state add \
  src 2001:db8:1::1 dst 2001:db8:2::1 \
  proto esp spi 0x100 \
  enc 'cbc(aes)' 0x0123456789abcdef0123456789abcdef \
  auth-trunc 'hmac(sha256)' 0xfedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210 128 \
  mode transport

# Example syntax for AEAD (AES-GCM); counter-mode AEAD SAs should be negotiated via IKEv2, not manual keying
ip xfrm state add \
  src 2001:db8:1::1 dst 2001:db8:2::1 \
  proto esp spi 0x100 \
  aead "rfc4106(gcm(aes))" 0x0123456789abcdef0123456789abcdef01234567 128 \
  mode transport
```

## ESP Tunnel Mode for IPv6

```text
Before ESP Tunnel Mode:
Original: [IPv6: src=A, dst=B] [TCP] [Data]

After ESP Tunnel Mode:
[Outer IPv6: src=GW1, dst=GW2, NH=50] [ESP Header] [Optional explicit IV/nonce] [Encrypted: Inner IPv6 + TCP + Data] [ESP Trailer] [ICV/tag]
```

```bash
# Example syntax for a tunnel SA; counter-mode AEAD SAs should be negotiated via IKEv2, not manual keying
ip xfrm state add \
  src 2001:db8:100::1 dst 2001:db8:200::1 \
  proto esp spi 0x200 \
  aead "rfc4106(gcm(aes))" 0x0123456789abcdef0123456789abcdef01234567 128 \
  mode tunnel

# Create policy
ip xfrm policy add \
  src 2001:db8:1::/48 dst 2001:db8:2::/48 \
  dir out \
  tmpl src 2001:db8:100::1 dst 2001:db8:200::1 proto esp mode tunnel
```

## NAT Traversal (NAT-T) for ESP

When ESP must pass through NAT, NAT-T encapsulates ESP in UDP port 4500:

```text
Normal ESP: [IPv6] [ESP (protocol 50)] [Encrypted payload]
NAT-T ESP:  [IPv6] [UDP: dport=4500] [ESP (SPI != 0)] [Encrypted payload]
IKE on 4500: [IPv6] [UDP: dport=4500] [Non-ESP Marker (4 bytes)] [IKE]
```

```bash
# strongSwan automatically uses NAT-T when NAT is detected
# Force NAT-T in swanctl.conf:
connections {
    nat-traversal-example {
        encap = yes   # Force UDP encapsulation (NAT-T)
        ...
    }
}
```

## Verifying ESP Traffic

```bash
# tcpdump: Capture ESP traffic (protocol / Next Header 50)
tcpdump -i eth0 'ip6 protochain 50' -n -v

# With NAT-T (UDP 4500)
tcpdump -i eth0 'udp port 4500' -n -v

# View current ESP SAs
ip xfrm state list | grep esp

# Sample output:
# src 2001:db8:1::1 dst 2001:db8:2::1
#   proto esp spi 0x00000100 reqid 1 mode transport
#   aead rfc4106(gcm(aes)) 0x...key... 128
#   anti-replay context: seq 0x5, oseq 0x5, bitmap 0xffffffff

# Check byte counters
ip -s xfrm state list | grep -A8 '2001:db8:2::1' | grep bytes
```

## Summary

ESP (Next Header 50) is the primary IPsec protocol for IPv6, providing both confidentiality (encryption) and data integrity. Use AES-GCM (AEAD) for both authentication and encryption in a single pass - preferred over separate AES-CBC + HMAC configurations. Transport mode protects the payload while preserving original IPv6 headers; tunnel mode encapsulates the entire original packet for gateway-to-gateway VPNs. NAT-T (UDP port 4500) enables ESP to traverse NAT devices. Modern deployments use IKEv2 (strongSwan/Libreswan) for automated SA negotiation rather than manual `ip xfrm` commands.
