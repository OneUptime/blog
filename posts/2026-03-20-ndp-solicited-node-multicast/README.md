# How to Understand Solicited-Node Multicast Addresses in NDP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NDP, Solicited-Node Multicast, IPv6, Address Resolution, RFC 4291

Description: Understand how solicited-node multicast addresses are derived from IPv6 unicast addresses, why they make NDP more efficient than ARP, and how to calculate them.

## Introduction

Solicited-node multicast addresses are special IPv6 multicast addresses used exclusively for NDP Neighbor Solicitation. Each IPv6 unicast address has a corresponding solicited-node multicast address formed from the low 24 bits of the unicast address. NS messages for address resolution are sent to this multicast address rather than a broadcast, meaning only nodes whose last 24 address bits match need to receive and process the NS.

## Solicited-Node Multicast Address Format

```text
Solicited-node multicast format:

ff02::1:ff00:0000/104 + low 24 bits of unicast address

More specifically:
  ff02:0000:0000:0000:0000:0001:ff[XX:XXXX]

Where [XX:XXXX] = last 3 bytes of the IPv6 unicast address

Examples:
  Unicast: 2001:db8::1
  Low 24 bits of 0000:0001 = 00:00:01
  Solicited-node: ff02::1:ff00:0001

  Unicast: 2001:db8::1234:5678
  Low 24 bits of 1234:5678 = 34:56:78
  Solicited-node: ff02::1:ff34:5678

  Unicast: fe80::a00:27ff:fe11:2233
  Low 24 bits of fe11:2233 = 11:22:33
  Solicited-node: ff02::1:ff11:2233
```

## Calculating Solicited-Node Multicast

```python
import socket

def solicited_node_multicast(ipv6_addr: str) -> str:
    """
    Calculate the solicited-node multicast address for an IPv6 address.

    Args:
        ipv6_addr: Any IPv6 unicast address (string format)

    Returns:
        Solicited-node multicast address as string
    """
    # Convert to 16 bytes
    addr_bytes = socket.inet_pton(socket.AF_INET6, ipv6_addr)

    # Extract last 3 bytes (24 bits)
    last_3_bytes = addr_bytes[-3:]

    # Build ff02::1:ff<XX>:<XXXX>
    multicast_bytes = (
        b'\xff\x02' +            # ff02
        b'\x00' * 9 +            # 9 zero bytes
        b'\x01\xff' +            # 01 ff (the 1 from ff02::1, then ff)
        last_3_bytes             # Last 3 bytes of unicast address
    )

    return socket.inet_ntop(socket.AF_INET6, multicast_bytes)

def solicited_node_ethernet_multicast(ipv6_addr: str) -> str:
    """
    Get the Ethernet multicast MAC for the solicited-node multicast address.
    Ethernet multicast MAC: 33:33:XX:XX:XX:XX
    where XX:XX:XX:XX = last 4 bytes of IPv6 multicast address
    """
    snm = solicited_node_multicast(ipv6_addr)
    snm_bytes = socket.inet_pton(socket.AF_INET6, snm)

    # Ethernet multicast from IPv6 multicast: 33:33 + last 4 bytes
    eth_mac = (b'\x33\x33' + snm_bytes[-4:])
    return ':'.join(f'{b:02x}' for b in eth_mac)

# Test with various addresses

test_addresses = [
    "2001:db8::1",
    "2001:db8::1234:5678",
    "fe80::dead:beef",
    "2001:db8::100",
    "2001:db8::200",  # Different low 24 bits from ::100 -> different SNM group
]

print(f"{'IPv6 Address':<30} {'Solicited-Node Multicast':<40} {'Ethernet MAC'}")
print("-" * 80)
for addr in test_addresses:
    snm = solicited_node_multicast(addr)
    eth = solicited_node_ethernet_multicast(addr)
    print(f"{addr:<30} {snm:<40} {eth}")
```

## Joining Solicited-Node Multicast Groups

```bash
# Each IPv6 address has a corresponding solicited-node multicast group
# The network stack automatically joins these groups

# View multicast group memberships on an interface
ip -6 maddr show eth0 | grep "ff02::1:ff"
# Shows all solicited-node multicast groups joined

# Expected output example:
# 5:  eth0
#     inet6 ff02::1:ff00:1 users 1     ← for address ::1
#     inet6 ff02::1:ff11:2233 users 1  ← for address with low 24=11:22:33

# When you add an IPv6 address, Linux automatically joins its solicited-node group
sudo ip -6 addr add 2001:db8::9999/64 dev eth0
ip -6 maddr show eth0 | grep "ff02::1:ff"
# Should now show ff02::1:ff00:9999 added
```

## Why Solicited-Node Multicast Is More Efficient Than Broadcast

```text
ARP (IPv4) broadcast analysis:
  A NS-equivalent ARP request goes to: ff:ff:ff:ff:ff:ff (Ethernet broadcast)
  EVERY host on the segment must:
    1. Receive the frame (NIC interrupt)
    2. Process the ARP request
    3. Determine if the target IP is theirs
    4. Reply or discard

  On a segment with N hosts: N-1 hosts receive and process each ARP

NDP solicited-node multicast analysis:
  A NS goes to: 33:33:ff:<XX:XX:XX> (specific Ethernet multicast)
  Only hosts whose NIC matches the multicast group receive it:
    - Hosts subscribed to ff02::1:ff<XX:XX:XX> (same last 24 bits)
    - On average, 1 host out of every 2^24 share last 24 bits

  Collision probability on a 1000-host segment:
  P(collision) = 1 - (1 - 1/2^24)^999 ≈ 1000/2^24 ≈ 0.006%
  → Effectively 1 host processes each NS (huge efficiency gain)
```

## Conclusion

Solicited-node multicast addresses are derived from the low 24 bits of IPv6 unicast addresses, creating a multicast group that typically has only 1 member on real networks. This makes NDP address resolution dramatically more efficient than IPv4's ARP broadcast: only the target (and statistically rare other hosts with matching low 24 bits) needs to process each NS, while all other hosts can ignore it at the NIC level. The Ethernet multicast MAC (`33:33:xx:xx:xx:xx`) allows switch hardware to filter these frames to only interested ports.
