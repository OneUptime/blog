# How to Use Wireshark Display Filters for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Wireshark, Display Filters, Packet Analysis, Network Diagnostics, Security

Description: Write effective Wireshark display filters for IPv6 traffic analysis including address filtering, protocol filtering, and complex compound expressions.

## Introduction

Wireshark display filters allow you to selectively show packets from captured traffic without discarding the capture. IPv6 display filters use the `ipv6` protocol prefix and support all standard Wireshark filter syntax. This guide covers essential filters for IPv6 traffic analysis.

## Basic IPv6 Display Filters

```wireshark
# Show all IPv6 traffic

ipv6

# Show only ICMPv6 traffic
icmpv6

# Show only IPv6 TCP traffic
ipv6 && tcp

# Show only IPv6 UDP traffic
ipv6 && udp

# Show IPv6 DNS queries (port 53 UDP)
ipv6 && udp.port == 53

# Show IPv6 HTTP traffic
ipv6 && tcp.port == 80

# Show IPv6 HTTPS traffic
ipv6 && tcp.port == 443
```

## Filtering by IPv6 Address

```wireshark
# Filter by source IPv6 address
ipv6.src == 2001:db8::1

# Filter by destination IPv6 address
ipv6.dst == 2001:db8::10

# Filter by either source or destination
ipv6.addr == 2001:db8::1

# Filter by source prefix (CIDR-like match)
ipv6.src >= 2001:db8:: && ipv6.src <= 2001:db8::ffff:ffff:ffff:ffff

# Filter for link-local addresses
ipv6.src == fe80::/10

# More reliable prefix matching
ipv6.src[0:8] == 20:01:0d:b8:00:00:00:00
```

## ICMPv6 Specific Filters

```wireshark
# All ICMPv6
icmpv6

# Neighbor Solicitation (type 135)
icmpv6.type == 135

# Neighbor Advertisement (type 136)
icmpv6.type == 136

# Router Solicitation (type 133)
icmpv6.type == 133

# Router Advertisement (type 134)
icmpv6.type == 134

# Echo Request (type 128) - ping6
icmpv6.type == 128

# Echo Reply (type 129)
icmpv6.type == 129

# All NDP traffic (Neighbor Discovery Protocol)
icmpv6.type >= 133 && icmpv6.type <= 137

# Destination Unreachable
icmpv6.type == 1

# Time Exceeded (traceroute responses)
icmpv6.type == 3

# Path MTU messages
icmpv6.type == 2
```

## Compound Display Filters

```wireshark
# IPv6 traffic between two specific hosts
ipv6.addr == 2001:db8::1 && ipv6.addr == 2001:db8::2

# IPv6 TCP handshake (SYN packets)
ipv6 && tcp.flags.syn == 1 && tcp.flags.ack == 0

# IPv6 TCP resets
ipv6 && tcp.flags.reset == 1

# IPv6 traffic not from loopback
ipv6 && ipv6.src != ::1

# IPv6 traffic on specific subnet
ipv6.src[0:4] == 20:01:0d:b8

# IPv6 DNS responses with AAAA records
dns && dns.qry.type == 28

# IPv6 HTTP(S) traffic from a specific client
(tcp.port == 80 || tcp.port == 443) && ipv6.src == 2001:db8::100

# MLD (Multicast Listener Discovery) messages
icmpv6.type >= 130 && icmpv6.type <= 132
```

## Filtering for Troubleshooting Scenarios

```wireshark
# Find all NDP for a specific address (discovery + advertisement)
icmpv6.nd.ns.target_address == 2001:db8::1 ||
icmpv6.nd.na.target_address == 2001:db8::1

# Find Router Advertisements with specific prefix
icmpv6.type == 134 && icmpv6.opt.prefix == 2001:db8::

# Find failed TCP connections over IPv6 (TCP resets after SYN)
ipv6 && tcp.flags.reset == 1

# Find slow responses (TCP retransmissions over IPv6)
ipv6 && tcp.analysis.retransmission

# Find IPv6 fragmented packets
ipv6.fraghdr.offset != 0

# Find packets with large hop limits (unusual)
ipv6.hlim > 200

# Show DHCPv6 traffic
dhcpv6

# Show DHCPv6 Solicit messages
dhcpv6.msgtype == 1

# Show DHCPv6 Advertise
dhcpv6.msgtype == 2
```

## Export Filtered Traffic

```bash
# Save filtered IPv6 packets to a new file using tshark
tshark -r original.pcap -Y "ipv6 && tcp.port == 443" -w filtered-ipv6.pcap

# Extract only IPv6 to a CSV
tshark -r capture.pcap -Y "ipv6" \
    -T fields -e frame.time -e ipv6.src -e ipv6.dst -e ipv6.nxt \
    -E header=y -E separator=,
```

## Useful IPv6 Column Configuration

In Wireshark, add custom columns for IPv6 analysis:

```text
Column Name: IPv6 Src
Field: ipv6.src

Column Name: IPv6 Dst
Field: ipv6.dst

Column Name: ICMPv6 Type
Field: icmpv6.type

Column Name: Hop Limit
Field: ipv6.hlim
```

## Common IPv6 Analysis Workflows

```wireshark
# Workflow 1: Debug SLAAC address assignment
# Capture interface during address assignment:
icmpv6.type == 133 || icmpv6.type == 134  # RS + RA
# Then look for DAD:
icmpv6.type == 135 && ipv6.src == ::       # DAD Solicitation

# Workflow 2: Debug IPv6 routing
# Show traceroute probes and responses:
(icmpv6.type == 128 && ipv6.hlim < 15) ||  # Probes with low hop limit
icmpv6.type == 3                             # Time Exceeded responses

# Workflow 3: Debug IPv6 DNS
dns && (dns.qry.type == 28 || dns.resp.type == 28)  # AAAA queries and responses
```

## Conclusion

Wireshark IPv6 display filters use the `ipv6` prefix for address and protocol matching, and `icmpv6.type` for NDP and control messages. The `icmpv6.type` filter values 133-137 cover all Neighbor Discovery Protocol messages. Combine `ipv6.addr`, protocol filters, and TCP flag filters to build targeted views of your IPv6 traffic for effective troubleshooting and analysis.
