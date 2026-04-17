# How to Filter IPv6 Packets by Destination Address in Wireshark

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Wireshark, IPv6, Packet Analysis, Display Filters, Network Debugging

Description: A guide to using Wireshark display filters to isolate packets destined for specific IPv6 addresses, multicast groups, and address prefixes.

Filtering by IPv6 destination address in Wireshark helps you track traffic flowing toward a specific server, service, or multicast group. This is essential for diagnosing connectivity issues, verifying service reachability, and analyzing multicast traffic.

## Basic IPv6 Destination Filters

```wireshark
# All packets destined for a specific IPv6 address

ipv6.dst == 2001:db8::10

# All packets destined for the loopback address
ipv6.dst == ::1

# All packets destined for a specific server's IPv6
ipv6.dst == 2001:db8:abcd::1
```

## Filter by Destination Prefix

```wireshark
# Packets destined for any host in the 2001:db8:abcd::/64 subnet
ipv6.dst == 2001:db8:abcd::/64

# Packets to all-nodes multicast (ff02::1)
ipv6.dst == ff02::1

# Packets to all-routers multicast (ff02::2)
ipv6.dst == ff02::2

# Packets to any solicited-node multicast address
ipv6.dst == ff02::1:ff00:0/104
```

## Multicast Destination Filters

IPv6 uses multicast extensively for neighbor discovery and router advertisements:

```wireshark
# All IPv6 multicast traffic (destination starts with ff)
ipv6.dst == ff00::/8

# All-routers multicast (used by Router Solicitations)
ipv6.dst == ff02::2

# All-nodes multicast (used by Router Advertisements)
ipv6.dst == ff02::1

# MLDv2 report messages (multicast listener discovery)
ipv6.dst == ff02::16

# OSPF IPv6 (OSPFv3) all-routers
ipv6.dst == ff02::5
ipv6.dst == ff02::6
```

## Combined Destination Filters

```wireshark
# TCP traffic destined for a specific IPv6 host on port 443
ipv6.dst == 2001:db8::beef && tcp.dstport == 443

# UDP traffic to a specific IPv6 host
ipv6.dst == 2001:db8::53 && udp

# Traffic from subnet A to subnet B
ipv6.src == 2001:db8:1::/64 && ipv6.dst == 2001:db8:2::/64

# Traffic to the web server from IPv6 internet (not RFC1918 or RFC4193)
ipv6.dst == 2001:db8::10 && !(ipv6.src == fc00::/7)
```

## Filter for Specific Protocol to IPv6 Destination

```wireshark
# DNS queries to an IPv6 DNS server
ipv6.dst == 2001:4860:4860::8888 && dns

# HTTP requests to an IPv6 web server
ipv6.dst == 2001:db8::beef && http

# SSH connections to a specific IPv6 host
ipv6.dst == 2001:db8::10 && tcp.dstport == 22

# All ICMPv6 messages to an IPv6 host
ipv6.dst == 2001:db8::10 && icmpv6
```

## Destination Address in the Column View

Add the IPv6 destination as a column for easier scanning:

1. In Wireshark, right-click the **Destination** column header
2. Select **Column Preferences**
3. Verify `ipv6.dst` is in the column list (it should appear automatically for IPv6 packets)

Or add a custom column:
- **Column Title**: `IPv6 Destination`
- **Column Type**: Custom
- **Fields**: `ipv6.dst`

## Capture Filter for IPv6 Destination

```bpf
# Capture only traffic TO a specific IPv6 host
ip6 dst 2001:db8::10

# Capture traffic to an IPv6 subnet
ip6 dst net 2001:db8:abcd::/64

# Capture IPv6 multicast traffic
ip6 multicast
```

## Export Filtered Packets

After applying a destination filter:
1. Go to **File → Export Specified Packets**
2. Select **Displayed** (only filtered packets)
3. Save as `.pcap` or `.pcapng`

```bash
# Equivalent tshark command for scripting
tshark -r capture.pcap -Y "ipv6.dst == 2001:db8::10" \
  -w filtered-destination.pcap
```

Filtering by IPv6 destination is particularly useful for verifying that traffic reaches the correct server, debugging asymmetric routing, and confirming that multicast traffic is flowing to the right group members.
