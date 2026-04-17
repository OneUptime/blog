# How to Generate IPv6 Conversation Statistics in Wireshark

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Wireshark, IPv6, Statistics, Conversation, Traffic Analysis, Network Forensics

Description: A guide to generating and interpreting IPv6 conversation statistics in Wireshark to identify the busiest talkers, top endpoints, and unusual traffic patterns.

Wireshark's Statistics menu provides conversation and endpoint analysis tools that summarize IPv6 traffic by address pair, giving you a quick overview of who is communicating with whom and how much data is being transferred.

## Accessing IPv6 Conversation Statistics

1. Open Wireshark with a capture file or live capture
2. Go to **Statistics → Conversations**
3. Click the **IPv6** tab

The conversations table shows:
- Source and destination IPv6 addresses
- Total packets and bytes in each direction
- Duration of the conversation
- Relative start time

## Filtering the Conversations View

In the Conversations window:
- Click **Limit to display filter** to apply your current display filter to the statistics
- Double-click any conversation to jump to it in the main packet list
- Right-click → **Apply as Filter** to create a filter for that conversation

## Using tshark for IPv6 Conversation Statistics

```bash
# Generate IPv6 conversation statistics from a pcap file

tshark -r capture.pcap -q -z conv,ipv6

# Example output:
# IPv6 Conversations
# Filter:<No Filter>
#                                                Frames Bytes  Frames Bytes  Frames Bytes
# 2001:db8::10          <-> 2001:db8::20             45 58932     62 91028    107 149960
```

## Top IPv6 Endpoints

```bash
# List top IPv6 endpoints by bytes
tshark -r capture.pcap -q -z endpoints,ipv6

# Sort by total bytes (column 3 is bytes)
tshark -r capture.pcap -q -z endpoints,ipv6 | \
  sort -k3 -rn | head -20
```

## IPv6 Conversations with Display Filter

```bash
# Conversations only for HTTPS traffic
tshark -r capture.pcap -q -z conv,ipv6 \
  -Y "tcp.port == 443 && ipv6"

# Conversations for a specific subnet
tshark -r capture.pcap -q -z conv,ipv6 \
  -Y "ipv6.addr == 2001:db8:1::/64"
```

## Identify Top IPv6 Talkers (Most Bytes)

```bash
# Extract IPv6 source/destination pairs with byte counts
tshark -r capture.pcap -Y "ipv6" \
  -T fields \
  -e ipv6.src \
  -e ipv6.dst \
  -e frame.len | \
  awk '{bytes[$1" "$2] += $3} END {for (pair in bytes) print bytes[pair], pair}' | \
  sort -rn | head -20
```

## Protocol Distribution Over IPv6

```bash
# Count protocols carried over IPv6
tshark -r capture.pcap -Y "ipv6" \
  -T fields -e ipv6.nxt | \
  awk '{
    if ($1 == 6) proto="TCP"
    else if ($1 == 17) proto="UDP"
    else if ($1 == 58) proto="ICMPv6"
    else proto="Other("$1")"
    count[proto]++
  }
  END {for (p in count) print count[p], p}' | \
  sort -rn
```

## Find Unusual IPv6 Conversations (Security Use Case)

```bash
# Find IPv6 conversations with very high packet counts (potential scan/attack)
# Column layout: $1 src, $2 "<->", $3 dst, $4-5 <- frames/bytes,
# $6-7 -> frames/bytes, $8 total frames, $9 total bytes,
# $10 rel start, $11 duration
tshark -r capture.pcap -q -z conv,ipv6 | \
  awk 'NR>5 {if ($8 > 10000) print $0}' | \
  sort -k8 -rn | head -10

# Find short-duration, high-packet-count conversations (port scans)
tshark -r capture.pcap -q -z conv,ipv6 | \
  awk 'NR>5 {if ($8 > 1000 && $11 < 10) print $0}'
```

## Export Conversation Data

```bash
# Export IPv6 conversation data to CSV for further analysis
tshark -r capture.pcap -q -z conv,ipv6 | \
  awk 'NR>5 && NF>0 {
    gsub(/<->/,"")
    print $1 "," $2 "," $3 "," $4 "," $5 "," $6 "," $7 "," $8
  }' > ipv6-conversations.csv
```

## Wireshark IO Graphs for IPv6 Traffic

1. Go to **Statistics → I/O Graph**
2. Add a plot with filter: `ipv6`
3. Add another plot: `ipv6 && tcp`
4. Compare IPv6 total vs IPv6 TCP to see protocol breakdown over time

IPv6 conversation statistics are the fastest way to identify the highest-volume communications in a capture, pinpoint unusual traffic patterns, and generate evidence for capacity planning or security investigations.
