# How to Debug Extension Header Issues with Wireshark

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Wireshark, Extension Headers, Debugging, Packet Analysis

Description: Use Wireshark to capture, filter, and analyze IPv6 extension headers, decode their contents, and diagnose extension header-related connectivity problems.

## Introduction

Wireshark provides a rich graphical and filter-based interface for analyzing IPv6 extension headers that goes beyond what tcpdump can display. Its dissectors automatically decode each extension header type, making it easy to inspect routing headers, fragment headers, and options. This guide covers the most useful filters and techniques for extension header debugging.

## Key Wireshark Display Filters

```text
# Show all IPv6 traffic

ip.version == 6
ipv6

# Filter by extension header protocol
ipv6.fraghdr     # Fragment Header
ipv6.routing     # Routing Header
ipv6.hopopts     # Hop-by-Hop Options
ah               # Authentication Header
esp              # ESP

# Or filter by the IPv6 header's base Next Header field
ipv6.nxt == 44   # Fragment Header is first after the IPv6 header
ipv6.nxt == 43   # Routing Header is first after the IPv6 header
ipv6.nxt == 0    # Hop-by-Hop Options
ipv6.nxt == 51   # Authentication Header
ipv6.nxt == 50   # ESP

# Filter IPv6 packets that have common extension headers
ipv6.hopopts or ipv6.dstopts or ipv6.routing or ipv6.fraghdr or ah or esp or mipv6

# Find fragmented packets
ipv6.fraghdr

# Find the first fragment of a fragmented sequence
ipv6.fraghdr.offset == 0 and ipv6.fraghdr.more == 1

# Find the last fragment
ipv6.fraghdr.more == 0 and ipv6.fraghdr.offset != 0

# Filter by Fragment ID
ipv6.fraghdr.ident == 0x12345678

# Filter by Flow Label
ipv6.flow == 0x2a3b4

# Filter Routing Header by type
ipv6.routing.type == 2    # Type 2 (Mobile IPv6)
ipv6.routing.type == 0    # Type 0 (deprecated, security risk)
ipv6.routing.type == 4    # Type 4 (Segment Routing)
```

## Wireshark Capture Filter (BPF) for Extension Headers

These go in the "Capture filter" field to filter at capture time:

```text
# Capture packets whose first extension header is Fragment
ip6[6] == 44

# Capture packets with Hop-by-Hop (must immediately follow the IPv6 header)
ip6[6] == 0

# Capture packets with a Fragment Header anywhere in the IPv6 header chain
ip6 protochain 44

# Capture packets with common extension headers
ip6 protochain 0 or ip6 protochain 43 or ip6 protochain 44 or ip6 protochain 50 or ip6 protochain 51 or ip6 protochain 60

# Capture first or middle fragments when the Fragment Header is first after IPv6
ip6[6] == 44 and (ip6[43] & 0x01) != 0  # M flag set
```

## Setting Up a Wireshark Capture

```bash
# Capture common IPv6 extension headers to a file for Wireshark analysis
sudo tcpdump -i eth0 -w /tmp/ext-headers.pcap \
    "ip6 protochain 44 or ip6 protochain 43 or ip6 protochain 0 or ip6 protochain 51"

# Open in Wireshark
wireshark /tmp/ext-headers.pcap &

# Or use tshark (Wireshark command line) for scripted analysis
tshark -r /tmp/ext-headers.pcap -Y "ipv6.fraghdr" \
    -T fields -e frame.number -e ipv6.src -e ipv6.dst \
    -e ipv6.fraghdr.ident -e ipv6.fraghdr.offset \
    -e ipv6.fraghdr.more
```

## Analyzing Fragment Reassembly

Wireshark can automatically reassemble fragments and show the reassembled packet:

```bash
# tshark: show fragment reassembly information
tshark -r capture.pcap -Y "ipv6.fraghdr" \
    -T fields \
    -e frame.number \
    -e ipv6.src \
    -e ipv6.dst \
    -e ipv6.fraghdr.ident \
    -e ipv6.fraghdr.offset \
    -e ipv6.fraghdr.more \
    -e ipv6.fragment.overlap \
    -e ipv6.fragments \
    -e ipv6.reassembled.length

# Enable IPv6 reassembly in tshark
tshark -2 -r capture.pcap \
    -o "ipv6.reassemble_fragments:TRUE" \
    -Y "ipv6.reassembled.in"  # Show reassembled packets
```

## Debugging Routing Header Issues

```bash
# Find all packets with Routing Headers
tshark -r capture.pcap -Y "ipv6.routing" \
    -T fields \
    -e frame.number \
    -e ipv6.src \
    -e ipv6.dst \
    -e ipv6.routing.type \
    -e ipv6.routing.segleft

# Check for deprecated Type 0 routing headers
tshark -r capture.pcap -Y "ipv6.routing.type == 0" \
    -T text
# These should not exist in production traffic
```

## Wireshark Coloring Rules for Extension Headers

Add these coloring rules in Edit → Coloring Rules to visually highlight extension headers:

```text
Rule name: IPv6 Fragment
Filter: ipv6.fraghdr
Background: Orange
Foreground: Black

Rule name: IPv6 with Extension Headers
Filter: ipv6.hopopts or ipv6.dstopts or ipv6.routing or ipv6.fraghdr or ah or esp or mipv6
Background: Light blue
Foreground: Black

Rule name: Deprecated RH0
Filter: ipv6.routing.type == 0
Background: Red
Foreground: White
```

## Diagnosing Connectivity Issues from Extension Header Drops

```bash
# Scenario: HTTPS connections work for small data but fail for large transfers
# Suspect: Fragment Header being dropped

# Step 1: Capture traffic during the failure
sudo tcpdump -i eth0 -w /tmp/debug.pcap host 2001:db8::1

# Step 2: Open in Wireshark and look for ICMPv6 Packet Too Big
tshark -r /tmp/debug.pcap -Y "icmpv6.type == 2" \
    -T fields -e ipv6.src -e ipv6.dst \
    -e icmpv6.mtu

# Step 3: Check if fragments are being created but not received
tshark -r /tmp/debug.pcap -Y "ipv6.fraghdr"
# Count outgoing fragments vs reassembled packets

# Step 4: Check for ICMPv6 Time Exceeded (fragment reassembly timeout)
tshark -r /tmp/debug.pcap -Y "icmpv6.type == 3 and icmpv6.code == 1"
```

## Conclusion

Wireshark's IPv6 dissectors provide detailed visibility into every extension header type, with automatic fragment reassembly and rich filtering capabilities. The display filters `ipv6.fraghdr` (fragment), `ipv6.routing.type` (routing type), and `ipv6.hopopts` / `ipv6.dstopts` are the most commonly needed for extension header debugging. When diagnosing mysterious IPv6 connectivity failures, always look for ICMPv6 Packet Too Big messages (type 2) and fragment header drops, as these are the most common causes of "works with small packets but fails with large data" symptoms.
