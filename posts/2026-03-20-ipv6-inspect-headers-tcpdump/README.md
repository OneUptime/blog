# How to Inspect IPv6 Packet Headers with tcpdump

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, tcpdump, Debugging, Networking, Packet Analysis

Description: Use tcpdump to capture and inspect IPv6 packet headers, including filtering by address, protocol, flow label, hop limit, and extension headers.

## Introduction

`tcpdump` is the essential command-line tool for IPv6 packet inspection. Understanding how to filter and interpret IPv6 headers from tcpdump output is a core network troubleshooting skill. This guide covers the most useful filters, output formats, and techniques for IPv6 header analysis.

## Basic IPv6 Capture

```bash
# Capture all IPv6 traffic on eth0

sudo tcpdump -i eth0 ip6

# Verbose output (shows header fields)
sudo tcpdump -i eth0 -v ip6

# Very verbose (shows all fields including traffic class, flow label)
sudo tcpdump -i eth0 -vv ip6

# Include hex dump of packet bytes
sudo tcpdump -i eth0 -X ip6

# Save to pcap file for later analysis
sudo tcpdump -i eth0 -w /tmp/ipv6.pcap ip6

# Read from pcap file
tcpdump -r /tmp/ipv6.pcap -vv
```

## Filtering IPv6 Traffic

```bash
# Filter by specific IPv6 address (source or destination)
sudo tcpdump -i eth0 ip6 and host 2001:db8::1

# Filter by source address
sudo tcpdump -i eth0 "ip6 src 2001:db8::1"

# Filter by destination address
sudo tcpdump -i eth0 "ip6 dst 2001:db8::2"

# Filter by source network prefix
sudo tcpdump -i eth0 "ip6 src net 2001:db8::/32"

# Filter by protocol (TCP, UDP, ICMPv6)
sudo tcpdump -i eth0 ip6 and tcp
sudo tcpdump -i eth0 ip6 and udp
sudo tcpdump -i eth0 icmp6

# Filter ICMPv6 by type (for packets without IPv6 extension headers)
# Type 128 = Echo Request (ping6)
# Type 134 = Router Advertisement
# Type 135 = Neighbor Solicitation
sudo tcpdump -i eth0 "icmp6 and ip6[40] == 128"  # Ping requests
sudo tcpdump -i eth0 "icmp6 and ip6[40] == 134"  # Router Advertisements
sudo tcpdump -i eth0 "icmp6 and ip6[40] == 135"  # Neighbor Solicitations
```

## Filtering by IPv6 Header Fields

```bash
# IPv6 header field byte offsets:
# Byte 0-3:  Version(4) + Traffic Class(8) + Flow Label(20)
# Byte 4-5:  Payload Length
# Byte 6:    Next Header
# Byte 7:    Hop Limit
# Byte 8-23: Source Address
# Byte 24-39: Destination Address

# Filter by Next Header field (byte 6)
sudo tcpdump -i eth0 "ip6[6] == 6"   # TCP (Next Header = 6)
sudo tcpdump -i eth0 "ip6[6] == 17"  # UDP (Next Header = 17)
sudo tcpdump -i eth0 "ip6[6] == 58"  # ICMPv6 (Next Header = 58)
sudo tcpdump -i eth0 "ip6[6] == 0"   # Hop-by-Hop Options
sudo tcpdump -i eth0 "ip6[6] == 44"  # Fragment Header
sudo tcpdump -i eth0 "ip6[6] == 43"  # Routing Header

# Filter by Hop Limit field (byte 7)
sudo tcpdump -i eth0 "ip6[7] == 255"  # Useful when checking NDP; valid ND packets must have HL=255
sudo tcpdump -i eth0 "ip6[7] < 10"   # Low hop limit packets

# Filter by Traffic Class (DSCP + ECN)
# Traffic Class spans the low 4 bits of byte 0 and the high 4 bits of byte 1
# EF = DSCP 46 = 0x2E, Traffic Class = 0xB8
sudo tcpdump -i eth0 "(ip6[0:2] & 0x0ff0) == 0x0b80"  # EF-marked packets

# Filter by non-zero Flow Label (first 4 bytes, masked)
sudo tcpdump -i eth0 "(ip6[0:4] & 0x000fffff) != 0"
```

## Analyzing NDP Traffic

```bash
# Watch all NDP traffic
sudo tcpdump -i eth0 -vv "icmp6 and (ip6[40]==133 or ip6[40]==134 or ip6[40]==135 or ip6[40]==136 or ip6[40]==137)"

# Monitor Router Advertisements only
sudo tcpdump -i eth0 -vv "icmp6 and ip6[40] == 134"

# Monitor Neighbor Discovery (NS + NA)
sudo tcpdump -i eth0 -vv "icmp6 and (ip6[40]==135 or ip6[40]==136)"

# Example RA output:
# 20:00:00.000000 IP6 (hlim 255, next-header ICMPv6 (58), length 56)
# fe80::1 > ff02::1: ICMP6, router advertisement, length 56
#   hop limit 64, Flags [other stateful], pref medium, router lifetime 1800s
#   prefix info option (3), length 32 (4):
#     2001:db8:1::/64, Flags [onlink, auto], valid time 2592000s
```

## Analyzing DHCPv6

```bash
# Capture DHCPv6 traffic (ports 546 = client, 547 = server)
sudo tcpdump -i eth0 -vv "udp port 546 or udp port 547"

# Initial DHCPv6 client messages commonly use link-local source and multicast destination
# Client → ff02::1:2 (All_DHCP_Relay_Agents_and_Servers)
sudo tcpdump -i eth0 "ip6 dst ff02::1:2"
```

## Viewing IPv6 Extension Headers

```bash
# Capture IPv6 packets that contain a Fragment Header
sudo tcpdump -i eth0 "ip6 protochain 44"

# Capture packets that contain a Routing Header
sudo tcpdump -i eth0 "ip6 protochain 43"

# Capture with hex dump to see extension header contents
sudo tcpdump -i eth0 -XX "ip6 protochain 44" | head -30
```

## Useful tcpdump Output Interpretation

```text
Sample verbose output:
20:30:00.000000 IP6 (class 0x10, flowlabel 0x2a3b4, hlim 64, next-header TCP (6), length 60)
2001:db8::1.54321 > 2001:db8::2.443: Flags [S], seq 0, win 65535, options [mss 1440, sackOK, TS val 100 ecr 0], length 0

Fields:
  class 0x10      → Traffic Class = 0x10 (DSCP 4, ECN 0)
  flowlabel 0x2a3b4 → Flow Label = 0x2A3B4
  hlim 64         → Hop Limit = 64
  next-header TCP → Next Header = 6 (TCP)
  length 60       → Payload Length = 60 bytes
  Flags [S]       → SYN flag set
  options mss 1440 → MSS set to 1440 bytes
```

## Conclusion

`tcpdump` provides powerful IPv6 packet inspection through direct byte-offset filters for every header field. Key byte offsets to remember: byte 6 = Next Header, byte 7 = Hop Limit, bytes 8-23 = Source Address, bytes 24-39 = Destination Address. Combining these with protocol filters and the `-vv` flag gives you complete visibility into IPv6 packet headers for troubleshooting NDP, DHCPv6, fragmentation, and connectivity issues.
