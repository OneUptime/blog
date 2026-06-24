# How to Understand the Impact of Extension Headers on Path MTU Discovery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Extension Headers, Path MTU, MTU Discovery, Networking

Description: Understand how IPv6 extension headers reduce the available payload space and interact with Path MTU Discovery, causing connectivity issues when not accounted for.

## Introduction

IPv6 extension headers consume bytes from the available payload space, effectively reducing the usable MTU for application data. While RFC 8200 defines a specific set of IPv6 extension headers, the same MTU arithmetic also applies to encapsulation overhead such as IPsec ESP or GRE. When these extra headers are present, the sender must account for their overhead, or Packet Too Big messages and connectivity failures can occur. This interaction is especially important for tunneled traffic, IPsec, and any protocol that adds per-packet overhead.

## How Extra Headers Reduce Effective MTU

```text
Standard IPv6 packet (no extra headers, 1500 MTU):
  [IPv6 (40)] [TCP (20)] [App Data (1440)]
  Available application data: 1440 bytes

With IPsec ESP (transport mode, example AES-GCM with 8-byte IV and 16-byte ICV, no padding):
  [IPv6 (40)] [ESP (8)] [IV (8)] [TCP (20)] [App Data] [ESP Trailer (2)] [ICV (16)]
  Available application data: 1500 - 40 - 8 - 8 - 20 - 2 - 16 = 1406 bytes

With IPv6-in-IPv6 + IPsec ESP (tunnel mode, same ESP assumptions):
  [Outer IPv6 (40)] [ESP (8)] [IV (8)] [Inner IPv6 (40)] [TCP (20)] [App Data] [ESP Trailer (2)] [ICV (16)]
  Available application data: 1500 - 40 - 8 - 8 - 40 - 20 - 2 - 16 = 1366 bytes
```

A Fragment header, when present, consumes an additional 8 bytes, but it is not inherent to tunnel mode.

## Calculating Effective MTU with Extra Headers

```python
def calculate_effective_mtu(
    link_mtu: int = 1500,
    extra_headers: dict = None
) -> dict:
    """
    Calculate available application data given link MTU and extra packet overhead.

    Args:
        link_mtu: Physical link MTU in bytes
        extra_headers: Dict of {name: bytes} for extension, tunnel, or security overhead

    Returns:
        Dictionary with various payload sizes
    """
    if extra_headers is None:
        extra_headers = {}

    IPV6_BASE = 40
    TCP_HEADER = 20
    UDP_HEADER = 8

    extra_header_total = sum(extra_headers.values())
    total_overhead_tcp = IPV6_BASE + extra_header_total + TCP_HEADER
    total_overhead_udp = IPV6_BASE + extra_header_total + UDP_HEADER

    return {
        "link_mtu": link_mtu,
        "ipv6_header": IPV6_BASE,
        "extra_headers": extra_headers,
        "extra_header_bytes": extra_header_total,
        "tcp_mss": link_mtu - total_overhead_tcp,
        "udp_payload": link_mtu - total_overhead_udp,
        "header_overhead": IPV6_BASE + extra_header_total,
        "meets_min_mtu": link_mtu >= 1280,
    }

# Common scenarios
# Actual ESP overhead varies by transform and padding; these ESP examples use
# AES-GCM-style overhead with an 8-byte IV and 16-byte ICV.

print("=== No Extra Headers ===")
result = calculate_effective_mtu(1500)
print(f"TCP MSS: {result['tcp_mss']} bytes")
print(f"UDP max: {result['udp_payload']} bytes")

print("\n=== IPsec ESP (Transport Mode) ===")
result = calculate_effective_mtu(1500, {
    "ESP header": 8,
    "ESP IV": 8,
    "ESP trailer (pad length + next header)": 2,
    "ESP ICV (AES-GCM-128)": 16,
})
print(f"TCP MSS: {result['tcp_mss']} bytes")

print("\n=== IPv6-in-IPv6 Tunnel + ESP (Tunnel Mode) ===")
result = calculate_effective_mtu(1500, {
    "ESP header": 8,
    "ESP IV": 8,
    "Inner IPv6 header": 40,
    "ESP trailer (pad length + next header)": 2,
    "ESP ICV": 16,
})
print(f"TCP MSS: {result['tcp_mss']} bytes")

print("\n=== GRE over IPv6 (base header) ===")
result = calculate_effective_mtu(1500, {
    "GRE base header": 4,
})
print(f"TCP MSS: {result['tcp_mss']} bytes")
```

## Path MTU Discovery with Extra Headers

RFC 8201 defines IPv6 Path MTU Discovery. The path MTU applies to the entire IPv6 packet, so any extension or encapsulation overhead reduces the room left for upper-layer data:

```bash
# Probe the current IPv6 path MTU to a destination
tracepath -6 2001:db8::1

# Inspect the route the kernel would use for a destination
ip -6 route get 2001:db8::1

# Watch for ICMPv6 Packet Too Big messages (indicates PMTUD in action)
sudo tcpdump -i eth0 'icmp6 and icmp6[icmp6type] == icmp6-packettoobig'

# Linux does not expose /proc/sys/net/ipv6/conf/all/path_mtu_discovery.
# PMTUD behavior is handled per protocol/socket; ensure ICMPv6 Packet Too Big
# messages are not filtered.
```

## MSS Clamping for Reduced MTU

When packets traverse links with reduced MTU due to extension or encapsulation overhead, MSS clamping ensures TCP doesn't exceed the path capacity:

```bash
# Clamp TCP MSS for IPv6 to account for IPsec or tunnel overhead
# Normal MSS: 1500 - 40 (IPv6) - 20 (TCP) = 1440
# Example ESP transport mode with 8-byte IV and 16-byte ICV, no padding:
# 1500 - 40 - 8 (ESP) - 8 (IV) - 2 (trailer) - 16 (ICV) - 20 (TCP) = 1406

sudo ip6tables -t mangle -A FORWARD \
    -p tcp --tcp-flags SYN,RST SYN \
    -j TCPMSS --set-mss 1350  # Conservative value for tunneled connections

# Or use clamp-to-pmtu (dynamic, preferred)
sudo ip6tables -t mangle -A FORWARD \
    -p tcp --tcp-flags SYN,RST SYN \
    -j TCPMSS --clamp-mss-to-pmtu
```

## Header Overhead and Minimum MTU Requirements

IPv6 requires that every link have a minimum MTU of 1280 bytes. Extra headers do not change this requirement, but they do reduce the space left above the IPv6 base header:

```text
Minimum MTU: 1280 bytes
IPv6 base header: 40 bytes
Space remaining above the IPv6 base header: 1280 - 40 = 1240 bytes

With one 8-byte extension header:
Space remaining above the IPv6 base header: 1280 - 40 - 8 = 1232 bytes

With Fragment Header + one 8-byte extension header:
  1280 - 40 - 8 - 8 = 1224 bytes before transport headers
```

## Conclusion

Extension headers and other encapsulation overhead reduce the effective available payload space proportionally to their size. This is most critical in tunneling scenarios (IPv6-in-IPv6, GRE, IPsec tunnel mode) where multiple headers stack up. Path MTU Discovery handles this correctly in theory, but relies on ICMPv6 Packet Too Big messages being delivered, which is not always the case due to firewall misconfiguration. On TCP-carrying tunnel paths, MSS clamping at tunnel endpoints or `--clamp-mss-to-pmtu` can help avoid PMTU-related stalls when MTU is constrained by header overhead.
