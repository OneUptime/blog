# How to Calculate IPv4 Address Requirements for a New Office

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Network Planning, Subnetting, Office Networks, DHCP

Description: Calculate how many IPv4 addresses a new office needs by inventorying device types, applying growth and DHCP overhead factors, and selecting appropriately sized subnets.

## Introduction

Allocating too small a subnet for an office causes address exhaustion; too large wastes the address space and complicates security. A structured calculation ensures you pick the right prefix length from the start.

## Device Inventory Worksheet

```text
Device Category         Count   Notes
─────────────────────────────────────────────────
Workstations (wired)     50     DHCP
Workstations (wireless)  80     DHCP
Laptops (wireless)       60     DHCP
VoIP phones              50     Separate VLAN
Printers / MFPs          10     Static (Corporate VLAN)
Servers / NAS             5     Static (Infrastructure VLAN)
Network devices           8     Static (Infrastructure VLAN)
Guest Wi-Fi             100     Separate VLAN, dynamic
IoT devices              20     Separate VLAN
─────────────────────────────────────────────────
Totals per VLAN:
  Corporate (clients + printers): 200 devices
  VoIP:                               50
  Guest:                             100
  IoT:                                20
  Infrastructure:                     13
```

## Subnet Sizing Formula

```text
Required usable addresses = ceil(devices × 1.3)
                            (30% growth buffer)

Choose the next subnet that provides at least that many usable addresses.
Then leave 10-15% of the chosen subnet unassigned for DHCP/admin reserve.
```

## Python Calculator

```python
import ipaddress
import math

def required_prefix(device_count: int, growth_pct: float = 0.30) -> int:
    """Return the smallest CIDR prefix that fits the planned host count."""
    if device_count < 1:
        raise ValueError("device_count must be positive")

    required_usable = math.ceil(device_count * (1 + growth_pct))
    host_bits = math.ceil(math.log2(required_usable + 2))
    return 32 - host_bits

segments = {
    "Corporate":      200,
    "VoIP":            50,
    "Guest":          100,
    "IoT":             20,
    "Infrastructure":  13,
}

for name, count in segments.items():
    prefix = required_prefix(count)
    usable_hosts = ipaddress.IPv4Network(f"0.0.0.0/{prefix}").num_addresses - 2
    planned_hosts = math.ceil(count * 1.3)
    print(f"{name:<18} devices={count:3d}  "
          f"recommended=/{prefix}  "
          f"({usable_hosts:3d} usable)  "
          f"headroom={usable_hosts - planned_hosts:3d}")
```

## Sample Output and Subnet Selection

```text
Corporate          devices=200  recommended=/23  (510 usable)  headroom=250
VoIP               devices= 50  recommended=/25  (126 usable)  headroom= 61
Guest              devices=100  recommended=/24  (254 usable)  headroom=124
IoT                devices= 20  recommended=/27  ( 30 usable)  headroom=  4
Infrastructure     devices= 13  recommended=/27  ( 30 usable)  headroom= 13
```

## DHCP Scope Sizing

```text
For a /24 (254 usable):
  Static reservations:  10  (printers)
  DHCP pool:           220  (lease entries)
  Admin/growth reserve: 24
  ─────────────────────────
  Total:               254
```

## Recommended Addressing for a 200-Person Office

```text
10.50.0.0/22   - Office total allocation
  10.50.0.0/23   VLAN 10  Corporate
  10.50.2.0/25   VLAN 20  VoIP
  10.50.3.0/24   VLAN 30  Guest
  10.50.2.128/27 VLAN 40  IoT
  10.50.2.160/27 VLAN 99  Infrastructure
```

## Conclusion

Start with a device inventory, apply a 30% growth buffer, and choose the next subnet that provides enough usable addresses. Segment VoIP, guest, IoT, and corporate traffic into separate VLANs, then leave some DHCP/admin reserve inside each VLAN where practical. Allocate a parent block large enough to summarize all office subnets into a single route advertisement.
