# How to Analyze IPv6 Extension Headers in Wireshark

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Wireshark, IPv6, Extension Headers, Packet Analysis, Security, Fragmentation

Description: A guide to identifying, filtering, and analyzing IPv6 extension headers in Wireshark, including fragmentation, routing, and hop-by-hop options.

IPv6 uses extension headers to carry optional information between the main IPv6 header and the upper-layer protocol. Unlike IPv4 options (in the main header), IPv6 extension headers are chained and can be combined. Wireshark decodes each extension header type.

## IPv6 Extension Header Types

| Next Header Value | Name | Purpose |
|---|---|---|
| 0 | Hop-by-Hop Options | Processed by every router (e.g., MLD, Jumbo) |
| 43 | Routing | Source routing (Type 0 deprecated) |
| 44 | Fragment | Fragmentation at source |
| 50 | ESP | IPsec Encapsulating Security Payload |
| 51 | AH | IPsec Authentication Header |
| 59 | No Next Header | End of extension headers |
| 60 | Destination Options | Processed only at destination |

## Display Filters for Extension Headers

```wireshark
# Show packets with ANY IPv6 extension header

ipv6.nxt != 6 && ipv6.nxt != 17 && ipv6.nxt != 58 && ipv6

# Show packets with Hop-by-Hop Options header
ipv6.nxt == 0

# Show packets with Fragment header (next header = 44)
ipv6.nxt == 44
# Or using the fragment header field
ipv6.fraghdr

# Show packets with Routing header (type 43)
ipv6.nxt == 43

# Show packets with Destination Options (type 60)
ipv6.nxt == 60

# Show packets with Authentication Header (IPsec AH, type 51)
ipv6.nxt == 51

# Show packets with ESP (IPsec, type 50)
ipv6.nxt == 50
```

## Analyzing Fragment Extension Headers

```wireshark
# Show all IPv6 fragmented packets
ipv6.fraghdr

# Show only the first fragment (offset = 0 and More Fragments = 1)
ipv6.fraghdr.offset == 0 && ipv6.fraghdr.more == 1

# Show only subsequent fragments (offset > 0)
ipv6.fraghdr.offset > 0

# Show the last fragment (More Fragments = 0 and offset > 0)
ipv6.fraghdr.more == 0 && ipv6.fraghdr.offset > 0

# Filter by fragment identification value
ipv6.fraghdr.ident == 0x12345678
```

## Analyzing Hop-by-Hop Options

```wireshark
# Show Router Alert option (used by MLD and RSVP)
ipv6.opt.router_alert == 0   # Multicast Listener Discovery (value 0)
ipv6.opt.router_alert == 1   # RSVP (value 1)

# Show Jumbogram option (IPv6 Jumbo Payload)
ipv6.opt.jumbo
```

## Routing Header Analysis

```wireshark
# Show packets with Routing Header
ipv6.nxt == 43

# Type 0 Routing Header (deprecated - security risk)
ipv6.routing.type == 0

# Type 4 Segment Routing (SRv6)
ipv6.routing.type == 4
```

## Security Analysis: Suspicious Extension Headers

```wireshark
# Find packets with many chained extension headers (unusual)
# Look for nxt values 0, 43, 44, 60 in sequence

# Find Type 0 Routing Headers (deprecated, should not appear)
ipv6.routing.type == 0

# Find oversized Hop-by-Hop headers (potential DoS)
ipv6.nxt == 0 && frame.len > 1500

# Find packets with extension headers from unexpected sources
ipv6.nxt == 43 && ipv6.src == 2000::/3   # Routing headers from global sources
```

## Extract Extension Header Statistics

```bash
# Count packets by next header type to find extension header usage
tshark -r capture.pcap -Y "ipv6" \
  -T fields -e ipv6.nxt | sort | uniq -c | sort -rn
```

| Count | Next Header | Meaning |
|---|---|---|
| High | 6 | TCP (no extension header) |
| High | 17 | UDP (no extension header) |
| High | 58 | ICMPv6 (no extension header) |
| Any | 44 | Fragmentation in use |
| Any | 0 | Hop-by-Hop options in use |

IPv6 extension header analysis in Wireshark reveals advanced packet characteristics like fragmentation behavior, IPsec tunneling, and Segment Routing - all critical for security auditing and advanced network troubleshooting.
