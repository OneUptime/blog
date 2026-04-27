# How to Configure OSPFv3 Authentication for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OSPFv3, IPv6, Authentication, IPsec, Security

Description: Learn how to configure OSPFv3 authentication using IPsec to protect routing protocol messages from spoofing and injection attacks.

## Overview

OSPFv3 does not have built-in authentication like OSPFv2. Instead, it relies on **IPsec** (Authentication Header or Encapsulating Security Payload) to authenticate and optionally encrypt OSPF protocol messages. This is defined in RFC 4552.

## Authentication vs Encryption

| Method | Purpose | IPsec Mode |
|--------|---------|-----------|
| AH (Authentication Header) | Authenticates but does not encrypt | Transport mode |
| ESP (Encapsulating Security Payload) | Authenticates AND encrypts | Transport mode |

For most networks, AH is sufficient. Use ESP if you need to encrypt routing protocol messages (rare but possible in high-security environments).

## Configuring OSPFv3 IPsec Authentication on Cisco IOS

```text
! Method 1: Per-interface authentication
interface GigabitEthernet0/0
 ospfv3 authentication ipsec spi 256 sha1 <40-hex-char-key>

! Method 2: Per-area authentication (applies to all interfaces in area)
router ospfv3 1
 address-family ipv6 unicast
  area 0 authentication ipsec spi 256 sha1 <40-hex-char-key>

! Using MD5 (less secure but supported)
interface GigabitEthernet0/0
 ospfv3 authentication ipsec spi 300 md5 <32-hex-char-key>
```

**Important**: The SPI (Security Parameters Index) and key must be identical on both neighbors.

## Configuring ESP Encryption on Cisco

```text
! Use ESP for both authentication and encryption
interface GigabitEthernet0/0
 ospfv3 encryption ipsec spi 400 esp 3des <encryption-key> sha1 <auth-key>
```

## Configuring OSPFv3 IPsec Authentication on FRRouting

FRRouting (as of version 8.x) supports OSPFv3 IPsec authentication through the kernel's IPsec (xfrm) subsystem:

```bash
# Step 1: Create IPsec security associations using ip xfrm

# These must match on both routers

# On Router 1 (for traffic from R1 to R2)
sudo ip xfrm state add src fe80::1 dst fe80::2 \
  proto ah spi 0x100 \
  auth "hmac(sha1)" 0x<40-hex-key> \
  mode transport

# Return SA (from R2 to R1)
sudo ip xfrm state add src fe80::2 dst fe80::1 \
  proto ah spi 0x100 \
  auth "hmac(sha1)" 0x<40-hex-key> \
  mode transport

# Step 2: Create IPsec policy to apply to OSPFv3 traffic
sudo ip xfrm policy add src fe80::1 dst fe80::2 proto 89 \
  dir out action protect \
  tmpl src fe80::1 dst fe80::2 proto ah mode transport

sudo ip xfrm policy add src fe80::2 dst fe80::1 proto 89 \
  dir in action protect \
  tmpl src fe80::2 dst fe80::1 proto ah mode transport
```

## Verifying Authentication

```text
! Cisco: Verify IPsec is active on OSPFv3 interface
Router# show ospfv3 interface GigabitEthernet0/0 | include auth
! Should show: Authentication SPI 256, secure socket UP

! Check IPsec Security Associations
Router# show crypto ipsec sa
```

```bash
# FRRouting: Check IPsec state
ip xfrm state show
ip xfrm policy show

# Verify OSPFv3 adjacency still forms with authentication
vtysh -c "show ipv6 ospf neighbor"
```

## Key Management Considerations

- Both neighbors must use the **same SPI value** and **same key**
- SHA-1 is the minimum recommended; use SHA-256 or SHA-512 where supported
- Keys should be rotated periodically - plan for a brief adjacency reset during rotation
- In large networks, consider automating key distribution with a PKI or secrets manager

## Summary

OSPFv3 authentication requires IPsec, not the built-in mechanism of OSPFv2. On Cisco, use `ospfv3 authentication ipsec spi <spi> sha1 <key>` per interface or per area. On FRRouting, configure IPsec at the kernel level using `ip xfrm`. Ensure SPI values and keys match on both ends of each OSPFv3 adjacency.
