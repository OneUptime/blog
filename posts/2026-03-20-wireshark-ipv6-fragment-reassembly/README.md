# How to Analyze IPv6 Fragment Reassembly in Wireshark

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Wireshark, IPv6, Fragmentation, Reassembly, MTU, Packet Analysis

Description: A guide to analyzing IPv6 fragmentation and reassembly in Wireshark, including identifying fragmented packets, tracking fragment identifiers, and diagnosing PMTUD failures.

IPv6 fragmentation is performed only by the source host (not intermediate routers). Wireshark's fragment reassembly feature reassembles IPv6 fragments automatically, allowing you to analyze the complete payload even in fragmented captures.

## Display Filters for IPv6 Fragments

```wireshark
# Show all packets with IPv6 Fragment extension header

ipv6.fraghdr

# Show only FIRST fragment (offset=0, more fragments=1)
ipv6.fraghdr.offset == 0 && ipv6.fraghdr.more == 1

# Show MIDDLE fragments (offset > 0, more=1)
ipv6.fraghdr.offset > 0 && ipv6.fraghdr.more == 1

# Show LAST fragment (more=0, offset > 0)
ipv6.fraghdr.more == 0 && ipv6.fraghdr.offset > 0

# Show all fragments with the same identification value
ipv6.fraghdr.ident == 0xabcd1234
```

## Tracking a Complete Fragment Stream

To follow all fragments belonging to the same original datagram:

1. Click on any fragment packet
2. Note the **Fragment Identification** value in the ICMPv6/Extension Headers section
3. Apply filter: `ipv6.fraghdr.ident == <id>`

Or in the packet details:
- Expand **Internet Protocol Version 6 → Fragment Header**
- Right-click **Identification** → **Apply as Filter → Selected**

## Wireshark Reassembly Settings

Enable automatic fragment reassembly (on by default):
1. Go to **Edit → Preferences → Protocols → IPv6**
2. Ensure **Reassemble fragmented IPv6 datagrams** is checked
3. Click OK

When reassembly is enabled, the **last** fragment's packet in the list shows the reassembled payload (e.g., "Reassembled IPv6" in the detail pane).

## Diagnosing PMTU Discovery Issues

IPv6 Path MTU Discovery uses ICMPv6 "Packet Too Big" messages. If PMTUD fails, connections stall:

```wireshark
# Show ICMPv6 Packet Too Big messages
icmpv6.type == 2

# Show Packet Too Big and the associated fragmented traffic together
icmpv6.type == 2 || ipv6.fraghdr

# Find the MTU value reported in Packet Too Big
icmpv6.type == 2
# Expand: ICMPv6 → MTU to see the suggested MTU
```

## Identifying Fragmentation Caused by Tunnels

Tunnels (6in4, GRE, IPIP) reduce effective MTU, causing fragmentation:

```wireshark
# Show IPv6-in-IPv4 tunnel traffic that contains fragments
ip.proto == 41 && ipv6.fraghdr

# Show GRE-encapsulated IPv6 fragments
gre && ipv6.fraghdr
```

## Statistics: Fragment vs Non-Fragment Ratio

```bash
# Count fragmented vs non-fragmented IPv6 packets
tshark -r capture.pcap -Y "ipv6" -T fields -e ipv6.fraghdr.ident | \
  awk 'NF>0{frag++} NF==0{nonfrag++} END{print "Fragmented:", frag, "Non-fragmented:", nonfrag}'
```

## Common Fragment-Related Issues

| Symptom | Wireshark Indicator | Likely Cause |
|---|---|---|
| Large first fragment, no reassembly | `ipv6.fraghdr.more == 1` but no final fragment | Firewall blocking fragments |
| ICMPv6 type 2 received | `icmpv6.type == 2` | PMTUD message (MTU too small) |
| Duplicate fragment IDs | Same `ipv6.fraghdr.ident` from the same source/dest pair with overlapping offsets | Fragmentation overlap attack (RFC 5722) |
| Tiny fragment size | `frame.len < 100 && ipv6.fraghdr` | Fragmentation attack / tiny fragmentation |

## Checking for Fragment-Based Attacks

```wireshark
# Very small fragments (possible tiny fragment attack)
ipv6.fraghdr && frame.len < 100

# Overlapping fragments (fragment offset less than expected)
# Hard to detect directly, but watch for:
ipv6.fraghdr && ipv6.fraghdr.offset < 8 && ipv6.fraghdr.more == 1
```

Wireshark's automatic fragment reassembly makes it possible to analyze the complete application-layer content of fragmented IPv6 traffic, while its fragment-specific display filters enable targeted analysis of fragmentation behavior and PMTUD issues.
