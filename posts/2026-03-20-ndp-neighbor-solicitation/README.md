# How to Understand Neighbor Solicitation (NS) Messages

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NDP, Neighbor Solicitation, IPv6, Address Resolution, RFC 4861

Description: Understand ICMPv6 Neighbor Solicitation messages, their three use cases (address resolution, DAD, NUD), the solicited-node multicast target, and NS message format.

## Introduction

Neighbor Solicitation (NS) is ICMPv6 Type 135, the IPv6 replacement for ARP requests. NS messages are used in three distinct contexts: address resolution (mapping IPv6 to MAC), Duplicate Address Detection (verifying an address is not already in use), and Neighbor Unreachability Detection (verifying an existing neighbor is still reachable). Each context uses different source addresses and destinations.

## NS Message Format

```text
ICMPv6 Neighbor Solicitation (Type 135):

 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|     Type=135  |   Code = 0    |          Checksum             |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                           Reserved                            |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                                                               |
+                       Target Address                          +
|                        (128 bits)                             |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|   Options: Source Link-Layer Address (if source is not ::)   |

IPv6 Header:
  Source:      Sender's link-local address (or :: for DAD)
  Destination: Solicited-node multicast of target (or unicast for NUD)
  Hop Limit:   255 (mandatory for NDP)
```

## Three Contexts for NS Messages

```text
Context 1: Address Resolution (IPv6 → MAC mapping)
  Purpose:  Find the MAC address for a known IPv6 address
  Source:   Sender's link-local address (fe80::...)
  Dest:     Solicited-node multicast of Target Address
            (ff02::1:ffXX:XXXX where XX:XXXX = last 24 bits of target)
  Target:   The IPv6 address being resolved
  Option:   Source Link-Layer Address option (sender's MAC)
  Reply:    Neighbor Advertisement with Target Link-Layer Address

Context 2: Duplicate Address Detection (DAD)
  Purpose:  Verify a tentative address is not already used
  Source:   :: (unspecified - host doesn't have the address yet)
  Dest:     Solicited-node multicast of the tentative address
  Target:   The tentative address being checked
  Option:   No Source Link-Layer Address (source is ::)
  Reply:    If anyone sends NA: address is duplicate → host must not use it
            If no reply in 1 second: address is unique → use it

Context 3: Neighbor Unreachability Detection (NUD)
  Purpose:  Verify an existing neighbor is still reachable
  Source:   Sender's address (unicast)
  Dest:     Unicast address of the neighbor (not multicast)
  Target:   Same as destination
  Option:   Source Link-Layer Address
  Reply:    Unicast Neighbor Advertisement → neighbor is alive
```

## Capturing NS Messages

```bash
# Capture all Neighbor Solicitation messages

sudo tcpdump -i eth0 -v "icmp6 and ip6[40] == 135"

# Capture DAD NS messages (source is ::)
sudo tcpdump -i eth0 -v "icmp6 and ip6[40] == 135 and src ::"

# Capture address resolution NS (source is link-local)
sudo tcpdump -i eth0 -v \
    "icmp6 and ip6[40] == 135 and src fe80::/10"

# Capture NUD NS messages (destination is unicast, not multicast)
# NUD NS go to unicast destination
sudo tcpdump -i eth0 -v \
    "icmp6 and ip6[40] == 135 and not dst ff02::/16"

# Trigger an NS by pinging an address not yet in neighbor cache
ping6 -c 1 2001:db8::1
# Watch for the NS being sent
```

## NS and Solicited-Node Multicast

```python
import socket

def solicited_node_multicast(ipv6_addr: str) -> str:
    """Calculate the solicited-node multicast address for an IPv6 address."""
    addr_bytes = socket.inet_pton(socket.AF_INET6, ipv6_addr)
    # ff02::1:ff + last 3 bytes of IPv6 address
    snm_bytes = (b'\xff\x02' + b'\x00' * 9 +
                 b'\x01\xff' + addr_bytes[-3:])
    return socket.inet_ntop(socket.AF_INET6, snm_bytes)

# Address resolution NS for 2001:db8::1
target = "2001:db8::1"
ns_dest = solicited_node_multicast(target)
print(f"NS Target: {target}")
print(f"NS Destination: {ns_dest}")

# The corresponding Ethernet multicast MAC for this IPv6 multicast:
# 33:33:ff:XX:XX:XX where XX:XX:XX = last 3 bytes of IPv6 multicast
addr_bytes = socket.inet_pton(socket.AF_INET6, ns_dest)
ethernet_mc = f"33:33:{addr_bytes[-4]:02x}:{addr_bytes[-3]:02x}:{addr_bytes[-2]:02x}:{addr_bytes[-1]:02x}"
print(f"Ethernet multicast: {ethernet_mc}")
```

## Conclusion

Neighbor Solicitation is the most versatile NDP message, serving address resolution, DAD, and NUD with the same message format but different source addresses and destinations. The key differentiator: DAD NS uses `::` as source (host doesn't own the address yet), address resolution NS uses the sender's link-local address with a solicited-node multicast destination, and NUD NS uses unicast to the target. The mandatory Hop Limit of 255 ensures that only local nodes (not remote attackers) can inject NS messages.
