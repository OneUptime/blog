# How to Understand Neighbor Advertisement (NA) Messages

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NDP, Neighbor Advertisement, IPv6, Address Resolution, RFC 4861

Description: Understand ICMPv6 Neighbor Advertisement messages, the R/S/O flags, when solicited vs unsolicited NAs are sent, and how they update the neighbor cache.

## Introduction

Neighbor Advertisement (NA) is ICMPv6 Type 136, the IPv6 replacement for ARP replies. NA messages are sent in response to Neighbor Solicitations and also sent proactively (unsolicited) when a node changes its MAC address or IP address. Three flags in the NA determine how the receiver should process the message and update its neighbor cache.

## NA Message Format

```text
ICMPv6 Neighbor Advertisement (Type 136):

 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|     Type=136  |   Code = 0    |          Checksum             |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|R|S|O|                     Reserved                            |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                                                               |
+                       Target Address                          +
|                        (128 bits)                             |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|   Options: Target Link-Layer Address                         |

IPv6 Header:
  Source:      NA sender's address (the address that owns the target)
  Destination: Unicast (reply to NS) or ff02::1 (unsolicited)
  Hop Limit:   255 (mandatory)
```

## NA Flags: R, S, O

```text
R flag (Router):
  1 = The sender is a router
  0 = The sender is a host
  Used by hosts to determine if a neighbor is a router
  If R=1, neighbor may serve as default gateway

S flag (Solicited):
  1 = This NA is a reply to a specific Neighbor Solicitation
  0 = This is an unsolicited NA (proactive advertisement)
  Used to differentiate: solicited NAs confirm reachability,
  unsolicited NAs do not

O flag (Override):
  1 = Override existing neighbor cache entry (update MAC)
  0 = Do not update existing cache entries
  Unsolicited NAs typically use O=1 when changing MAC address
  Solicited NAs typically use O=1
  DAD NAs typically use O=0 (just informing about conflict)
```

## Solicited vs Unsolicited NA

```text
Solicited NA (sent in response to NS):
  Source:      Owner of the Target Address
  Destination: Unicast to the NS sender (or ff02::1 for DAD response)
  R flag:      Set if sender is a router
  S flag:      1 (this is a solicited reply)
  O flag:      1 (update the requester's cache with our MAC)
  Use case:    Address resolution, NUD confirmation

Unsolicited NA (proactive advertisement):
  Source:      Node announcing a change
  Destination: ff02::1 (all nodes on the link)
  R flag:      Set if sender is a router
  S flag:      0 (not in response to NS)
  O flag:      1 (override: we're telling everyone our new MAC)
  Use case:    After failover or MAC change; updating all neighbors
```

## Capturing NA Messages

```bash
# Capture all Neighbor Advertisement messages

sudo tcpdump -i eth0 -v "icmp6 and ip6[40] == 136"

# Capture unsolicited NAs (sent to ff02::1)
sudo tcpdump -i eth0 -v "icmp6 and ip6[40] == 136 and dst ff02::1"

# Capture solicited NAs (unicast destination)
sudo tcpdump -i eth0 -v \
    "icmp6 and ip6[40] == 136 and not dst ff02::/16"

# Watch for NAs from a specific host
sudo tcpdump -i eth0 -v \
    "icmp6 and ip6[40] == 136 and src 2001:db8::1"

# Send an unsolicited NA manually (gratuitous neighbor announcement)
# Useful after network failover
sudo ndsend 2001:db8::1 eth0
```

## Parsing NA Flags

```python
import struct
import socket

def parse_neighbor_advertisement(na_data: bytes) -> dict:
    """
    Parse an ICMPv6 Neighbor Advertisement message.
    na_data: bytes starting from ICMPv6 Type byte
    """
    if len(na_data) < 24:
        raise ValueError("NA requires at least 24 bytes")

    icmp_type, code, checksum = struct.unpack("!BBH", na_data[:4])
    flags_and_reserved = struct.unpack("!I", na_data[4:8])[0]
    target_addr = socket.inet_ntop(socket.AF_INET6, na_data[8:24])

    r_flag = bool(flags_and_reserved & (1 << 31))
    s_flag = bool(flags_and_reserved & (1 << 30))
    o_flag = bool(flags_and_reserved & (1 << 29))

    # Parse options (starts at byte 24)
    target_mac = None
    offset = 24
    while offset + 2 <= len(na_data):
        opt_type = na_data[offset]
        opt_len_units = na_data[offset + 1]
        opt_len_bytes = opt_len_units * 8
        if opt_type == 2 and opt_len_bytes >= 8:  # Target Link-Layer Address
            mac = na_data[offset+2:offset+8]
            target_mac = ':'.join(f'{b:02x}' for b in mac)
        offset += opt_len_bytes

    return {
        "target_address": target_addr,
        "target_mac": target_mac,
        "R_router": r_flag,
        "S_solicited": s_flag,
        "O_override": o_flag,
        "type": "solicited" if s_flag else "unsolicited",
    }
```

## Conclusion

Neighbor Advertisement is the reply to Neighbor Solicitation and the proactive announcement of address changes. The three flags - Router (R), Solicited (S), and Override (O) - precisely communicate the nature and intent of the advertisement. Solicited NAs confirm reachability and trigger REACHABLE state in the neighbor cache. Unsolicited NAs with O=1 update all neighbors' caches when a MAC address changes, preventing stale cache entries after failover. The Hop Limit of 255 prevents spoofed NAs from remote attackers.
