# How to Understand IPv6 Tunneling Mechanisms Overview

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Tunneling, 6in4, Teredo, GRE, Transition

Description: Learn the different IPv6 tunneling mechanisms used to carry IPv6 traffic over IPv4 infrastructure, including 6in4, 6to4, 6rd, Teredo, ISATAP, and GRE, with their use cases and limitations.

## Overview

IPv6 tunneling carries IPv6 packets inside IPv4 packets, allowing IPv6 connectivity where native IPv6 is not available. Several automatic transition mechanisms were critical during early IPv6 adoption but are now deprecated in favor of native dual-stack. Understanding the mechanisms helps identify and disable tunnels that may create unintended connectivity or security risks.

## Tunneling Mechanisms at a Glance

| Mechanism | RFC | Encapsulation | NAT | Use Case | Status |
|---|---|---|---|---|---|
| 6in4 (SIT) | RFC 4213 | IPv6-in-IPv4 (proto 41) | No | Static manual tunnels | Still used |
| 6to4 | RFC 3056 | Proto 41 via anycast 192.88.99.1 | No | Auto addr from IPv4 | Deprecated |
| 6rd | RFC 5969 | Proto 41 via ISP relays | No | ISP transition deployment | Limited use |
| Teredo | RFC 4380 | IPv6-in-UDP/IPv4 (port 3544) | Yes | NAT traversal for clients | Deprecated |
| ISATAP | RFC 5214 | Proto 41 on enterprise LANs | No | Enterprise intra-site | Deprecated |
| GRE | RFC 2784 | Any payload in GRE/IPv4 | No | Flexible transport | Still used |

## Protocol 41 - The Core Mechanism

Most IPv6-in-IPv4 tunnels use IP protocol number 41:

```text
IPv4 outer header:
  Protocol: 41 (0x29)
  Source: IPv4 address of tunnel endpoint
  Destination: IPv4 address of remote endpoint

IPv6 inner packet:
  (complete IPv6 packet as payload)
```

```bash
# Capture protocol 41 traffic

tcpdump -i eth0 "proto 41"

# On Linux, protocol 41 tunnels use the "sit" driver
ip tunnel show
modinfo sit
```

## 6in4 (SIT - Simple Internet Transition)

Manual point-to-point tunnel. Both ends are statically configured:

```text
[Site A] ──proto41──► [Tunnel Broker] ──native IPv6──► Internet
2001:db8:a::/48          IPv4 Internet
```

```bash
# Linux creation
ip tunnel add sit1 mode sit remote 198.51.100.1 local 203.0.113.10 ttl 64
ip link set sit1 up
ip addr add 2001:db8::2/64 dev sit1
ip -6 route add ::/0 via 2001:db8::1 dev sit1
```

Best for: connecting a site with IPv4 connectivity to an IPv6 tunnel broker.

## 6to4 (Deprecated)

Automatic address derivation from IPv4 public address:

```text
IPv4: 203.0.113.10
6to4 prefix: 2002:cb00:710a::/48   (2002 + IPv4 in hex)

Relay: anycast 192.88.99.1 (now deprecated - RFC 7526)
```

Problems that led to deprecation:
- Relay quality varies wildly - broken relays cause random failures
- The 192.88.99.1 anycast relay mechanism was deprecated (RFC 7526, 2015)
- Often results in worse performance than IPv4 alone
- Security issues from uncontrolled relay network

## 6rd (IPv6 Rapid Deployment)

ISP-controlled version of 6to4 with operator-owned relays:

```text
ISP prefix: 2001:db8::/32
CE IPv4: 192.168.1.10 (→ hex: c0a8:010a)
6rd delegated prefix: 2001:db8:c0a8:010a::/64
```

Better than 6to4 because ISP controls relay quality, but still requires tunneling infrastructure.

## Teredo - IPv6 Through NAT

Encapsulates IPv6 in UDP/IPv4 for NAT traversal:

```text
Client (behind NAT)
  ↓
[NAT device - IPv4 only]
  ├─ setup/qualification → Teredo Server
  └─ data traffic → Teredo Relay → IPv6 Internet
```

Teredo addresses use the `2001:0000::/32` prefix. Teredo servers help clients establish and maintain connectivity, while relays forward traffic between Teredo clients and the native IPv6 Internet. Microsoft lists Teredo among deprecated IPv4/6 transition technologies and notes it has been disabled since Windows 10 version 1803.

## ISATAP

Intra-Site Automatic Tunnel Addressing Protocol - creates an IPv6 overlay on IPv4 enterprise LANs. Addresses embed the IPv4 address: `fe80::0:5efe:192.0.2.10`. Microsoft lists ISATAP among deprecated IPv4/6 transition technologies and notes it has been disabled by default since Windows 10 version 1703.

## GRE Tunnels

Generic Routing Encapsulation (RFC 2784) can carry IPv6 as a payload over an IPv4 GRE tunnel:

```text
Outer IPv4 header (protocol: GRE = 47)
GRE header
Inner IPv6 packet
```

GRE is more flexible than SIT - it can carry multiple protocols and works with routing protocols over the tunnel. Still used in many operator and enterprise networks.

## Security Concerns

```text
Tunneled traffic may bypass:
  - IPv6 firewall (firewall inspects IPv4, not inner IPv6)
  - IDS/IPS (signature matching on IPv6 payload missed)
  - DLP (content inspection on IPv4 layer only)

Best practice:
  - Block protocol 41 at perimeter (6in4, 6to4, ISATAP)
  - Block UDP 3544 (Teredo) at perimeter
  - Block GRE (protocol 47) unless explicitly authorized
  - Monitor for unauthorized tunnel creation
```

## Summary

IPv6 tunneling mechanisms fall broadly into two categories: operator-controlled (6in4 manual tunnels, 6rd, GRE) and automatic/address-derived (6to4, Teredo, ISATAP). The automatic mechanisms are deprecated due to quality, security, and operational issues. Native dual-stack is preferred where available. For environments where tunneling is unavoidable (e.g., connecting to an IPv6 tunnel broker), use 6in4 (SIT) or GRE with explicit configuration. Block protocol 41, UDP 3544, and GRE at network borders unless those tunnels are explicitly authorized.
