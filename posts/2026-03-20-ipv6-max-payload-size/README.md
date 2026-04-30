# How to Calculate the Maximum Upper-Layer Payload Size in IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, MTU, Payload Size, Fragmentation, Networking

Description: Calculate the maximum data payload available to upper-layer protocols in IPv6 given various MTU sizes and extension header overhead.

## Introduction

The maximum amount of data a single IPv6 packet can carry depends on the path MTU minus the IPv6 header and any extension headers. Unlike IPv4, which historically required hosts to reassemble at least 576-byte datagrams, IPv6 mandates a minimum MTU of 1280 bytes on every link. Understanding how to calculate available payload sizes helps in application design and protocol implementation.

## Basic Calculation

```text
Available payload = MTU - IPv6 header (40 bytes) - extension headers - upper-layer header

For a standard 1500-byte Ethernet MTU with TCP (no extension headers):
  1500 - 40 (IPv6) - 20 (TCP) = 1440 bytes of application data per segment

For UDP:
  1500 - 40 (IPv6) - 8 (UDP) = 1452 bytes of application data per datagram
```

## Python Calculator

```python
def calculate_max_payload(
    mtu: int = 1500,
    extension_headers_bytes: int = 0,
    transport_header_bytes: int = 0,
) -> dict:
    """
    Calculate maximum payload sizes for IPv6 packets.

    Args:
        mtu:                      Path MTU in bytes
        extension_headers_bytes:  Total bytes of all extension headers
        transport_header_bytes:   Upper-layer protocol header size

    Returns:
        dict with various payload size calculations
    """
    IPV6_HEADER = 40  # Fixed

    # Bytes available after IPv6 header (this is the Payload Length field)
    payload_length_max = mtu - IPV6_HEADER

    # Bytes available after extension headers
    after_ext_headers = payload_length_max - extension_headers_bytes

    # Application data available
    app_data_max = after_ext_headers - transport_header_bytes

    return {
        "mtu": mtu,
        "ipv6_header": IPV6_HEADER,
        "extension_headers": extension_headers_bytes,
        "transport_header": transport_header_bytes,
        "payload_length_field": payload_length_max,
        "after_extension_headers": after_ext_headers,
        "app_data_available": app_data_max,
    }

# Common scenarios

scenarios = [
    (1500, 0, 20, "Ethernet 1500 MTU, TCP, no extensions"),
    (1500, 0, 8,  "Ethernet 1500 MTU, UDP, no extensions"),
    (1500, 24, 20,"Ethernet 1500 MTU, TCP, AH header (24 bytes)"),
    (1500, 8, 20, "Ethernet 1500 MTU, TCP, Fragment Header"),
    (9000, 0, 20, "Jumbo frame 9000 MTU, TCP"),
    (1280, 0, 8,  "Minimum IPv6 MTU, UDP"),
    (1280, 8, 20, "Minimum IPv6 MTU, TCP, Fragment Header"),
]

print(f"{'Scenario':45s} App Data")
print("-" * 60)
for mtu, ext, transport, desc in scenarios:
    result = calculate_max_payload(mtu, ext, transport)
    if result["app_data_available"] > 0:
        print(f"{desc:45s} {result['app_data_available']:5d} bytes")
    else:
        print(f"{desc:45s} CANNOT FIT (fragmentation needed)")
```

## MSS (Maximum Segment Size) for TCP

TCP's MSS option is advertised during the three-way handshake to help bound segment size and avoid IP fragmentation:

```bash
# View MSS on established connections
ss -6 -n -t -i state established | grep mss

# Ideal MSS calculation:
# MSS = Path MTU - IPv6 header (40) - TCP header (20)
# For 1500 MTU: MSS = 1500 - 40 - 20 = 1440 bytes

# Set a fixed MSS via ip6tables (for tunnels with reduced MTU)
sudo ip6tables -t mangle -A FORWARD \
    -p tcp --tcp-flags SYN,RST SYN \
    -j TCPMSS --set-mss 1400
```

## MTU Discovery Impact

When Path MTU is smaller than 1500 (e.g., in tunnels):

```text
GRE Tunnel overhead: IPv6 (40) + GRE (4) = 44 bytes overhead
  Effective MTU for inner IPv6: 1500 - 44 = 1456 bytes
  TCP MSS should be: 1456 - 40 (inner IPv6) - 20 (TCP) = 1396 bytes

IPsec ESP overhead (typical): ~50-60 bytes
  Effective MTU: 1500 - 60 = 1440 bytes inner
  TCP MSS: 1440 - 40 - 20 = 1380 bytes
```

## UDP Application Design Considerations

```python
# Applications should size UDP datagrams to avoid fragmentation
MTU = 1500
IPV6_HEADER = 40
UDP_HEADER = 8

MAX_UDP_PAYLOAD = MTU - IPV6_HEADER - UDP_HEADER  # 1452 bytes

# For DNS (typically small queries but large responses):
# EDNS0 allows responses larger than 512 bytes, but a conservative buffer
# size for general IPv6 Internet use is 1232 bytes to avoid fragmentation.
DNS_EDNS_BUFFER = 1232

print(f"Max UDP payload without fragmentation: {MAX_UDP_PAYLOAD} bytes")
print(f"DNS EDNS0 recommended buffer size: {DNS_EDNS_BUFFER} bytes")
```

## Conclusion

Maximum IPv6 payload size is determined by subtracting the 40-byte fixed header plus any extension header overhead from the path MTU. For standard Ethernet (1500 MTU), TCP gets 1440 bytes of application data per segment, and UDP gets 1452 bytes per datagram without fragmentation. Applications should use Path MTU Discovery to determine the actual available payload size on a given path, especially in networks with tunnels or VPNs that reduce the effective MTU.
