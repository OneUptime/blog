# How to Analyze IPv6 Traffic Class and Flow Labels in Wireshark

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Wireshark, IPv6, Traffic Class, Flow Label, DSCP, QoS, Packet Analysis

Description: A guide to analyzing IPv6 Traffic Class and Flow Label fields in Wireshark to understand QoS markings and flow identification in network captures.

IPv6 headers include two fields for QoS and flow tracking: the **Traffic Class** (8 bits, equivalent to IPv4 ToS/DSCP) and the **Flow Label** (20 bits, for identifying flows requiring special handling). Wireshark decodes both fields in detail.

## IPv6 Header Fields

| Field | Size | IPv4 Equivalent | Purpose |
|---|---|---|---|
| Traffic Class | 8 bits | ToS/DSCP | QoS marking |
| Flow Label | 20 bits | No equivalent | Identify a specific flow |

### Traffic Class Sub-fields
- **DSCP (Differentiated Services Code Point)**: bits 0-5 - used for QoS
- **ECN (Explicit Congestion Notification)**: bits 6-7 - congestion signaling

## Display Filters for Traffic Class

```wireshark
# Show all IPv6 packets (Traffic Class is present in every IPv6 header)

ipv6

# Filter by specific Traffic Class value
ipv6.tclass == 0x00           # Best effort (default)
ipv6.tclass == 0xb8           # EF (Expedited Forwarding, DSCP 46)
ipv6.tclass == 0x28           # AF11 (DSCP 10)

# Filter by DSCP value specifically
ipv6.tclass.dscp == 46        # EF (VoIP priority)
ipv6.tclass.dscp == 0         # Best effort
ipv6.tclass.dscp > 0          # Any non-zero DSCP marking

# Filter by ECN bits
ipv6.tclass.ecn == 0          # Not ECN-capable
ipv6.tclass.ecn == 1          # ECT(1) - ECN-capable transport
ipv6.tclass.ecn == 2          # ECT(0) - ECN-capable transport
ipv6.tclass.ecn == 3          # CE - Congestion Experienced
```

## Display Filters for Flow Labels

```wireshark
# Show packets with a specific Flow Label value
ipv6.flow == 0x12345

# Show all packets with non-zero Flow Labels (flow-aware applications)
ipv6.flow > 0

# Show packets with zero Flow Label (no flow identification)
ipv6.flow == 0
```

## Analyzing QoS Markings

### Finding Remarked Packets

In a properly configured network, VoIP should have DSCP EF (46):

```wireshark
# Show VoIP traffic - should have DSCP EF (0xb8 traffic class)
(sip || rtp) && ipv6.tclass.dscp != 46

# Show interactive traffic that should have DSCP AF41 (34)
ipv6 && ipv6.tclass.dscp != 34 && tcp.dstport == 443
```

### Comparing Traffic Class Distribution

```bash
# Count packets per DSCP value to understand traffic mix
tshark -r capture.pcap -Y "ipv6" \
  -T fields -e ipv6.tclass.dscp | \
  sort -n | uniq -c | sort -rn
```

## Flow Label Analysis

```wireshark
# Find all unique Flow Labels in use (indicates flow-aware applications)
ipv6.flow > 0

# Group flows from a specific source
ipv6.src == 2001:db8::1 && ipv6.flow > 0

# Track a specific application flow
ipv6.flow == 0xABCDE
```

### Statistics: Flow Label Usage

```bash
# Extract all (src, dst, flow_label) tuples
tshark -r capture.pcap -Y "ipv6.flow > 0" \
  -T fields -e ipv6.src -e ipv6.dst -e ipv6.flow | \
  sort | uniq -c | sort -rn | head -20
```

## Practical Use: Verify QoS Policy Compliance

```wireshark
# VoIP packets should have EF marking (DSCP 46)
# Find VoIP packets WITHOUT correct marking
(sip || rtp) && ipv6 && ipv6.tclass.dscp != 46

# Interactive traffic should have DSCP AF41 (34)
# Find SSH/HTTPS without DSCP marking
(tcp.port == 22 || tcp.port == 443) && ipv6 && ipv6.tclass.dscp == 0
```

## Add Traffic Class as a Column

1. In Wireshark, right-click any column header → Column Preferences
2. Add a new column:
   - **Title**: `DSCP`
   - **Type**: Custom
   - **Fields**: `ipv6.tclass.dscp`

This makes QoS markings visible at a glance in the packet list.

Traffic Class and Flow Label analysis is essential for QoS troubleshooting and verifying that IPv6 traffic is correctly marked and handled throughout your network infrastructure.
