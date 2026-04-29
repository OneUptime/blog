# How to Map IPv4 Multicast Addresses to MAC Addresses

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, Multicast, MAC Address, IPv4, Ethernet, Layer 2

Description: Understand and calculate the IEEE 802.3 Ethernet multicast MAC address that corresponds to any IPv4 multicast group address, and verify the mapping on Linux.

## Introduction

On Ethernet, multicast frames use a special destination MAC address rather than the broadcast MAC address. The mapping from IPv4 multicast address to Ethernet MAC address follows a deterministic formula defined by IANA and IEEE. Understanding this mapping helps diagnose switch flooding, IGMP snooping issues, and MAC-address filter configurations.

## The Mapping Formula

IANA reserved the Ethernet multicast MAC prefix **01:00:5E:00:00:00**. The mapping rule:

1. Start with the prefix `01:00:5E`
2. Set bit 25 of the MAC to 0 (already done in the prefix)
3. Copy the **low-order 23 bits** of the IPv4 multicast address into the last 3 bytes of the MAC

Because only 23 bits of the 28-bit multicast group ID are used, the mapping is **many-to-one**: 32 different IP multicast addresses map to the same MAC.

## Manual Calculation Example

For group `239.1.2.3`:

```text
IP in binary:
239 = 1110 1111
  1 = 0000 0001
  2 = 0000 0010
  3 = 0000 0011

Low 23 bits of the address:
Take octets 2–4 and keep only the low 7 bits of octet 2:
   1 = 0000 0001   (low 7 bits → 000 0001)
   2 = 0000 0010
   3 = 0000 0011

Result: 01:02:03

MAC = 01:00:5E:01:02:03
```

## Python Script to Calculate the MAC

```python
#!/usr/bin/env python3
import ipaddress

def multicast_ip_to_mac(group: str) -> str:
    """Convert an IPv4 multicast address to its Ethernet MAC address."""
    ip = ipaddress.IPv4Address(group)
    octets = ip.packed  # 4 bytes

    # Low 23 bits = last 23 bits of the 32-bit address
    # Extract bytes 2, 3, 4 (index 1, 2, 3) and mask byte 1 to 7 bits
    mac = f"01:00:5e:{octets[1] & 0x7f:02x}:{octets[2]:02x}:{octets[3]:02x}"
    return mac

# Examples

groups = ["224.0.0.1", "224.0.0.251", "239.1.2.3", "232.10.20.30"]
for g in groups:
    print(f"{g:16s}  →  {multicast_ip_to_mac(g)}")
```

Output:

```text
224.0.0.1         →  01:00:5e:00:00:01
224.0.0.251       →  01:00:5e:00:00:fb
239.1.2.3         →  01:00:5e:01:02:03
232.10.20.30      →  01:00:5e:0a:14:1e
```

## Verifying the Mapping on Linux

When a host joins a multicast group, the kernel automatically adds the corresponding MAC to the interface:

```bash
# Join a group and observe the MAC being added
python3 -c "
import socket, time
sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
mreq = socket.inet_aton('239.1.2.3') + socket.inet_aton('0.0.0.0')
sock.setsockopt(socket.IPPROTO_IP, socket.IP_ADD_MEMBERSHIP, mreq)
print('Joined 239.1.2.3')
time.sleep(30)
" &

# Check the link-layer multicast addresses
ip maddr show
```

The output will show the joined `inet` group and the corresponding link-layer MAC (`01:00:5e:01:02:03`) on the selected interface.

## Address Collision: 32-to-1 Ambiguity

Because only 23 bits are used, every MAC maps to 32 IP addresses. For example, all of these map to `01:00:5e:01:02:03`:

- `224.1.2.3`, `225.1.2.3`, `226.1.2.3` ... `239.1.2.3`
- `224.129.2.3`, `225.129.2.3`, `226.129.2.3` ... `239.129.2.3`

Switches using IGMP snooping may forward all 32 groups to a port that has only joined one, a potential source of unexpected traffic.

## Conclusion

IPv4 multicast MAC addresses are deterministic and easy to calculate. Knowing the mapping lets you interpret switch forwarding tables, understand why certain traffic is flooded even with IGMP snooping enabled, and configure MAC-level multicast filters correctly.
