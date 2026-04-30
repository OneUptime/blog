# How to Understand IPv6 Neighbor Discovery Protocol Overview

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NDP, Neighbor Discovery, IPv6, RFC 4861, Networking

Description: Understand the IPv6 Neighbor Discovery Protocol (NDP), the five ICMPv6 message types it uses, and how it replaces ARP and adds router/prefix discovery.

## Introduction

IPv6 Neighbor Discovery Protocol (NDP), defined in RFC 4861, is the IPv6 replacement for IPv4's ARP, ICMP Router Discovery, and ICMP Redirect. NDP uses five ICMPv6 message types to provide address resolution, router discovery, prefix discovery, parameter discovery, and address autoconfiguration support. It operates at the network layer and uses ICMPv6 rather than a separate layer-2 protocol like ARP.

## NDP's Five Core Functions

```text
Function 1: Router Discovery
  Hosts discover routers on the local link
  Messages: Router Solicitation (RS, Type 133) and
            Router Advertisement (RA, Type 134)

Function 2: Prefix Discovery
  Hosts learn what IPv6 prefixes are on-link
  Carried in Prefix Information Options within RA messages

Function 3: Parameter Discovery
  Hosts learn link MTU, hop limit, and other parameters
  Carried in MTU option and fields within RA messages

Function 4: Address Resolution
  Resolve IPv6 address to link-layer (MAC) address
  Replaces ARP
  Messages: Neighbor Solicitation (NS, Type 135) and
            Neighbor Advertisement (NA, Type 136)

Function 5: Next-Hop Determination
  Determine whether to send directly to a neighbor or via a router
  Uses the Prefix List and Default Router List learned from RA messages
```

## NDP Message Types Summary

```text
ICMPv6 Type 133: Router Solicitation (RS)
  From: Hosts
  To:   All-Routers multicast (ff02::2)
  When: Host wants to immediately get router information
        (instead of waiting for periodic RA)
  Content: Optional Source Link-Layer Address option

ICMPv6 Type 134: Router Advertisement (RA)
  From: Routers
  To:   All-Nodes multicast (ff02::1), or unicast reply to RS
  When: Periodically (not a fixed timer; by default randomized
        between about 200s and 600s), and in response to RS
  Content: Flags, Prefix Information, MTU, Hop Limit, etc.

ICMPv6 Type 135: Neighbor Solicitation (NS)
  From: Node seeking resolution or verification
  To:   Solicited-node multicast for target, or unicast for NUD
  When: Address resolution (NS to solicited-node) or
        Duplicate Address Detection (NS from ::) or
        Neighbor Unreachability Detection
  Content: Target Address, optional Source Link-Layer Address

ICMPv6 Type 136: Neighbor Advertisement (NA)
  From: Node responding to NS, or proactively advertising change
  To:   Unicast (reply to NS) or All-Nodes multicast (unsolicited)
  Content: Target Address, Flags (R/S/O), Target Link-Layer Address

ICMPv6 Type 137: Redirect
  From: Routers
  To:   Sending host (unicast)
  When: Router knows a better first hop for a specific destination
  Content: Target address, destination address, options
```

## Comparison: NDP vs ARP

```text
ARP (IPv4):
  Protocol: Link-layer protocol; on Ethernet, ARP uses EtherType 0x0806
  Broadcast: Entire subnet receives every ARP request
  No authentication: Trivially spoofable
  No router discovery in ARP itself: handled by separate mechanisms
  No address autoconfiguration in ARP itself: handled separately

NDP (IPv6):
  Protocol: ICMPv6 (part of IP layer)
  Multicast: NS goes to the target's solicited-node multicast group
  Authentication: Optional SEND (RFC 3971) for cryptographic verification
  Router discovery: Built-in via RS/RA
  Autoconfiguration: SLAAC using RA prefix information
```

## Solicited-Node Multicast Addresses

NDP reduces traffic compared to ARP by using solicited-node multicast:

```bash
# Solicited-node multicast = ff02::1:ff<last 24 bits of IPv6 address>

# Example: for address 2001:db8::1234:5678
# Last 24 bits of 1234:5678 = 34:56:78
# Solicited-node multicast = ff02::1:ff34:5678

python3 << 'EOF'
def solicited_node_multicast(ipv6_addr: str) -> str:
    """Calculate solicited-node multicast address for an IPv6 address."""
    import socket
    addr_bytes = socket.inet_pton(socket.AF_INET6, ipv6_addr)
    last_3_bytes = addr_bytes[-3:]
    prefix = socket.inet_pton(socket.AF_INET6, "ff02::1:ff00:0")
    multicast = prefix[:13] + last_3_bytes
    return socket.inet_ntop(socket.AF_INET6, multicast)

test_addrs = [
    "2001:db8::1",
    "2001:db8::1234:5678",
    "fe80::dead:beef",
]
for addr in test_addrs:
    snm = solicited_node_multicast(addr)
    print(f"{addr} → solicited-node: {snm}")
EOF
```

## Conclusion

NDP is the cornerstone of IPv6 network operation, replacing multiple IPv4 mechanisms with a unified protocol. Its five functions - router discovery, prefix discovery, parameter discovery, address resolution, and next-hop determination - rely on ICMPv6 messages and the information they carry. The use of solicited-node multicast for address resolution is more efficient than ARP's broadcast approach. Essential NDP messages must be allowed through firewalls on the local segment for IPv6 to function correctly, making firewall policy one of the most common NDP troubleshooting targets.
