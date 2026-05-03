# How to Debug SRv6 Issues with Wireshark

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SRv6, Wireshark, Debugging, Packet Analysis, Networking, Troubleshooting

Description: Use Wireshark to capture and analyze SRv6 packets, inspect Segment Routing Headers, verify SID processing, and diagnose forwarding failures.

## Introduction

Wireshark fully decodes SRv6 packets including the Segment Routing Header (SRH), segment lists, and TLV options. It is the most effective tool for visual SRv6 packet analysis.

## Step 1: Capture SRv6 Traffic

```bash
# Capture all IPv6 traffic with Routing Header (SRH)

# IPv6 Routing Header type = 43
sudo tcpdump -i eth0 -n -w /tmp/srv6_capture.pcap \
  "ip6 proto 43"

# Or capture by SRv6 locator prefix
sudo tcpdump -i eth0 -n -w /tmp/srv6_capture.pcap \
  "ip6 net 5f00::/16"

# Capture during a specific test
iperf3 -6 -c 5f00:3:1::1 -t 10 &
sudo tcpdump -i eth0 -c 1000 -w /tmp/srv6_test.pcap \
  "ip6 proto 43 or ip6 net 5f00::/16"
```

## Step 2: Wireshark Display Filters for SRv6

```text
# All SRv6 packets (Routing Header Type 4)
ipv6.routing.type == 4

# Packets with specific SID as destination
ipv6.dst == 5f00:1:2:0:e001::

# SRv6 packets with SL > 0 (still traversing)
ipv6.routing.seg_left > 0

# SRv6 packets that have reached the final SID (SL = 0)
ipv6.routing.seg_left == 0

# All SRH packets from a specific locator
ipv6.src matches "5f00:1:.*"

# SRv6 with specific segment in the list
ipv6.routing.srh.sid contains 5f00:2:3:
```

## Step 3: Inspect SRH Fields in Wireshark

When you open a capture, expand the packet tree:
```text
Frame N
└─ Ethernet II
└─ Internet Protocol Version 6
   ├─ Source: 5f00:1:1::1
   ├─ Destination: 5f00:2:3:0:e001::
   └─ Routing Header (Type 4)
      ├─ Next Header: TCP (6)
      ├─ Hdr Ext Len: 6  (6×8 + 8 = 56 bytes)
      ├─ Routing Type: Segment Routing (4)
      ├─ Segments Left: 1
      ├─ Last Entry: 2
      ├─ Flags: 0x00
      ├─ Tag: 0x0000
      ├─ Segment List[0]: 5f00:3:1:0:e000::   (final)
      ├─ Segment List[1]: 5f00:2:3:0:e001::   (current)
      └─ Segment List[2]: 5f00:1:2:0:e001::   (already visited)
```

## Step 4: Automated Analysis with tshark

```bash
# Extract SRH details from all packets
tshark -r /tmp/srv6_capture.pcap \
  -Y "ipv6.routing.type == 4" \
  -T fields \
  -e frame.number \
  -e ipv6.src \
  -e ipv6.dst \
  -e ipv6.routing.seg_left \
  -e ipv6.routing.srh.sid \
  -E header=y

# Count packets per SID destination
tshark -r /tmp/srv6_capture.pcap \
  -Y "ipv6.routing.type == 4" \
  -T fields -e ipv6.dst | sort | uniq -c | sort -rn

# Check for SRH processing errors (ICMPv6 parameter problem)
tshark -r /tmp/srv6_capture.pcap \
  -Y "icmpv6.type == 4" \
  -T fields -e icmpv6.type -e icmpv6.code -e ipv6.src
```

## Step 5: Common SRv6 Issues Visible in Wireshark

### Issue 1: Packet Looping (SL Never Decrements)

```javascript
Symptom: Multiple packets with same SL value
Cause: SID not recognized by endpoint node
Fix: Verify End function is configured for the SID
```

### Issue 2: ICMPv6 "Routing Header Problem" (Type 4, Code 0)

```text
Filter: icmpv6.type == 4 and icmpv6.code == 0
Cause: SRH processing error at an intermediate node
Common causes:
  - Segments Left > Last Entry (malformed SRH)
  - First SID in list is not the packet destination
  - HMAC verification failure
```

### Issue 3: SRH Not Being Added (Missing Service Chain)

```text
Filter: ipv6.dst == 5f00:3:1::1 and not ipv6.routing.type == 4
Cause: Ingress encap route not matching or installed
Fix: Check "ip -6 route show | grep seg6"
```

## Step 6: Protocol Stats in Wireshark

```text
Statistics → Protocol Hierarchy:
  Look for "IPv6 Routing Header" percentage

Statistics → Conversations → IPv6:
  Check SID addresses in source/destination columns

Statistics → Endpoints → IPv6:
  Identify which SIDs are seeing the most traffic
```

## Conclusion

Wireshark's SRv6 support provides visual inspection of SRH fields, segment lists, and SID processing states. Combined with tshark for scripted analysis, it enables rapid SRv6 path debugging. Use these captures alongside OneUptime's availability monitoring to correlate packet-level SRv6 failures with application-level impact.
