# How to Compare the IPv6 Header with the IPv4 Header

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, IPv4, Header, Networking, Protocol Comparison

Description: Compare the IPv6 and IPv4 header formats side by side, understanding which fields were removed, renamed, or redesigned and the reasons behind each change.

## Introduction

The IPv6 header is not simply an IPv4 header with bigger addresses. It was redesigned to eliminate complexity, improve performance, and support new features. Several IPv4 header fields were removed entirely, some were renamed, and new fields were added. Understanding these changes reveals the design goals behind IPv6.

## Side-by-Side Comparison

| IPv4 Field | Bits | IPv6 Equivalent | Notes |
|---|---|---|---|
| Version | 4 | Version | Same (value changes: 4 → 6) |
| IHL (Header Length) | 4 | **Removed** | Fixed 40-byte header eliminates need |
| Type of Service | 8 | Traffic Class | Renamed, same purpose |
| Total Length | 16 | Payload Length | Renamed; excludes the 40-byte base header in IPv6 |
| Identification | 16 | **Removed** → Fragment Header | Replaced by a 32-bit field in the Fragment Header |
| Flags | 3 | **Removed** → Fragment Header | Only the M flag remains in the Fragment Header |
| Fragment Offset | 13 | **Removed** → Fragment Header | Moved to extension header |
| TTL | 8 | Hop Limit | Renamed; same decrement behavior |
| Protocol | 8 | Next Header | Renamed; also identifies extension headers |
| Header Checksum | 16 | **Removed** | Eliminated for performance |
| Source Address | 32 | Source Address | Expanded to 128 bits |
| Destination Address | 32 | Destination Address | Expanded to 128 bits |
| Options | Variable | **Removed** → Extension Headers | Moved to optional extension headers |
| - | - | Flow Label | **New** in IPv6 (20 bits) |

## IPv4 Fields That Were Removed

### 1. IHL (Internet Header Length)
IPv4 headers are variable-length (20-60 bytes) due to options, requiring a length field. IPv6 has a fixed 40-byte header, so the length field is unnecessary.

### 2. Header Checksum
The biggest removal and most controversial. IPv4 requires every router to verify and update the checksum (TTL decrement changes the checksum). This is CPU-intensive. IPv6 relies on:
- Link-layer CRC (Ethernet FCS catches bit errors)
- Transport-layer checksums (TCP/UDP verify end-to-end; UDP checksums are mandatory in IPv6)
- ICMPv6 checksums include an IPv6 pseudo-header (unlike ICMPv4)

### 3. Fragmentation Fields (Identification, Flags, Fragment Offset)
In IPv4, any router can fragment a packet. In IPv6, only the source can fragment, and only using the Fragment Extension Header. This simplifies router processing.

### 4. Options
IPv4 options made header parsing unpredictable. IPv6 moves all options to extension headers, which are generally processed only by endpoints. Hop-by-Hop Options are the exception: nodes along the path may examine them, but RFC 8200 expects them to do so only if explicitly configured.

## IPv6 New Field: Flow Label

```text
Flow Label (20 bits): identifies a flow for special handling

Purpose:
  - Flow classification using fixed-position IPv6 header fields
  - ECMP hashing without parsing upper-layer headers
  - Stateless load balancing

Values:
  0x00000 = not used / no specific flow
  non-zero = identifies a specific flow
```

## Size Comparison

```python
def compare_headers():
    """Compare IPv4 and IPv6 header sizes."""

    ipv4_fields = {
        "Version": 4, "IHL": 4, "TOS": 8, "Total Length": 16,
        "Identification": 16, "Flags": 3, "Fragment Offset": 13,
        "TTL": 8, "Protocol": 8, "Header Checksum": 16,
        "Source Address": 32, "Destination Address": 32,
    }

    ipv6_fields = {
        "Version": 4, "Traffic Class": 8, "Flow Label": 20,
        "Payload Length": 16, "Next Header": 8, "Hop Limit": 8,
        "Source Address": 128, "Destination Address": 128,
    }

    ipv4_bits = sum(ipv4_fields.values())
    ipv6_bits = sum(ipv6_fields.values())

    print(f"IPv4 minimum header: {ipv4_bits} bits = {ipv4_bits//8} bytes")
    print(f"IPv6 header:         {ipv6_bits} bits = {ipv6_bits//8} bytes")
    print()
    print("IPv4 fields:")
    for field, bits in ipv4_fields.items():
        print(f"  {field:25s}: {bits:3d} bits")
    print()
    print("IPv6 fields:")
    for field, bits in ipv6_fields.items():
        print(f"  {field:25s}: {bits:3d} bits")

compare_headers()
```

Output:
```text
IPv4 minimum header: 160 bits = 20 bytes
IPv6 header:         320 bits = 40 bytes
```

Note: Despite IPv6 being 40 bytes vs IPv4's 20 bytes minimum, the **address fields** account for most of the increase (256 bits for addresses vs 64 bits). The non-address overhead is actually *smaller* in IPv6.

## Capturing Both Protocols for Comparison

```bash
# Capture IPv4 and IPv6 packets simultaneously

sudo tcpdump -i eth0 -vv "(ip or ip6)" | head -40

# Compare TTL/HopLimit behavior
sudo tcpdump -i eth0 -v "(tcp port 80 or tcp port 443)" 2>/dev/null | \
  awk '/ttl/ {print "IPv4 TTL:", $0} /hlim/ {print "IPv6 HopLimit:", $0}'
```

## Conclusion

The IPv6 header redesign removed fragmentation fields, the checksum, options, and the variable-length header in exchange for a simpler, faster-to-process 40-byte structure. The additions - Flow Label and expanded addresses - enable new capabilities. The result is a header that is simpler for routers to process in the common case, without variable-length parsing, per-hop checksum updates, or in-network fragmentation decisions.
