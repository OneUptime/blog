# How to Understand IPsec in IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, IPsec, Security, AH, ESP

Description: Understand how IPsec works in the context of IPv6, including header placement, the change from mandatory to optional, and how AH and ESP extension headers integrate with the IPv6 packet structure.

## Overview

IPsec support was originally mandatory for IPv6 nodes (RFC 4294), but RFC 6434 (2011) relaxed this by making support for the IPsec architecture a SHOULD. IPsec in IPv6 uses the same two protocols as IPv4 - Authentication Header (AH) and Encapsulating Security Payload (ESP) - but in IPv6 they are identified by Next Header values in the packet's header chain.

## How IPsec Headers Appear in IPv6

In IPv6, AH and ESP are identified by Next Header values and appear in the header chain as follows:

| Protocol | Next Header Value | Position in Header Chain |
|----------|------------------|--------------------------|
| AH | 51 | Typically after Routing/Fragment headers if present, before upper-layer |
| ESP | 50 | Typically after Routing/Fragment headers if present, before upper-layer |

```text
IPv6 Packet with AH (Transport Mode):
IPv6 Header (NH=51) → AH Header → TCP/UDP Payload

IPv6 Packet with ESP (Transport Mode):
IPv6 Header (NH=50) → ESP Header → [Encrypted TCP/UDP] → ESP Trailer → ESP Auth

IPv6 Packet with ESP (Tunnel Mode):
Outer IPv6 Header (NH=50) → ESP Header → [Inner IPv6 Header → TCP/UDP] → ESP Trailer → ESP Auth
```

## AH vs ESP in IPv6

| Feature | AH (NH=51) | ESP (NH=50) |
|---------|-----------|-------------|
| Authentication | Yes | Yes (optional) |
| Encryption | No | Yes (optional) |
| Protects IP header | Yes (most fields) | Only inner header (tunnel) |
| NAT compatible | No | Yes (in NAT-T mode) |
| Use case | Integrity only | Confidentiality + integrity (typical) |

## Transport Mode vs Tunnel Mode

### Transport Mode

Protects only the payload; original IP header is kept:

```text
Original: [IPv6: src=A, dst=B] [TCP: sport=1234, dport=443] [Data]

With ESP Transport Mode:
[IPv6: src=A, dst=B, NH=50] [ESP] [TCP: sport=1234, dport=443] [Data] [ESP-Trailer] [ESP-Auth]
```

Use case: Host-to-host communication on a trusted backbone.

### Tunnel Mode

Encapsulates the entire original packet:

```text
Original: [IPv6: src=A, dst=B] [TCP] [Data]

With ESP Tunnel Mode:
[Outer IPv6: src=GW1, dst=GW2, NH=50] [ESP] [Inner IPv6: src=A, dst=B] [TCP] [Data] [ESP-Trailer] [ESP-Auth]
```

Use case: Gateway-to-gateway VPN (site-to-site).

## The Mandatory-to-Optional Change (RFC 6434)

RFC 4294 (2006 IPv6 Node Requirements) made IPsec support mandatory for IPv6 nodes, requiring support for both ESP and AH.

RFC 6434 (2011) revised this: support for the IPsec architecture became a SHOULD; nodes that implement it MUST support ESP and MAY support AH.

Reasons for the change:
- IPsec is one of several security approaches, and no single approach fits every environment
- Some devices have limited application sets where application-specific security is sufficient
- Some devices run on constrained hardware where the full IPsec architecture is not justified

```bash
# Inspect Linux IPsec/XFRM state (usually requires root)

sudo ip xfrm state list
sudo ip xfrm policy list

# Check whether XFRM/IPsec modules are loaded on modular kernels
lsmod | grep -E 'xfrm|esp6|ah6'
```

## Security Associations (SA) for IPv6

IPsec SAs in IPv6 use the same concept as IPv4: identified by (SPI, Destination Address, Protocol):

```bash
# View current IPv6 IPsec SAs
sudo ip -6 xfrm state list

# Sample SA output:
# src 2001:db8:1::1 dst 2001:db8:2::1
#     proto esp spi 0xc1234567 reqid 1 mode transport
#     auth hmac(sha256) 0xabc...
#     enc cbc(aes) 0xdef...
```

## IPv6 IPsec in Practice

Modern deployments typically use IKEv2 (RFC 7296) for SA negotiation:

```bash
# strongSwan: Basic IPv6 IKEv2 configuration
# /etc/swanctl/conf.d/ipv6-test.conf
connections {
    ipv6-host {
        version = 2
        local_addrs  = 2001:db8:1::1
        remote_addrs = 2001:db8:2::1

        local {
            auth = psk
            id = 2001:db8:1::1
        }
        remote {
            auth = psk
            id = 2001:db8:2::1
        }

        children {
            ipv6-host-to-host {
                local_ts  = 2001:db8:1::1/128
                remote_ts = 2001:db8:2::1/128
                mode = transport
                esp_proposals = aes256gcm16-ecp256
            }
        }
    }
}

secrets {
    ike-ipv6 {
        id-local  = 2001:db8:1::1
        id-remote = 2001:db8:2::1
        secret = "StrongPresharedKey123!"
    }
}
```

## IPv6 AH Complication: Mutable Header Fields

AH authenticates the immutable and predictable parts of the IPv6 header, but some fields are mutable or excluded from the ICV calculation:

**Fields not covered verbatim by AH calculation:**
- Traffic Class (DSCP/ECN bits may change in transit)
- Flow Label (excluded from AHv2 for compatibility with earlier IPv6 rules)
- Hop Limit (decremented at each router)

**Immutable fields (authenticated by AH):**
- Version (always 6)
- Payload Length
- Source Address
- Destination Address (without Routing Header; with a Routing Header it is mutable but predictable)

This means AH over IPv6 is still meaningful but doesn't protect mutable fields.

## Summary

IPsec in IPv6 uses AH (NH=51) and ESP (NH=50) in the IPv6 header chain. IPsec support was mandatory for IPv6 nodes in RFC 4294, but RFC 6434 relaxed this: support for the IPsec architecture became a SHOULD, and implementations that use it MUST implement ESP while AH is optional. Transport mode protects host-to-host communications; tunnel mode is used for gateway VPNs. Modern deployments use IKEv2 (strongSwan/Libreswan) for automatic SA negotiation. AH authenticates the immutable and predictable parts of the IPv6 header and excludes mutable fields such as Traffic Class, Flow Label, and Hop Limit from the ICV calculation.
