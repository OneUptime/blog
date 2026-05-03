# How to Debug IPv6 Multicast Issues with tcpdump

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Multicast, tcpdump, Packet Capture, Network Debugging

Description: A practical guide to using tcpdump to capture and analyze IPv6 multicast traffic including MLD messages, PIM packets, and multicast data streams.

## Basic IPv6 Multicast Capture

```bash
# Capture all IPv6 multicast traffic on eth0

tcpdump -i eth0 -n 'ip6 multicast'

# Capture all IPv6 traffic (includes multicast)
tcpdump -i eth0 -n ip6

# Capture on all interfaces (requires privilege)
tcpdump -i any -n ip6
```

## Capturing MLD Messages

```bash
# Capture all MLD messages (ICMPv6 types 130, 131, 132, 143)
# MLD uses ICMPv6 - filter by destination (multicast)
tcpdump -i eth0 -n 'ip6 and icmp6'

# More specific: capture only MLD query and report messages.
# RFC 2710 / RFC 3810 require MLD messages to carry an IPv6 Hop-by-Hop
# Options header with the Router Alert option, so the ICMPv6 header
# starts at byte offset 48 (40-byte IPv6 header + 8-byte HBH option),
# not 40. ip6[40] is the HBH Next Header field (58 = ICMPv6) and
# ip6[48] is the ICMPv6 type. (libpcap's icmp6/icmp6[icmp6type]
# primitives do not chase IPv6 extension headers, so the explicit
# byte offsets are required.)
# Type 130 = General Query, 131 = v1 Report, 132 = Done, 143 = v2 Report
tcpdump -i eth0 -n 'ip6[40] == 58 and (ip6[48] == 130 or ip6[48] == 131 or ip6[48] == 132 or ip6[48] == 143)'

# Capture MLD queries only
tcpdump -i eth0 -n 'ip6[40] == 58 and ip6[48] == 130'

# Capture MLD reports only
tcpdump -i eth0 -n 'ip6[40] == 58 and (ip6[48] == 131 or ip6[48] == 143)'

# Verbose output showing full MLD details
tcpdump -i eth0 -vvn 'ip6[40] == 58 and ip6[48] == 130'
```

## Capturing PIM Messages

```bash
# PIM uses IP protocol 103
tcpdump -i eth0 -n 'ip6 proto 103'

# PIM with verbose decode
tcpdump -i eth0 -vvn 'ip6 proto 103'

# PIM Hello messages. Per RFC 7761, byte 0 of the PIM header packs
# Version (high 4 bits) and Type (low 4 bits); byte 1 is Reserved.
# With no IPv6 extension headers, the PIM header starts at byte 40,
# so mask the low nibble of ip6[40] to test the type.
tcpdump -i eth0 -n 'ip6 proto 103 and (ip6[40] & 0x0f) == 0'

# Capture PIM Register messages (type 1)
tcpdump -i eth0 -n 'ip6 proto 103 and (ip6[40] & 0x0f) == 1'
```

## Capturing Traffic to Specific Multicast Groups

```bash
# Capture traffic to a specific multicast group
tcpdump -i eth0 -n 'ip6 dst ff3e::db8:1234'

# Capture traffic to all link-local multicast groups
tcpdump -i eth0 -n 'ip6 dst net ff02::/16'

# Capture traffic to all IPv6 multicast (ff::/8)
# Note: tcpdump may not support ff::/8 directly, use host filter
tcpdump -i eth0 -n 'ip6[24] == 0xff'
# (checks first byte of IPv6 destination = 0xff = multicast)

# Capture NDP (Neighbor Solicitation/Advertisement using solicited-node multicast)
tcpdump -i eth0 -n 'icmp6 and (ip6[40] == 135 or ip6[40] == 136)'
```

## Saving Captures for Analysis

```bash
# Capture to file with timestamps
tcpdump -i eth0 -n -w /tmp/multicast.pcap 'ip6 multicast'

# Capture with nanosecond timestamp precision (libpcap >= 1.5)
tcpdump -i eth0 -n --time-stamp-precision=nano -w /tmp/multicast.pcap 'ip6 multicast'

# Limit capture size to 100MB
tcpdump -i eth0 -n -C 100 -w /tmp/multicast.pcap 'ip6 multicast'

# Capture 10,000 packets and stop
tcpdump -i eth0 -n -c 10000 -w /tmp/multicast.pcap 'ip6 and icmp6'
```

## Reading and Filtering Saved Captures

```bash
# Read a saved capture file
tcpdump -r /tmp/multicast.pcap -n

# Apply filter to saved capture (MLD General Query: HBH next header
# is ICMPv6 (58) and the ICMPv6 type byte at offset 48 is 130)
tcpdump -r /tmp/multicast.pcap -n 'ip6[40] == 58 and ip6[48] == 130'

# Extract MLD queries from capture
tcpdump -r /tmp/multicast.pcap -n 'ip6[40] == 58 and ip6[48] == 130' | head -20

# Count MLD queries
tcpdump -r /tmp/multicast.pcap -n 'ip6[40] == 58 and ip6[48] == 130' | wc -l
```

## Diagnosing Common Issues with tcpdump

### No multicast data reaching a host

```bash
# On the receiver: check if multicast is arriving at eth0
tcpdump -i eth0 -n 'ip6 dst ff3e::db8:1234'
# No output = traffic not arriving at this interface

# Check on the uplink (WAN) interface
tcpdump -i eth1 -n 'ip6 dst ff3e::db8:1234'
```

### MLD reports not being generated

```bash
# Verify the host is sending MLD reports after joining
# Start capture first, then join the group
tcpdump -i eth0 -n 'ip6[40] == 58 and ip6[48] == 143' &
python3 join_mcast.py ff3e::db8:5678 eth0
# Should see an MLD v2 Report immediately
```

### MLD queries not answered

```bash
# Capture queries and responses together
tcpdump -i eth0 -n 'ip6[40] == 58 and (ip6[48] == 130 or ip6[48] == 143)' \
    -l | awk '{
    if ($0 ~ /multicast listener query/)
        print "QUERY: " $0
    else if ($0 ~ /multicast listener report/)
        print "REPORT: " $0
}'
```

## Useful tcpdump One-Liners for Multicast Troubleshooting

```bash
# Monitor MLD membership changes in real-time
tcpdump -i eth0 -n 'ip6[40] == 58 and (ip6[48] == 131 or ip6[48] == 132 or ip6[48] == 143)' \
    -l | while read line; do echo "$(date +%H:%M:%S) $line"; done

# Count multicast packets per group
tcpdump -i eth0 -n 'ip6[24] == 0xff' -l 2>/dev/null | \
    awk '{print $5}' | sort | uniq -c | sort -rn | head -20

# Check multicast hop limit (should be > 1 for forwarded traffic)
tcpdump -i eth0 -n 'ip6[24] == 0xff' -vv 2>/dev/null | grep -E 'hlim|dst ff'
```

## Summary

`tcpdump` with IPv6 multicast filters enables rapid diagnosis of multicast issues. Because MLD packets carry a Hop-by-Hop Router Alert option, use `ip6[40] == 58 and ip6[48] == 130` for MLD queries and `ip6[48] == 143` for MLDv2 reports; use `ip6 proto 103` for PIM. Filter by destination group with `ip6 dst <group>`. Save captures to `.pcap` files for detailed analysis in Wireshark. The one-liner monitoring scripts provide continuous visibility into multicast membership changes.
