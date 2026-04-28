# How to Understand Router Solicitation (RS) Messages

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NDP, Router Solicitation, IPv6, SLAAC, RFC 4861

Description: Understand the structure and purpose of ICMPv6 Router Solicitation messages, when they are sent, and how they trigger immediate Router Advertisements for faster IPv6 address configuration.

## Introduction

Router Solicitation (RS) is ICMPv6 Type 133, sent by hosts to discover routers on the local link without waiting for the router's periodic Router Advertisement interval. When a host configures a new interface, it sends up to 3 RSs at 4-second intervals before giving up and waiting for periodic RAs. RSs are sent to the all-routers multicast address `ff02::2`, ensuring all routers on the link respond.

## Router Solicitation Message Format

```text
ICMPv6 Router Solicitation (Type 133):

 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|     Type=133  |   Code = 0    |          Checksum             |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                            Reserved                           |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|   Options ...
+-+-+-+-+-+-+-+-+-+-+-+-

IPv6 Header:
  Source:      Link-local address of the host (or :: during DAD)
  Destination: ff02::2 (all-routers multicast)
  Hop Limit:   255 (RFC 4861 requires HL=255 for NDP)

Options (optional):
  Source Link-Layer Address: Host's MAC address
  (omitted if source is ::)
```

## RS Timing and Behavior

```text
RFC 4861 RS timing parameters:

MAX_RTR_SOLICITATIONS:     3 (maximum RS attempts)
RTR_SOLICITATION_INTERVAL: 4 seconds (wait between RSs)
MAX_RTR_SOLICITATION_DELAY: 1 second (initial random delay before first RS)

Process:
1. Host configures new interface
2. Wait random delay (0 to MAX_RTR_SOLICITATION_DELAY)
   → Prevents RS storm when many hosts restart simultaneously
3. Send RS to ff02::2
4. Wait up to RTR_SOLICITATION_INTERVAL for RA reply
5. If no reply: send another RS (up to MAX_RTR_SOLICITATIONS)
6. If no RA received after all attempts: wait for periodic RA
```

## Capturing and Analyzing RS Messages

```bash
# Capture Router Solicitation messages

sudo tcpdump -i eth0 -v "icmp6 and ip6[40] == 133"

# Example verbose output:
# 14:23:45.100 IP6 (hlim 255, next-header ICMPv6 (58) payload length: 16)
#   fe80::a211:bbff:fecc:ddee > ff02::2: [icmp6 sum ok]
#   ICMP6, router solicitation, length 16
#     source link-address option (1), length 8 (1): a0:11:bb:cc:dd:ee

# The Hop Limit must be 255 for RS (any lower = not from a local node)
# This prevents remote attacks using forged RS messages

# Send an RS manually (triggers RA from router)
# The 'rdisc6' tool sends RS and shows the RA response
sudo rdisc6 eth0

# Or trigger RS by disabling/re-enabling the interface
sudo ip link set eth0 down && sudo ip link set eth0 up
# Then watch for RS being sent
sudo tcpdump -i eth0 -v "icmp6 and ip6[40] == 133"
```

## Building an RS Message in Python

```python
import struct
import socket

def build_router_solicitation(src_mac: str) -> bytes:
    """
    Build an ICMPv6 Router Solicitation message.

    Args:
        src_mac: Source MAC address (e.g., 'a0:11:bb:cc:dd:ee')

    Returns:
        RS message bytes (without IPv6 header)
    """
    # Type=133, Code=0, Checksum=0 (placeholder), Reserved=0
    rs_header = struct.pack("!BBHI", 133, 0, 0, 0)

    # Source Link-Layer Address option (Type=1)
    mac_bytes = bytes(int(x, 16) for x in src_mac.split(':'))
    # Option type=1, Length=1 (in 8-byte units), MAC=6 bytes, pad=0
    sllao = struct.pack("!BB", 1, 1) + mac_bytes

    return rs_header + sllao

# Example
rs_message = build_router_solicitation("a0:11:bb:cc:dd:ee")
print(f"RS message ({len(rs_message)} bytes): {rs_message.hex()}")

# IPv6 header for RS:
# Source: fe80::<EUI-64 from MAC> or ::
# Destination: ff02::2 (all-routers multicast)
# Hop Limit: 255 (MANDATORY per RFC 4861)
# Next Header: 58 (ICMPv6)
```

## Security Considerations

```text
RS security issues:

1. RS flood attack:
   Attacker sends many RS messages
   All routers on link must process each RS
   Mitigation: Rate limit RS at the router
   Router should not reply to RS from unknown/untrusted sources

2. RS source address spoofing:
   Attacker spoofs RS from victim's link-local address
   Router sends RA to the spoofed source
   Mitigation: HL=255 check ensures RS comes from local node
   (Spoofed RS from remote attacker will have HL < 255 by the time it arrives)

3. RA Guard (prevents malicious RA responses to RS):
   Switches block RA messages from non-router ports
   Even if someone sends a fake RS, RA Guard blocks spoofed RA replies
```

## Conclusion

Router Solicitation is the host's "hey, any routers out there?" message. It accelerates IPv6 address configuration by requesting an immediate RA rather than waiting up to 600 seconds (the default MaxRtrAdvInterval per RFC 4861) for the router's periodic advertisement. The Hop Limit of 255 is a critical security feature that ensures RSs can only be from local link nodes. The Source Link-Layer Address option allows the router to update its neighbor cache, enabling immediate unicast replies. Understanding RS behavior is essential when troubleshooting slow IPv6 address assignment or verifying SLAAC operation.
