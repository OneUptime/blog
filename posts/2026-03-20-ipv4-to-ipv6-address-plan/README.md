# How to Transition an IPv4 Address Plan to IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, IPv4, Migration, Dual-Stack, Address Planning

Description: Learn how to map your existing IPv4 address plan to an IPv6 equivalent, maintain dual-stack operation, and progressively transition to IPv6-first networking.

## Introduction

Transitioning from an IPv4 address plan to IPv6 does not mean discarding what you have - it means creating an IPv6 parallel that mirrors your existing structure, then gradually shifting preference from IPv4 to IPv6. The key is maintaining dual-stack operation during the transition so services remain accessible over both protocols.

## Mapping IPv4 to IPv6 Structure

```text
IPv4 Plan Example:
  10.0.1.0/24    HQ User LAN      (VLAN 1)
  10.0.10.0/24   HQ Servers       (VLAN 10)
  10.0.20.0/24   HQ DMZ           (VLAN 20)
  192.168.1.0/24 Branch1 LAN
  192.168.2.0/24 Branch2 LAN

IPv6 Equivalent:
  2001:db8:100:0001::/64  HQ User LAN  (VLAN 1)
  2001:db8:100:000a::/64  HQ Servers   (VLAN 10)
  2001:db8:100:0014::/64  HQ DMZ       (VLAN 20)
  2001:db8:100:1100::/56  Branch 1 (split to /64 per VLAN)
  2001:db8:100:1200::/56  Branch 2
```

The VLAN ID is preserved in the IPv6 subnet number (decimal 10 = hex 0x0a), making the relationship between the IPv4 and IPv6 plans immediately apparent.

## Python: Generate IPv6 Plan from IPv4 Plan

```python
import ipaddress

def ipv4_to_ipv6_mapping(ipv6_48_prefix: str, ipv4_subnets: list) -> dict:
    """
    Generate IPv6 /64 subnets corresponding to IPv4 subnets.
    Uses the VLAN ID as the IPv6 subnet ID.
    """
    v6_base = ipaddress.IPv6Network(ipv6_48_prefix)
    if v6_base.prefixlen != 48:
        raise ValueError("Expected a /48 IPv6 prefix")
    mapping = {}

    for entry in ipv4_subnets:
        ipv4_net = ipaddress.IPv4Network(entry["prefix"])
        subnet_id = int(entry["vlan"])
        if not 0 <= subnet_id <= 0xffff:
            raise ValueError("VLAN ID must fit in 16 bits")
        subnet_start = ipaddress.IPv6Address(
            int(v6_base.network_address) + (subnet_id << 64)
        )
        ipv6_subnet = ipaddress.IPv6Network(f"{subnet_start}/64")
        mapping[entry["name"]] = {
            "ipv4": ipv4_net,
            "ipv6": ipv6_subnet,
            "vlan": subnet_id,
        }
    return mapping

ipv4_plan = [
    {"prefix": "10.0.1.0/24",  "name": "HQ Users",   "vlan": 1},
    {"prefix": "10.0.10.0/24", "name": "HQ Servers",  "vlan": 10},
    {"prefix": "10.0.20.0/24", "name": "HQ DMZ",      "vlan": 20},
]

mapping = ipv4_to_ipv6_mapping("2001:db8:100::/48", ipv4_plan)
for name, info in mapping.items():
    print(f"{name:15s}: {str(info['ipv4']):18s} → {info['ipv6']}")
```

## Dual-Stack Transition Plan

```mermaid
graph LR
    P1["Phase 1<br/>IPv4 only"] --> P2["Phase 2<br/>Dual-stack<br/>(IPv4 preferred)"]
    P2 --> P3["Phase 3<br/>Dual-stack<br/>(IPv6 preferred)"]
    P3 --> P4["Phase 4<br/>IPv6 only<br/>(IPv4 for legacy)"]
```

### Phase 1: Preparation
- Obtain IPv6 prefix from ISP or RIR
- Design the IPv6 address plan mirroring IPv4 structure
- Test IPv6 connectivity on a lab VLAN

### Phase 2: Enable Dual-Stack

```bash
# Add IPv6 address alongside IPv4 on each routed interface

sudo ip addr add 192.168.1.1/24 dev eth0         # IPv4 (existing)
sudo ip -6 addr add 2001:db8:100:1::1/64 dev eth0  # IPv6 (new)

# Enable IPv6 on interface
sudo sysctl -w net.ipv6.conf.eth0.disable_ipv6=0

# If this Linux system is the router for the LAN, advertise the prefix with radvd
sudo systemctl start radvd
```

### Phase 3: Shift Preference to IPv6

```bash
# Linux already prefers IPv6 over IPv4 by default under RFC 6724.
# Override /etc/gai.conf only if you need a non-default policy table.

# Ensure IPv6 DNS records exist for all services alongside A records.
# Dual-stack clients can then select IPv6 destinations using the system policy.
```

### Phase 4: IPv4 Cleanup

```bash
# Use NAT64/DNS64 so IPv6-only clients can still reach remaining IPv4-only services
# Remove IPv4 from interfaces progressively
# Keep IPv4 in place for legacy devices that cannot use IPv6
```

## Static Address Mapping Convention

For servers with static IPv4 addresses, create predictable IPv6 equivalents:

```python
import ipaddress

# Convention: embed the last two octets of IPv4 in the IPv6 IID
def ipv4_to_static_ipv6(ipv6_subnet: str, ipv4_addr: str) -> str:
    """
    Create a static IPv6 address by embedding the last two IPv4 octets
    in the interface identifier.
    e.g., 10.0.10.50 → 2001:db8:100:a::a:32
    """
    net = ipaddress.IPv6Network(ipv6_subnet, strict=False)
    if net.prefixlen != 64:
        raise ValueError("Expected a /64 IPv6 subnet")

    ipv4 = ipaddress.IPv4Address(ipv4_addr)
    third, fourth = ipv4.packed[2], ipv4.packed[3]
    iid = (third << 16) | fourth
    return str(ipaddress.IPv6Address(int(net.network_address) + iid))

print(ipv4_to_static_ipv6("2001:db8:100:a::/64", "10.0.10.50"))
# Output: 2001:db8:100:a::a:32
```

## Conclusion

Transitioning an IPv4 address plan to IPv6 is most successful when the IPv6 plan mirrors the IPv4 structure using VLAN IDs as subnet identifiers. Dual-stack operation allows a gradual transition without service disruption. Encode IPv4 last-two-octet conventions into static IPv6 addresses for servers to make the transition visible and reversible. The goal is to eventually prefer IPv6 for all traffic while maintaining IPv4 only for legacy devices that cannot be updated.
