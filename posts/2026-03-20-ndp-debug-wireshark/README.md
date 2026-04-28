# How to Debug NDP with Wireshark Filters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NDP, Wireshark, Debugging, Packet Analysis, IPv6

Description: Use Wireshark display filters to capture and analyze NDP messages, decode neighbor cache operations, identify rogue RA attacks, and diagnose SLAAC issues.

## Introduction

Wireshark provides comprehensive NDP analysis through its ICMPv6 dissector, which automatically decodes all NDP message types and their options. Its display filters allow precise targeting of specific NDP exchanges like RS/RA pairs, NS/NA pairs for specific addresses, and DAD operations. This guide covers the most useful Wireshark techniques for NDP debugging.

## Essential NDP Wireshark Display Filters

```text
# Show all NDP messages (Types 133-137)

icmpv6.type >= 133 and icmpv6.type <= 137

# Specific message types
icmpv6.type == 133    # Router Solicitation
icmpv6.type == 134    # Router Advertisement
icmpv6.type == 135    # Neighbor Solicitation
icmpv6.type == 136    # Neighbor Advertisement
icmpv6.type == 137    # Redirect

# NDP with M flag set (stateful DHCPv6 enabled)
icmpv6.type == 134 and icmpv6.nd.ra.flag.m == 1

# NDP with O flag set (stateless DHCPv6 for other config)
icmpv6.type == 134 and icmpv6.nd.ra.flag.o == 1

# Filter by Router Lifetime (0 = not a default router)
icmpv6.nd.ra.router_lifetime == 0

# Show only RA with prefix information
icmpv6.type == 134 and icmpv6.opt.type == 3

# Find RA with MTU option
icmpv6.type == 134 and icmpv6.opt.type == 5

# Find RA with RDNSS option
icmpv6.type == 134 and icmpv6.opt.type == 25

# DAD NS (source is ::)
icmpv6.type == 135 and ipv6.src == "::"

# Solicited NA only (S flag set)
icmpv6.type == 136 and icmpv6.nd.na.flag.s == 1

# Unsolicited NA (S flag not set, sent to ff02::1)
icmpv6.type == 136 and icmpv6.nd.na.flag.s == 0

# NUD probes (unicast NS, not to multicast destination)
icmpv6.type == 135 and not ipv6.dst matches "^ff"
```

## Diagnosing Specific NDP Issues

```text
1. SLAAC not working (no address assigned):
   Filter: icmpv6.type == 133 or icmpv6.type == 134
   Look for: RS from host (133), RA response (134)
   If no RA: router not advertising (check radvd)
   If RA with A=0: SLAAC disabled in prefix info

2. Router discovery failure:
   Filter: icmpv6.type == 134
   Look for: Router Lifetime > 0 in RA
   If no RA seen: router advertising on wrong VLAN/interface
   If Router Lifetime = 0: router not offering default gateway

3. Duplicate Address Detection failure:
   Filter: icmpv6.type == 135 and ipv6.src == "::"
   Then: icmpv6.type == 136 and icmpv6.nd.na.flag.s == 0
   If you see NS from :: followed quickly by NA: DAD conflict!
   The NA sender has a duplicate address

4. Neighbor resolution failure:
   Filter: (icmpv6.type == 135 or icmpv6.type == 136) and
           icmpv6.nd.ns.target_address == "2001:db8::1"
   Look for NS and matching NA response
   No NA = host unreachable or NDP blocked

5. Rogue Router Advertisement:
   Filter: icmpv6.type == 134
   Look for: Multiple RAs from different source addresses
   (fe80::1 and fe80::2 both sending RAs = possible rogue RA)
```

## tshark NDP Analysis

```bash
# Extract all RA source addresses (find unexpected routers)
tshark -r capture.pcap -Y "icmpv6.type == 134" \
    -T fields -e ipv6.src -e icmpv6.nd.ra.router_lifetime \
    | sort | uniq -c

# Show NS/NA pairs for address resolution timeline
tshark -r capture.pcap -Y "icmpv6.type == 135 or icmpv6.type == 136" \
    -T fields \
    -e frame.time \
    -e icmpv6.type \
    -e ipv6.src \
    -e ipv6.dst \
    -e icmpv6.nd.ns.target_address \
    -e icmpv6.nd.na.target_address

# Find DAD conflicts
tshark -r capture.pcap \
    -Y "icmpv6.type == 136 and icmpv6.nd.na.flag.s == 0 and ipv6.dst == ff02::1" \
    -T fields -e ipv6.src -e ipv6.dst -e icmpv6.nd.na.target_address
# These unsolicited NAs to all-nodes (ff02::1) may be DAD conflict responses
```

## Conclusion

Wireshark's NDP display filters provide precise visibility into every aspect of neighbor discovery. For SLAAC issues, filter for RA (type 134) and check M, O, A flags. For address resolution failures, track NS/NA pairs filtered by target address. For DAD issues, filter for NS from `::` source and unsolicited NA responses. The tshark command-line interface enables automated NDP analysis in scripts. When diagnosing rogue RA attacks, look for multiple RA senders from unexpected link-local source addresses.
