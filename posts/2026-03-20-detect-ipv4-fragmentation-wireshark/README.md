# How to Detect IPv4 Fragmentation in Wireshark

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Fragmentation, Wireshark, Packet Analysis, MTU, Networking

Description: Use Wireshark display filters and analysis features to identify fragmented IPv4 packets, locate fragmentation points, and diagnose MTU-related issues.

## Introduction

Wireshark provides the clearest view of IPv4 fragmentation: it shows individual fragments, their offsets, whether reassembly succeeded, and how the fragments relate to each other. When you suspect an MTU issue or see unexplained packet loss, Wireshark fragmentation analysis reveals exactly where the problem is.

## Wireshark Display Filters for Fragmentation

```text
# Show fragmented packets (any fragment):

ip.flags.mf == 1 or ip.frag_offset > 0

# Show only first fragments (MF bit set, offset = 0):
ip.flags.mf == 1 and ip.frag_offset == 0

# Show non-first fragments (offset > 0):
ip.frag_offset > 0

# Show the Don't Fragment bit set:
ip.flags.df == 1

# Show IPv4 packets larger than a standard Ethernet MTU:
ip.len > 1500

# Show fragmented packets from specific IP:
(ip.flags.mf == 1 or ip.frag_offset > 0) and ip.src == 10.20.0.5

# Show ICMP fragmentation needed (PMTUD):
icmp.type == 3 and icmp.code == 4
```

## Understanding Wireshark Fragment Display

```text
In the packet list, fragmented packets look like:

Frame 100: [First fragment, MF bit set]
  Internet Protocol: src=10.0.0.1, dst=10.0.0.2
    Fragment Offset: 0
    Flags: More Fragments = 1, DF = 0
    Total Length: 1500

Frame 101: [Second fragment, last]
  Internet Protocol: src=10.0.0.1, dst=10.0.0.2
    Fragment Offset: 185 (185 × 8 = 1480 bytes)
    Flags: More Fragments = 0, DF = 0

With IPv4 reassembly enabled, Wireshark links the fragments together and
shows the reassembled upper-layer payload in the packet where reassembly
completes (typically the last fragment), rather than creating a new frame.
```

## Find Where Fragmentation Occurs

```bash
# If you capture at both sender and receiver:
# Sender capture: large unfragmented packet (if sender MTU is large)
# Receiver capture: fragmented packets
# → Fragmentation occurring at router between them

# If you capture at router ingress and egress:
# Ingress: large unfragmented packet
# Egress: fragmented packets
# → This router is fragmenting (its outbound link has lower MTU)

# To find fragmentation point:
# 1. Capture at source: no fragmentation?
# 2. Capture at intermediate hop: fragmentation starts here?
# 3. The link after the first point where fragmentation appears = bottleneck
```

## Test Fragmentation with tcpdump

```bash
# Generate fragmented traffic for testing:
# On a 1500-byte IPv4 MTU path, payload size > 1472 causes fragmentation:
ping -4 -M dont -s 2000 -c 5 10.20.0.5

# Capture the fragments:
tcpdump -i eth0 -n -v 'host 10.20.0.5 and (ip[6:2] & 0x3fff) != 0'

# Expected pattern in verbose output:
# - First fragment: offset 0, flags [+] (MF set)
# - Later fragment(s): non-zero offset
# - Last fragment: non-zero offset, MF cleared
```

## Wireshark Expert Information for Fragmentation

```text
In Wireshark:
  Analyze → Expert Info

Look for:
  - Reassembly-related notes from the IPv4 dissector
  - "Reassembled IPv4 in frame" links showing where reassembly completed
  - Overlapping-fragment warnings
  - Other malformed-fragmentation warnings

Statistics → IPv4 Statistics → All Addresses
Shows: packet and byte counts by IPv4 address
```

## Identify MTU Black Holes

```bash
# MTU black hole: host sends packets with DF bit set
# Router on path needs to fragment but CAN'T (DF bit set)
# Router should send ICMP Fragmentation Needed (type 3, code 4)
# But if ICMP is blocked: packet is silently dropped

# Detect black holes in Wireshark:
# Filter: tcp and ip.len > 1400 and ip.flags.df == 1
# If you see SYN packets succeeding but data transfer hanging:
# → Large TCP packets with DF bit are being dropped by a black hole router

# Also watch for:
# tcp.analysis.retransmission   (retransmits of specific size packets)
# Correlate with IP length: if only larger IP packets are retransmitted → black hole
```

## Conclusion

Wireshark fragmentation analysis uses two primary filters: `ip.flags.mf == 1 or ip.frag_offset > 0` to find all fragments, and `icmp.type == 3 and icmp.code == 4` to find PMTUD fragmentation needed messages. If packets are unfragmented at one capture point and fragmented at the next, fragmentation happened between those points because the outbound MTU is smaller than the original packet. MTU black holes are detected by large packets with DF bit being silently dropped - watch for retransmissions only affecting larger IP packets. Fix by reducing MTU, reducing TCP MSS or enabling MSS clamping, or ensuring ICMP fragmentation needed messages are not blocked.
