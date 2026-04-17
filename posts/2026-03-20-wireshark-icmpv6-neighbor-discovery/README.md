# How to Analyze ICMPv6 Neighbor Discovery in Wireshark

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Wireshark, ICMPv6, Neighbor Discovery, NDP, IPv6, Packet Analysis

Description: A guide to capturing and analyzing ICMPv6 Neighbor Discovery Protocol (NDP) traffic in Wireshark to diagnose IPv6 address resolution and router discovery issues.

ICMPv6 Neighbor Discovery Protocol (NDP) replaces ARP in IPv6. It handles address resolution (Neighbor Solicitation/Advertisement), router discovery (Router Solicitation/Advertisement), and Duplicate Address Detection (DAD). Wireshark makes NDP analysis straightforward.

## NDP Message Types

| ICMPv6 Type | Name | Purpose |
|---|---|---|
| 133 | Router Solicitation (RS) | Host requests routers to send RA |
| 134 | Router Advertisement (RA) | Router announces prefix and config |
| 135 | Neighbor Solicitation (NS) | Address resolution (like ARP Request) |
| 136 | Neighbor Advertisement (NA) | Address resolution reply (like ARP Reply) |
| 137 | Redirect | Better route notification |

## Display Filters for NDP

```wireshark
# Show ALL NDP/ICMPv6 messages

icmpv6

# Show only Neighbor Solicitation messages (type 135)
icmpv6.type == 135

# Show only Neighbor Advertisement messages (type 136)
icmpv6.type == 136

# Show only Router Solicitation (type 133)
icmpv6.type == 133

# Show only Router Advertisement (type 134)
icmpv6.type == 134

# Show the complete NDP exchange (all 4 types)
icmpv6.type >= 133 && icmpv6.type <= 136
```

## Filter NDP for a Specific Target Address

```wireshark
# Find Neighbor Solicitations for a specific target
icmpv6.type == 135 && icmpv6.nd.ns.target_address == 2001:db8::10

# Find Neighbor Advertisements advertising a specific address
icmpv6.type == 136 && icmpv6.nd.na.target_address == 2001:db8::10

# Find all NDP traffic related to a specific host
(icmpv6.type == 135 || icmpv6.type == 136) &&
(ipv6.addr == 2001:db8::10 ||
 icmpv6.nd.ns.target_address == 2001:db8::10 ||
 icmpv6.nd.na.target_address == 2001:db8::10)
```

## Capturing NDP Traffic

```bash
# Capture NDP traffic using tcpdump (for later Wireshark analysis)
sudo tcpdump -i eth0 'icmp6 and (ip6[40] == 133 or ip6[40] == 134 or ip6[40] == 135 or ip6[40] == 136)' -w ndp-capture.pcap
```

Or in Wireshark GUI:
1. Start capture on the relevant interface
2. Apply the capture filter: `icmp6`
3. Reproduce the issue (e.g., connect a new host)

## What to Look for in NDP Analysis

### Normal NS/NA Exchange

A healthy address resolution looks like:
1. **NS**: Source = `fe80::host1`, Destination = `ff02::1:ffXX:XXXX` (solicited-node multicast)
2. **NA**: Source = `fe80::host2`, Destination = `fe80::host1` or `ff02::1`

### Diagnosing No Response to NS

```wireshark
# Show only NS messages without a corresponding NA
# (No direct Wireshark filter, but look for NS with no following NA in the stream)
icmpv6.type == 135

# Then sort by time and check for missing NA responses
```

### Identifying Duplicate Address Detection

DAD sends NS with source = `::` (unspecified):

```wireshark
# Show DAD Neighbor Solicitations
icmpv6.type == 135 && ipv6.src == ::

# Show DAD conflicts (NA sent in response to a DAD NS)
icmpv6.type == 136 && icmpv6.nd.na.flag.s == 0
```

## Using Wireshark Conversations for NDP

1. Go to **Statistics → Conversations**
2. Select the **IPv6** tab
3. Look for multicast conversations (ff02::...) - these represent NDP exchanges

## Common NDP Issues

| Observation | Likely Problem |
|---|---|
| NS sent but no NA received | Host is down or firewall blocks ICMPv6 |
| Repeated NS from `::` | DAD failure / duplicate address |
| Many NA from different MAC | ARP/NDP spoofing attack |
| No RA after RS | No router on segment or RA blocked |

Wireshark's detailed ICMPv6 decoder shows all NDP option fields including link-layer addresses and prefix information, making it the most effective tool for diagnosing IPv6 neighbor discovery problems.
