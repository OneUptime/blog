# How to Filter IPv6 Packets by Source Address in Wireshark

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Wireshark, IPv6, Packet Analysis, Display Filters, Network Debugging

Description: A guide to using Wireshark display filters to isolate packets from specific IPv6 source addresses, prefixes, and address ranges.

Wireshark's display filter language makes it easy to focus on IPv6 packets from specific sources. This guide covers all the filter techniques you need for IPv6 source-address analysis.

## Basic IPv6 Source Address Filters

```wireshark
# Show all IPv6 packets from a specific source address

ipv6.src == 2001:db8::1

# Show all IPv6 packets (any source)
ipv6

# Show IPv6 packets from a specific source using shorthand
ipv6.src == ::1
```

## Filtering by Source Address Prefix

Wireshark supports CIDR-like notation for matching address prefixes:

```wireshark
# Show all packets from the 2001:db8::/32 documentation prefix
ipv6.src == 2001:db8::/32

# Show packets from link-local sources (fe80::/10)
ipv6.src == fe80::/10

# Show packets from ULA sources (fc00::/7)
ipv6.src == fc00::/7

# Show packets from loopback (::1)
ipv6.src == ::1/128
```

## Combining Source Address Filters

```wireshark
# Packets from either of two specific sources
ipv6.src == 2001:db8::1 || ipv6.src == 2001:db8::2

# Packets from a source range AND to a specific destination
ipv6.src == 2001:db8::/48 && ipv6.dst == 2001:db8:1::10

# All IPv6 TCP packets from a specific source
ipv6.src == 2001:db8::c11e && tcp

# IPv6 packets from a source to a specific port
ipv6.src == 2001:db8::1 && tcp.dstport == 443

# All IPv6 packets EXCEPT loopback
ipv6 && !(ipv6.src == ::1)
```

## Filtering by Source Address Type

```wireshark
# Show only multicast source packets (ff00::/8)
ipv6.src == ff00::/8

# Show only global unicast addresses (2000::/3)
ipv6.src == 2000::/3

# Show only link-local source addresses
ipv6.src == fe80::/10

# Using the addr filter for either source or destination
ipv6.addr == 2001:db8::1
```

## Case-Insensitive Address Matching

Wireshark's display filters for IPv6 are case-insensitive:

```wireshark
# These three filters are equivalent
ipv6.src == 2001:db8::DEAD:beef
ipv6.src == 2001:db8::dead:beef
ipv6.src == 2001:DB8::DEAD:BEEF
```

## Using the Filter Bar in Wireshark GUI

1. Open Wireshark and start a capture (or open a pcap file)
2. Click the **Display Filter** bar at the top
3. Type: `ipv6.src == 2001:db8::10`
4. Press Enter or click **Apply**

The packet list will immediately show only matching packets, while the statistics bar updates to reflect the filtered count.

## Saving Common IPv6 Source Filters as Bookmarks

In Wireshark:
1. Type your filter expression in the filter bar
2. Click the **+** (bookmark) icon to save it
3. Give it a name like "IPv6 from Web Server"

## Using BPF (Capture Filter) for IPv6 Source

To filter at capture time (before packets are written to buffer):

```bpf
# Capture only packets from a specific IPv6 source
ip6 src 2001:db8::1

# Capture from a /64 subnet using CIDR notation
ip6 src net 2001:db8::/64
```

Filtering by IPv6 source address in Wireshark quickly narrows a capture to relevant traffic, making it much easier to diagnose issues like spoofing, unexpected traffic sources, or misconfigured routing that sends packets from incorrect addresses.
