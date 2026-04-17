# How to Use Wireshark Expert Info for IPv6 Diagnostics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Wireshark, IPv6, Expert Info, Diagnostic, Packet Analysis, Troubleshooting

Description: A guide to using Wireshark's Expert Info feature to automatically identify IPv6 protocol issues, retransmissions, and anomalies without manually inspecting each packet.

Wireshark's Expert Information system automatically analyzes captures and flags potential problems, warnings, and informational events. For IPv6, it can detect fragmentation issues, ICMPv6 errors, TCP retransmissions over IPv6, and malformed packets.

## Accessing Expert Info

1. Go to **Analyze → Expert Information** (or click the expert level indicator in the lower-left of the main status bar)
2. A dialog appears with flagged events grouped by severity:
   - **Error** (red): Protocol violations, malformed packets
   - **Warn** (yellow): Possible issues, retransmissions
   - **Note** (cyan): Interesting events
   - **Chat** (blue): Normal protocol messages

## Filtering Expert Info for IPv6

In the Expert Info dialog:
- Check **Limit to display filter** while an IPv6 filter is active
- This shows only Expert Info events from IPv6 packets

Apply a filter first:
```wireshark
ipv6
```
Then open Expert Info to see only IPv6-related events.

## Common IPv6 Expert Info Events

### ICMPv6 Errors

Expert Info automatically highlights:
- ICMPv6 Destination Unreachable (Type 1)
- ICMPv6 Packet Too Big (Type 2) - indicates PMTUD events
- ICMPv6 Time Exceeded (Type 3) - traceroute or routing loops
- ICMPv6 Parameter Problem (Type 4) - malformed header

```wireshark
# Filter to see only ICMPv6 errors flagged by Expert Info

icmpv6.type <= 4

# Check Expert Info for PMTUD events
icmpv6.type == 2
```

### TCP Over IPv6 Retransmissions

Expert Info flags TCP issues over IPv6 just like IPv4:

```wireshark
# Show retransmitted TCP segments over IPv6
tcp.analysis.retransmission && ipv6

# Show TCP fast retransmissions over IPv6
tcp.analysis.fast_retransmission && ipv6

# Show zero-window conditions over IPv6 TCP
tcp.analysis.zero_window && ipv6

# Show duplicate ACKs (might indicate packet loss)
tcp.analysis.duplicate_ack && ipv6
```

### IPv6 Fragment Issues

```wireshark
# Show fragment reassembly errors
_ws.expert && ipv6.fraghdr

# Show overlapping fragments (security concern)
_ws.expert.message contains "overlap"
```

## Using Expert Info with tshark

```bash
# Get all Expert Info events from an IPv6 capture
tshark -r capture.pcap -Y "_ws.expert && ipv6" \
  -T fields -e frame.number -e _ws.expert.message | head -40

# Count errors by severity (optionally filter to IPv6 packets)
tshark -r capture.pcap -q -z expert
tshark -r capture.pcap -q -z "expert,note,ipv6"
```

## Expert Info Filter Examples

```wireshark
# Show all expert info items
_ws.expert

# Show only errors
_ws.expert.severity == error

# Show only warnings
_ws.expert.severity == warn

# Show expert info for IPv6 only
_ws.expert && ipv6

# Show specific expert message categories
_ws.expert.group == "Malformed"
_ws.expert.group == "Sequence"
_ws.expert.group == "Reassembly"
```

## Interpreting IPv6 Expert Info Events

| Expert Info Event | Likely Meaning | Action |
|---|---|---|
| ICMPv6 Packet Too Big | PMTUD event - MTU mismatch | Check MTU on all path segments |
| ICMPv6 Time Exceeded | TTL/hop limit exhausted | Check routing loops or too many hops |
| ICMPv6 Destination Unreachable | Route or host unreachable | Check routing table and firewall |
| IPv6 fragment overlap | Possible fragmentation attack | Investigate source IP |
| TCP retransmission (IPv6) | Packet loss on IPv6 path | Compare with IPv4 path quality |
| Malformed Packet | Corrupted or invalid header | Check NIC, driver, or tunnel endpoint |

## Generate a Diagnostic Summary Report

```bash
#!/bin/bash
# ipv6-expert-report.sh - Generate an Expert Info summary for an IPv6 capture

PCAP="$1"
echo "=== IPv6 Expert Info Report ==="
echo "File: $PCAP"
echo ""

# Summary statistics
tshark -r "$PCAP" -q -z expert | grep -A 100 "Groups"

echo ""
echo "=== IPv6 Error Details ==="
tshark -r "$PCAP" -Y "_ws.expert.severity == error && ipv6" \
  -T fields -e frame.number -e _ws.expert.message \
  -E header=y -E separator="|"
```

Wireshark's Expert Info provides a quick, automated first-pass analysis of IPv6 captures - surfacing the most important protocol issues without requiring you to manually examine thousands of packets.
