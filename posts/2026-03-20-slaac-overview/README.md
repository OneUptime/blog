# How to Understand IPv6 Stateless Address Autoconfiguration (SLAAC)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SLAAC, IPv6, Address Autoconfiguration, NDP, RFC 4862

Description: Understand how IPv6 Stateless Address Autoconfiguration (SLAAC) allows hosts to automatically configure their own IPv6 addresses from Router Advertisement prefix information, without a DHCP server.

## Introduction

Stateless Address Autoconfiguration (SLAAC, RFC 4862) is the mechanism by which IPv6 hosts automatically configure global unicast addresses using prefix information received from Router Advertisements (RAs). Unlike DHCPv4, SLAAC requires no central server - the host constructs its own address by combining the advertised prefix with a locally generated interface identifier. SLAAC processing is enabled by default on IPv6 hosts and is widely used on IPv6-capable networks.

## SLAAC Overview

```text
SLAAC Process Summary:

1. Host connects to network
2. Host generates link-local address (fe80::/10 link-local prefix, zero-filled as needed, + interface ID)
3. Host performs DAD (Duplicate Address Detection) for link-local
4. Host sends Router Solicitation (RS) to ff02::2 (all routers)
5. Router responds with Router Advertisement (RA) containing:
   - Prefix Information option with A=1 flag
   - Prefix: 2001:db8::/64
   - Valid Lifetime and Preferred Lifetime
6. Host forms SLAAC address: prefix + interface identifier
   Example: 2001:db8:: + ::211:22ff:fe33:4455
           = 2001:db8::211:22ff:fe33:4455
7. Host performs DAD for the new global address
8. Address enters PREFERRED state if DAD passes and Preferred Lifetime is nonzero
```

## SLAAC vs DHCPv4 vs DHCPv6

```text
Address Configuration Comparison:

DHCPv4 (IPv4):
  - Central server assigns address
  - Server tracks all assignments
  - Host has no say in address
  - Requires DHCP infrastructure

SLAAC (IPv6):
  - Host generates its own address
  - No central server required
  - Based on RA prefix + interface ID
  - Works out of the box with routers that advertise an autonomous prefix

Stateful DHCPv6 (IPv6):
  - DHCPv6 server assigns address (like DHCPv4)
  - Server tracks assignments
  - Requires DHCPv6 server infrastructure
  - Indicated when RA has M=1 flag

Stateless DHCPv6 (IPv6):
  - SLAAC provides address (A=1 in RA)
  - DHCPv6 provides DNS, NTP, other options (O=1 in RA)
  - Hybrid: SLAAC for address, DHCPv6 for options
```

## RA Prefix Information Option

The Prefix Information option in RA contains the SLAAC configuration.

```text
Prefix Information Option (Type 3):

 +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 | Type=3 | Length=4 | Pfx Len  |
 +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 |L|A|R|Rsvd1|                  |
 +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 | Valid Lifetime (32 bits)      |
 +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 | Preferred Lifetime (32 bits)  |
 +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 | Reserved2 (32 bits)           |
 +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 | Prefix (128 bits)             |
 |                               |
 +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+

Key Flags:
  L (on-link): Prefix is on-link (no router needed for this prefix)
  A (autonomous): Use this prefix for SLAAC address generation
  R: Router address flag (RFC 6275)

Critical: A=1 allows SLAAC address generation
Critical: L=1 makes the prefix on-link (entries in prefix list)

Lifetimes:
  Valid Lifetime: How long the address is valid
  Preferred Lifetime: How long the address is preferred (not greater than Valid Lifetime)
  When Preferred expires → address is DEPRECATED (still usable)
  When Valid expires → address is INVALID (cannot use)
```

## Address Generation from Prefix

```text
SLAAC Address Formation:

Prefix from RA: 2001:db8::/64 (64-bit prefix)
Interface Identifier: Host-generated (64 bits)

Methods for Interface Identifier:
  1. EUI-64: Derived from MAC address (RFC 4291)
     MAC: 00:11:22:33:44:55
     EUI-64: 0211:22ff:fe33:4455  ← Universal bit flipped
     Address: 2001:db8::211:22ff:fe33:4455

  2. Privacy Extensions (RFC 8981):
     Random 64-bit value, changes periodically
     Address: 2001:db8::[random 64 bits]
     Hides device identity

  3. Stable Privacy (RFC 7217):
     Pseudo-random but stable per network
     Address: 2001:db8::[stable random 64 bits]
     Stable address, but not linked to MAC

  4. Manual/Static:
     Operator-configured interface ID
     Address: 2001:db8::1 (manually set)
```

## SLAAC Lifecycle States

```text
Address Lifecycle (RFC 4862 Sections 5.4 and 5.5.4):

TENTATIVE:
  - Address being validated by DAD
  - Host sends NS for the address (DAD NS)
  - Not yet usable for traffic

PREFERRED:
  - DAD passed, address is fully usable
  - Default source address selection prefers PREFERRED addresses
  - Remains preferred until Preferred Lifetime expires

DEPRECATED:
  - Preferred Lifetime expired
  - Address still valid (can send/receive traffic)
  - New connections should not use DEPRECATED address as source
  - Existing connections continue to work

INVALID:
  - Valid Lifetime expired
  - Address is completely removed from interface
  - No traffic can use this address

Timers:
  TENTATIVE → PREFERRED: DAD duration (often ~1 second by default)
  PREFERRED → DEPRECATED: when Preferred Lifetime expires
  DEPRECATED → INVALID: when Valid Lifetime expires
```

## Verifying SLAAC on Linux

```bash
# Show all IPv6 addresses including SLAAC-generated

ip -6 addr show

# Example output:
# 2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP>
#     inet6 2001:db8::211:22ff:fe33:4455/64 scope global dynamic
#        valid_lft 2591897sec preferred_lft 604697sec
#     inet6 fe80::211:22ff:fe33:4455/64 scope link
#        valid_lft forever preferred_lft forever

# "dynamic" indicates SLAAC-generated address
# valid_lft and preferred_lft show remaining lifetime in seconds

# Show prefix information received via RA
ip -6 route show | grep "proto kernel"
# 2001:db8::/64 dev eth0 proto kernel metric 256 expires 2591897sec

# Show default route from RA (Router Lifetime > 0)
ip -6 route show default
# default via fe80::1 dev eth0 proto ra metric 1024 expires 1799sec
```

## Conclusion

SLAAC allows IPv6 hosts to automatically configure global unicast addresses by combining the prefix from a Router Advertisement with a locally generated interface identifier. It requires no DHCP server, making IPv6 address configuration simpler than IPv4. The A flag in the RA Prefix Information option allows SLAAC. Interface identifiers can be EUI-64 (from MAC), privacy extensions (random), or stable privacy (pseudo-random). SLAAC is the foundation of IPv6 address management and is supplemented by stateless or stateful DHCPv6 when additional configuration (DNS, NTP) is needed.
