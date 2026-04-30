# How to Implement IPv6 Ingress Filtering (BCP 38/RFC 2827)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Security, BCP38, Ingress Filtering, Spoofing Prevention

Description: Learn how to implement BCP 38 ingress filtering for IPv6 to prevent source address spoofing and reduce the effectiveness of DDoS amplification attacks.

## Overview

BCP 38 (RFC 2827), updated by RFC 3704, recommends ingress filtering: a network operator should drop packets whose source address should not arrive on a given interface. For IPv6 this prevents source address spoofing, which is a prerequisite for many DDoS amplification attacks. IPv6's lack of NAT makes source address validation more important, not less.

## Why IPv6 Needs BCP 38

IPv4 networks frequently hide behind NAT, but NAT is not source address validation. IPv6 typically avoids NAT, and many Internet-connected hosts use global unicast addresses. Without ingress filtering, a host on a poorly filtered network can still spoof IPv6 source addresses and launch:

- Amplification attacks using ICMPv6 echo to multicast groups
- NDP exhaustion with spoofed sources
- BGP session disruption via spoofed TCP packets
- Reflection attacks using spoofed source to misdirect responses

## Ingress Filtering Concepts

```mermaid
flowchart LR
    Customer[Customer\n2001:db8:1000::/48] --> ISP_Router[ISP Router]
    ISP_Router -- "Source 2001:db8:1000::/48\n→ ACCEPT" --> Internet
    ISP_Router -- "Source 2001:db8:2000::/48\n→ DROP (spoofed)" --> Sink[/dev/null]
```

Rule: If forwarded customer traffic arrives from Customer, its source address MUST be within the Customer's assigned prefix. Any other forwarded source = spoofed → DROP. On a live access link, keep required control-plane traffic such as NDP, DHCPv6 PD, or customer BGP sessions above the anti-spoofing rules.

## Implementation: Router ACL

The examples below show the anti-spoofing logic itself. In production, add any required control-plane exceptions before the final drop or reject rule.

### Cisco IOS

```nginx
! Customer assigned: 2001:db8:1000::/48
ipv6 access-list INGRESS-CUSTOMER
  permit ipv6 2001:db8:1000::/48 any    ! Allow customer's legitimate addresses
  deny   ipv6 any any log               ! Drop everything else (spoofed)

interface GigabitEthernet0/0
  description "Customer link"
  ipv6 access-group INGRESS-CUSTOMER in

! Also block bogon sources at upstream interface
ipv6 access-list INGRESS-UPSTREAM
  deny   ipv6 ::/128 any
  deny   ipv6 ::1/128 any
  deny   ipv6 2001:db8::/32 any        ! Documentation prefix
  deny   ipv6 fc00::/7 any             ! ULA from internet
  deny   ipv6 fe80::/10 any            ! Link-local from internet
  permit ipv6 any any
```

### Juniper JunOS

```text
# Filter applied to customer-facing interface

set firewall family inet6 filter INGRESS-CUSTOMER term allow-customer from source-address 2001:db8:1000::/48
set firewall family inet6 filter INGRESS-CUSTOMER term allow-customer then accept
set firewall family inet6 filter INGRESS-CUSTOMER term deny-spoof then discard

set interfaces ge-0/0/0 unit 0 family inet6 filter input INGRESS-CUSTOMER
```

### Linux iptables/nftables

```bash
# nftables: Ingress filtering for a hosted customer
nft add table ip6 ingress
nft add chain ip6 ingress forward { type filter hook forward priority filter\; }

# Allow only forwarded traffic from the customer's assigned prefix
nft add rule ip6 ingress forward iifname "eth1" ip6 saddr 2001:db8:1000::/48 accept
nft add rule ip6 ingress forward iifname "eth1" drop
```

## Unicast Reverse Path Forwarding (uRPF)

uRPF is an automated form of ingress filtering - the router checks that there is a route back to the source address via the incoming interface:

```text
! Cisco: Enable strict uRPF on customer interface
interface GigabitEthernet0/0
  ipv6 verify unicast source reachable-via rx   ! Strict mode
  ! or
  ipv6 verify unicast source reachable-via any  ! Loose mode (less effective)
```

```bash
# Linux does not provide an IPv6 rp_filter sysctl equivalent to IPv4.
# For IPv6, enforce source validation with nftables/ip6tables rules on the
# forwarding path instead.
```

## Source Address Validation at Access Layer

SAVI (RFC 7039) is a framework for access-layer source validation; on Cisco platforms this is typically implemented with IPv6 Source Guard:

```text
! Cisco: IPv6 Source Guard on access switch
ipv6 source-guard policy SAVI-POLICY
  permit link-local

interface GigabitEthernet0/1
  ipv6 source-guard attach-policy SAVI-POLICY
  ! Source Guard learns bindings via ND/DHCP gleaning
  ! Drops data traffic with source addresses not in the binding table
```

## Bogon Prefix Ingress Filter

At minimum, filter obviously invalid or non-global source prefixes at internet-facing interfaces:

```bash
# ip6tables: Drop clearly invalid or non-global sources at ingress
# Keep this list aligned with the current IANA IPv6 Special-Purpose Address Registry.
for prefix in "::/128" "::1/128" "::ffff:0:0/96" "2001:db8::/32" \
  "fc00::/7" "fe80::/10"; do
  ip6tables -A FORWARD -i eth0 -s "$prefix" -j DROP
done
```

## Measuring BCP 38 Compliance

Use the CAIDA Spoofer project tools to test your network:

```bash
# The Spoofer client automatically tests IPv6 if the host has IPv6 connectivity.
# Download the current client or source package from:
# https://www.caida.org/projects/spoofer/
#
# If you build from source, you can run the probe manually as root:
# ./spoofer-prober

# Report shows whether your ISP blocks spoofed IPv6 packets
```

## Summary

IPv6 ingress filtering (BCP 38) is implemented via ACLs on customer-facing interfaces that only permit forwarded traffic with source addresses matching the customer's assigned prefix, router-level uRPF (Cisco: `ipv6 verify unicast source reachable-via rx`), and access-layer source validation features such as SAVI or IPv6 Source Guard. Always combine with filtering of obviously invalid or non-global source prefixes at internet-facing interfaces, and keep those lists aligned with the IANA special-purpose registry. Test compliance with the CAIDA Spoofer project to verify your network blocks spoofed IPv6 packets.
