# How to Understand Why Only the Source Can Fragment in IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Fragmentation, Router, Performance, RFC 8200

Description: Understand the design rationale behind IPv6's source-only fragmentation model, why intermediate router fragmentation was eliminated, and the performance benefits this provides.

## Introduction

IPv6 eliminated the ability of intermediate routers to fragment packets. Only the original source of a packet can fragment it. This is one of the most significant architectural differences from IPv4, where any router in the path could fragment a packet if it needed to traverse a link with a smaller MTU. The rationale involves performance, security, and architectural clarity.

## IPv4 Router Fragmentation Problems

In IPv4, any router could fragment packets:

```text
IPv4 fragmentation problems:
  1. Router overhead: Fragmentation requires allocating buffers,
     copying data, creating multiple packets - expensive in hardware

  2. Performance impact: Hardware fast paths often can't fragment;
     packets that need fragmentation get punted to the CPU

  3. Reassembly at destination: Only the destination reassembles
     → Intermediate nodes don't need state, but destination must
       maintain fragment buffers

  4. Fragment attacks: Teardrop attack, overlapping fragments,
     Fragrouter attacks - all exploited fragmentation and reassembly behavior

  5. Poor path visibility: Source doesn't know the actual path MTU
     unless DF bit is set and ICMP "Fragmentation Needed" is returned
```

## Why IPv6 Eliminated Router Fragmentation

```text
RFC 8200 rationale:

1. Performance: Eliminating router fragmentation allows all routers
   to process packets entirely in hardware at line rate.
   No packet requires buffer allocation or copying for fragmentation.

2. Simplicity: Routers become pure forwarders.
   They don't need logic for: buffer allocation, fragment creation,
   or tracking the state of fragmented packets.

3. Path MTU Discovery: By requiring ICMPv6 "Packet Too Big" instead
   of router fragmentation, the source learns the actual path MTU
   and sends appropriately-sized packets until the path MTU changes.

4. Security: Eliminates an entire class of router-level attacks
   based on triggering fragmentation behavior in routers.

5. Architectural clarity: Fragmentation becomes an endpoint
   responsibility. Routers either forward the packet or send
   ICMPv6 Packet Too Big.
```

## The Trade-Off: Source Complexity

The price for simpler routers is that sources often need more logic:

```text
IPv6 source responsibilities:
  1. Implement Path MTU Discovery (RFC 8201)
  2. Cache PMTU per path/destination
  3. Handle ICMPv6 "Packet Too Big" messages
  4. Create correct Fragment Headers when needed
  5. Keep fragment Identification values unique per source/destination pair

IPv4 sources (when DF=0):
  1. Can send packets larger than the path MTU
  2. Routers handle size mismatches transparently
  3. No PMTUD required (though recommended)
```

## How ICMPv6 "Packet Too Big" Replaces Router Fragmentation

```mermaid
sequenceDiagram
    participant S as Source
    participant R1 as Router (MTU=1500)
    participant R2 as Router (MTU=1280)
    participant D as Destination

    S->>R1: Packet (1500 bytes)
    R1->>R2: Forward (1500 bytes)
    Note over R2: Cannot forward! Link MTU=1280
    R2->>S: ICMPv6 Packet Too Big (MTU=1280)
    Note over S: Cache PMTU=1280 for this destination
    S->>R1: Re-send as smaller packet (1280 bytes)
    R1->>R2: Forward (1280 bytes)
    R2->>D: Forward (1280 bytes)
```

## Practical Consequences

```bash
# Check if your system is handling PMTU correctly

# Look for ICMPv6 Packet Too Big messages being received
sudo tcpdump -i eth0 "icmp6 and ip6[40] == 2"

# Inspect the route to a destination
ip -6 route get 2001:db8::1
# If PMTUD has lowered the path MTU, the route may show `mtu ...`

# Check how long Linux keeps cached PMTU information
cat /proc/sys/net/ipv6/route/mtu_expires
# Seconds before cached PMTU information expires

# Test behavior with a smaller first-hop MTU
sudo ip link set eth0 mtu 1280
# Traffic above 1280 bytes must now be reduced or fragmented at the source

# View Packet Too Big and fragmentation counters
nstat -az | grep -E 'Icmp6(In|Out)PktTooBigs|Ip6Frag'
```

## When Source Fragmentation Is Used

```text
Sources may fragment when an application needs to send a packet larger
than the current path MTU (most commonly with UDP or other datagram traffic):

Option 1: Keep packets ≤ 1280 bytes (minimum IPv6 MTU)
  → Works on all paths, no fragmentation needed
  → Wastes capacity on high-MTU paths

Option 2: Use Path MTU Discovery
  → Discovers exact path MTU, maximizes efficiency
  → Requires proper ICMPv6 path (firewalls must not block Packet Too Big)

Option 3: Fragment at the source
  → Source creates fragments using Fragment Header
  → Works but fragments are often dropped by middleboxes
  → Should be last resort

For TCP: MSS (Maximum Segment Size) helps handle this automatically
  → TCP negotiates MSS during SYN exchange
  → TCP sender stays within the smaller of MSS and the PMTU-derived limit
  → PMTUD changes the effective segment size during the connection
```

## Conclusion

IPv6's source-only fragmentation model was a deliberate architectural choice to improve router performance and eliminate router complexity at the cost of source complexity. This trade-off makes sense at scale: routers are few and must be fast; endpoints are many and can afford more logic. The ICMPv6 Packet Too Big mechanism provides an elegant feedback loop that allows sources to learn and cache path MTU values, ultimately enabling more efficient packet sizing than IPv4's router-fragmentation model. The key operational implication is that ICMPv6 Packet Too Big messages must never be filtered or blocked.
