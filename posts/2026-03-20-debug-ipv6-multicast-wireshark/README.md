# How to Debug IPv6 Multicast Issues with Wireshark

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Multicast, Wireshark, Network Debugging, Packet Analysis

Description: A practical guide to using Wireshark display filters and analysis features to diagnose IPv6 multicast issues including MLD, PIM, and traffic flow problems.

## Setting Up Wireshark for IPv6 Multicast Capture

```bash
# Start Wireshark capture from command line on a specific interface

wireshark -i eth0 -k

# Or capture to a file for later analysis
tshark -i eth0 -w /tmp/multicast-capture.pcap -f 'ip6'

# For remote capture, pipe from tcpdump
ssh root@remote-host tcpdump -i eth0 -w - 'ip6 and (icmp6 or proto 103)' | wireshark -k -i -
```

## Essential Wireshark Display Filters for IPv6 Multicast

```wireshark
# Show all MLD messages (Multicast Listener Discovery)
icmpv6.type == 130 or icmpv6.type == 131 or icmpv6.type == 132 or icmpv6.type == 143

# Show only MLD Queries
icmpv6.type == 130

# Show only MLD Reports (both v1 and v2)
icmpv6.type == 131 or icmpv6.type == 143

# Show only MLD Done messages
icmpv6.type == 132

# Show all PIM-SM messages
pim

# Show PIM Hello messages
pim.type == 0

# Show PIM Register messages
pim.type == 1

# Show PIM Join/Prune messages
pim.type == 3

# Show traffic to a specific IPv6 multicast group
ipv6.dst == ff3e::db8:1

# Show all IPv6 multicast traffic
ipv6.dst == ff00::/8

# Show NDP (Neighbor Discovery) including solicited-node multicast
icmpv6.type == 135 or icmpv6.type == 136

# Show DHCPv6 multicast traffic
ipv6.dst == ff02::1:2
```

## Analyzing MLD Membership Reports

In Wireshark, MLDv2 Version 2 Membership Reports (type 143) contain group records. To analyze:

1. Filter: `icmpv6.type == 143`
2. Click on a packet
3. Expand: `ICMPv6 → Multicast Listener Report Message v2`
4. View each record:
   - Record type (1=MODE_IS_INCLUDE, 2=MODE_IS_EXCLUDE, etc.)
   - Multicast address
   - Source addresses (for SSM)

```wireshark
# Filter for MLDv2 reports with a specific group
icmpv6.type == 143 and ipv6.dst == ff3e::db8:1

# Filter for MLDv2 reports in INCLUDE mode (SSM joins)
icmpv6.type == 143 and icmpv6.mldr.mar.record_type == 1

# Filter for MLDv2 reports leaving a group (CHANGE_TO_INCLUDE with no sources)
icmpv6.type == 143 and icmpv6.mldr.mar.record_type == 3
```

## Debugging PIM-SM Issues

```wireshark
# Show all PIM messages on the wire
pim

# PIM Hello messages (check neighbor relationships)
pim.type == 0

# PIM Bootstrap messages (BSR protocol)
pim.type == 4

# PIM Candidate RP Advertisement
pim.type == 8

# PIM Register (source→RP encapsulation)
pim.type == 1

# PIM Register-Stop (RP tells DR to stop registering)
pim.type == 2

# PIM Join/Prune (build/tear down trees)
pim.type == 3
```

## Tracking Multicast Traffic Flow

```wireshark
# Follow a specific multicast stream
ipv6.dst == ff3e::db8:1 and ipv6.hlim > 1

# Check for multicast traffic that isn't forwarded (TTL/hop limit = 1)
ipv6.dst == ff00::/8 and ipv6.hlim == 1

# Find multicast traffic arriving with wrong scope
# (e.g., link-local multicast arriving on a routed interface)
ipv6.dst == ff02::/16 and ipv6.hlim > 1

# Detect multicast flooding (unexpected ports receiving multicast)
ipv6.dst == ff3e::db8:1
```

## Wireshark Statistics for Multicast Analysis

Use **Statistics → IPv6 Address Statistics** and **Statistics → Conversations** to analyze multicast traffic patterns:

```bash
# tshark: Count MLD reports per host
tshark -r capture.pcap -Y 'icmpv6.type == 143' \
    -T fields -e ipv6.src | sort | uniq -c | sort -rn

# tshark: List all multicast groups joined
tshark -r capture.pcap -Y 'icmpv6.type == 143' \
    -T fields -e icmpv6.mldr.mar.multicast_address 2>/dev/null | \
    sort -u

# tshark: Measure MLD query interval
tshark -r capture.pcap -Y 'icmpv6.type == 130 and ipv6.dst == ff02::1' \
    -T fields -e frame.time_relative | head -10
```

## Common Wireshark Findings and Diagnoses

| Finding | Diagnosis |
|---|---|
| No MLD queries | No MLD querier present (check routers) |
| No MLD reports | Hosts not joining groups or snooping issue |
| PIM hellos but no Join/Prune | No active receivers on this segment |
| High MLD report rate | MLD query interval too short |
| Multicast traffic not flowing | Check PIM state with `show ipv6 mroute` |

## Saving Useful Capture Profiles

Create a Wireshark profile for IPv6 multicast:

1. **Edit → Configuration Profiles → New**: Name it "IPv6-Multicast"
2. Set **Coloring Rules**:
   - MLD messages → light blue
   - PIM messages → light green
   - Multicast data → yellow
3. Set **Columns**: Add "IPv6 Destination" column

## Summary

Wireshark's display filter language makes IPv6 multicast debugging efficient. Use `icmpv6.type == 130/131/132/143` for MLD messages, `pim` for PIM protocol, and `ipv6.dst == ff00::/8` for all multicast traffic. Analyze MLDv2 group records to understand source-specific joins, and use tshark for scripted multicast flow analysis.
