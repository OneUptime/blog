# How to Calculate IPv6 Subnets from a /56 Allocation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Subnetting, Address Planning, ISP, Networking

Description: Learn how to calculate and distribute IPv6 /64 subnets from a /56 prefix allocation typically given to residential customers or small branches.

## Introduction

A /56 prefix is commonly assigned to residential internet customers, small businesses, or individual branch offices. From a /56, you have 8 bits of subnet space (bits 57-64), giving you 256 individual /64 subnets. Understanding how to use this allocation effectively is key to proper IPv6 home and small office networking.

## The Math

```text
/56 prefix: 128 - 56 = 72 bits remaining
Subnet bits: 64 - 56 = 8 bits for subnet numbering
Interface ID: 64 bits

Available /64 subnets: 2^8 = 256
```

## Visual Layout

```yaml
|<----------- 56 bits ----------->|<-- 8 bits -->|<--- 64 bits --->|
|       ISP-assigned prefix        |  Subnet ID   |  Interface ID   |
|       2001:db8:1100::/56         |   00-ff      |    host bits    |
```

## Enumerating All /64 Subnets

```python
import ipaddress

def subnets_from_56(prefix_56):
    """List all /64 subnets from a /56 allocation."""
    network = ipaddress.IPv6Network(prefix_56)
    subnets = list(network.subnets(new_prefix=64))

    print(f"Prefix: {prefix_56}")
    print(f"Total /64 subnets: {len(subnets)}")
    print(f"Subnet ID range: 0x00 to 0xFF (0 to 255)")
    print()

    # Show first and last 5
    print("First 5 subnets:")
    for s in subnets[:5]:
        # Extract the subnet ID byte
        addr_int = int(s.network_address)
        subnet_id = (addr_int >> 64) & 0xFF
        print(f"  ID 0x{subnet_id:02x} ({subnet_id:3d}): {s}")

    print("\nLast 5 subnets:")
    for s in subnets[-5:]:
        addr_int = int(s.network_address)
        subnet_id = (addr_int >> 64) & 0xFF
        print(f"  ID 0x{subnet_id:02x} ({subnet_id:3d}): {s}")

subnets_from_56("2001:db8:1100::/56")
```

Output:
```text
Prefix: 2001:db8:1100::/56
Total /64 subnets: 256
Subnet ID range: 0x00 to 0xFF

First 5 subnets:
  ID 0x00 (  0): 2001:db8:1100::/64
  ID 0x01 (  1): 2001:db8:1100:1::/64
  ID 0x02 (  2): 2001:db8:1100:2::/64
  ID 0x03 (  3): 2001:db8:1100:3::/64
  ID 0x04 (  4): 2001:db8:1100:4::/64

Last 5 subnets:
  ID 0xfb (251): 2001:db8:1100:fb::/64
  ID 0xfc (252): 2001:db8:1100:fc::/64
  ID 0xfd (253): 2001:db8:1100:fd::/64
  ID 0xfe (254): 2001:db8:1100:fe::/64
  ID 0xff (255): 2001:db8:1100:ff::/64
```

## Practical Subnet Allocation for Home/SMB

With 256 subnets, a typical small office could use:

```text
Subnet  0 (2001:db8:1100:0::/64):   Transit/uplink (if routed internally; sometimes /127 or /64)
Subnet  1 (2001:db8:1100:1::/64):   Primary LAN (user devices, SLAAC)
Subnet  2 (2001:db8:1100:2::/64):   IoT network (cameras, smart home)
Subnet  3 (2001:db8:1100:3::/64):   Guest WiFi
Subnet  4 (2001:db8:1100:4::/64):   Servers / DMZ
Subnet  5 (2001:db8:1100:5::/64):   Management (switches, APs)
Subnet 10 (2001:db8:1100:a::/64):   VoIP phones
Subnet 20 (2001:db8:1100:14::/64):  Printers and peripherals
Subnet ff (2001:db8:1100:ff::/64):  Reserved for future use
```

## Router Configuration Example

For a CPE router receiving a /56 via DHCPv6-PD:

```bash
# /etc/radvd.conf - advertise subnet 1 to LAN

interface eth1 {
    AdvSendAdvert on;
    MinRtrAdvInterval 3;
    MaxRtrAdvInterval 30;
    prefix 2001:db8:1100:1::/64 {
        AdvOnLink on;
        AdvAutonomous on;
    };
};

# Allocate subnets to VLANs
# VLAN 1 (users):     2001:db8:1100:1::/64
# VLAN 2 (IoT):       2001:db8:1100:2::/64
# VLAN 3 (guest):     2001:db8:1100:3::/64
```

## Comparing /48 vs /56 Allocations

| Property | /48 (Org/Enterprise) | /56 (Residential/Branch) |
|---|---|---|
| Typical recipient | Organization | Home/SMB customer |
| Subnet bits | 16 | 8 |
| /64 subnets | 65,536 | 256 |
| /60 blocks | 4,096 | 16 |
| Expandable | Yes (request larger) | Limited to 256 VLANs |
| Typical ISP policy | Business class | Residential broadband |

## When 256 Subnets Is Not Enough

If you need more than 256 subnets from a /56:

1. **Request a /48 from your ISP** - gives 65,536 /64 subnets
2. **Use a /60 delegation** for downstream routers when you need hierarchy (16 /64 subnets each, but still within the same /56)
3. **Combine multiple /56 allocations** if the ISP provides them

## Conclusion

A /56 allocation provides 256 /64 subnets - ample for most home networks and small offices. The 8-bit subnet ID (0x00-0xFF) gives straightforward hexadecimal numbering. When designing your subnet plan, reserve low-numbered subnets for infrastructure and transit links, use sequential numbers for VLANs, and leave some headroom for future growth.
