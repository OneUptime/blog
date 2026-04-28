# How to Understand the Redirected Header Option in NDP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NDP, Redirected Header, Redirect, IPv6, RFC 4861

Description: Understand the Redirected Header NDP option used in ICMPv6 Redirect messages, how it carries the original packet, and how hosts use it to update their routing.

## Introduction

The Redirected Header option (Type 4) appears only in ICMPv6 Redirect messages (Type 137). It carries as much of the original packet that triggered the Redirect as will fit within the 1280-byte minimum MTU constraint. This allows the redirected host to identify which specific connection was redirected and update its destination cache accordingly.

## Redirected Header Option Format

```text
NDP Redirected Header Option (Type 4):

 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|     Type = 4  |    Length     |            Reserved           |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                           Reserved                            |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|  As much of the redirected packet as fits without the ICMPv6  |
.  packet exceeding 1280 bytes                                  .

Length: Variable (in 8-byte units)
  = (8 + len(original_packet_bytes) + padding) / 8

The original packet starts at byte 8 of the option (after headers)
```

## Redirect Message with Options

```text
Complete Redirect message structure:

Redirect fixed body (40 bytes):
  Type (1) + Code (1) + Checksum (2) + Reserved (4)
  + Target Address (16) + Destination Address (16)

Options:
  Type 2: Target Link-Layer Address (the better next-hop's MAC)
  Type 4: Redirected Header (copy of the original too-large packet)

Together, the options allow the host to:
  1. Learn the MAC of the new next-hop (Type 2)
  2. Identify which socket/connection triggered this redirect (Type 4)
```

## Parsing a Redirect Message

```python
import struct
import socket

def parse_redirect_message(icmpv6_data: bytes) -> dict:
    """
    Parse an ICMPv6 Redirect message (Type 137).
    Includes parsing the Redirected Header option.
    """
    if len(icmpv6_data) < 40:
        raise ValueError("Redirect requires at least 40 bytes")

    icmp_type, code, checksum = struct.unpack("!BBH", icmpv6_data[:4])

    if icmp_type != 137:
        raise ValueError(f"Expected Type=137 (Redirect), got {icmp_type}")

    target_addr = socket.inet_ntop(socket.AF_INET6, icmpv6_data[8:24])
    dest_addr = socket.inet_ntop(socket.AF_INET6, icmpv6_data[24:40])

    # Parse options starting at byte 40
    result = {
        "target_address": target_addr,
        "destination_address": dest_addr,
        "target_mac": None,
        "original_packet": None,
    }

    offset = 40
    while offset + 2 <= len(icmpv6_data):
        opt_type = icmpv6_data[offset]
        opt_len_units = icmpv6_data[offset + 1]
        if opt_len_units == 0:
            break
        opt_len_bytes = opt_len_units * 8

        if opt_type == 2 and opt_len_bytes >= 8:  # Target Link-Layer Address
            mac = icmpv6_data[offset+2:offset+8]
            result["target_mac"] = ':'.join(f'{b:02x}' for b in mac)

        elif opt_type == 4:  # Redirected Header
            # Original packet starts at byte 8 of the option (after 6 bytes reserved)
            result["original_packet"] = icmpv6_data[offset+8:offset+opt_len_bytes]
            result["original_packet_length"] = len(result["original_packet"])

        offset += opt_len_bytes

    return result
```

## Redirect Processing by Hosts

```bash
# Check if host accepts redirects

cat /proc/sys/net/ipv6/conf/eth0/accept_redirects
# 1 = accept (default); 0 = ignore all redirects

# View redirect-based routes in destination cache
ip -6 route show cache | grep "redirect"

# Disable redirects on hosts that are themselves routers
sudo sysctl -w net.ipv6.conf.all.accept_redirects=0

# Monitor for redirect messages
sudo tcpdump -i eth0 -v "icmp6 and ip6[40] == 137"
# Shows: target (better next-hop), destination (original dest), options
```

## Conclusion

The Redirected Header option in NDP Redirect messages provides the host with enough information from the original packet to identify which connection triggered the redirect and update its destination cache accurately. The option carries the beginning of the original packet, capped to keep the total Redirect message within the 1280-byte minimum MTU. Together with the Target Link-Layer Address option, the Redirect message gives hosts both the better next-hop address and its MAC, enabling immediate routing optimization.
