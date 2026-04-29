# How to Split a /48 IPv6 Prefix into /64 Subnets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Subnetting, Address Planning, Networking, CIDR

Description: Step-by-step guide to splitting an IPv6 /48 prefix into /64 subnets, with practical numbering schemes, Python tools, and Linux configuration examples.

## Introduction

Splitting a /48 into /64 subnets is a common IPv6 subnetting task. If your ISP or upstream assigns you a /48, you divide the 16-bit subnet field (bits 49-64) into logical groups for VLANs, departments, and sites. This guide walks through the process with practical tools and numbering strategies.

## Understanding the Split

```yaml
/48 prefix:  2001:db8:abcd::/48
             |<---48--->|<16>|<-------64------->|
             2001:0db8:abcd:SSSS:IIII:IIII:IIII:IIII
                              ^^^^
                         16-bit subnet field
                         Range: 0000 to ffff
                         Count: 65,536 subnets
```

## Python Tool: Subnet Calculator

```python
import ipaddress

class IPv6SubnetPlanner:
    """Tool to split a /48 prefix into /64 subnets."""

    def __init__(self, prefix_48: str):
        self.network = ipaddress.IPv6Network(prefix_48)
        if self.network.prefixlen != 48:
            raise ValueError("Must be a /48 prefix")
        self._subnets = None

    @property
    def subnets(self):
        if self._subnets is None:
            self._subnets = list(self.network.subnets(new_prefix=64))
        return self._subnets

    def get_subnet(self, subnet_id: int) -> ipaddress.IPv6Network:
        """Get a specific /64 subnet by ID (0-65535)."""
        if not 0 <= subnet_id <= 65535:
            raise ValueError(f"Subnet ID must be 0-65535, got {subnet_id}")
        return self.subnets[subnet_id]

    def get_subnet_by_hex(self, hex_id: str) -> ipaddress.IPv6Network:
        """Get subnet by hex subnet ID (e.g., '0a01')."""
        return self.get_subnet(int(hex_id, 16))

    def allocate_block(self, start_id: int, count: int) -> list:
        """Allocate a consecutive block of /64 subnets."""
        return [self.get_subnet(start_id + i) for i in range(count)]

    def summary(self):
        print(f"Prefix: {self.network}")
        print(f"Total /64 subnets: {len(self.subnets):,}")
        print(f"First subnet: {self.subnets[0]}")
        print(f"Last subnet:  {self.subnets[-1]}")

# Example usage

planner = IPv6SubnetPlanner("2001:db8:abcd::/48")
planner.summary()

# Get specific subnets by number
print(planner.get_subnet(0))      # 2001:db8:abcd::/64     (Reserved / infrastructure)
print(planner.get_subnet(1))      # 2001:db8:abcd:1::/64   (VLAN 1)
print(planner.get_subnet(256))    # 2001:db8:abcd:100::/64 (Site 1 start)
print(planner.get_subnet_by_hex("0101"))  # Site 01, VLAN 01

# Allocate 16 subnets for a branch
branch_subnets = planner.allocate_block(0x0100, 16)
for s in branch_subnets:
    print(s)
```

## Recommended Numbering Schemes

### Option 1: Linear Decimal

Simple sequential numbering:
```text
:0001: → VLAN 1
:0002: → VLAN 2
:0003: → VLAN 3
...
:00ff: → VLAN 255
:0100: → VLAN 256 (or next site)
```

### Option 2: Hierarchical Hex (Site + VLAN)

```text
Format: SSNN (2 hex digits site, 2 hex digits VLAN)

:0100: → Site 01, Subnet 00 (management/infrastructure)
:0101: → Site 01, VLAN 01 (users)
:0102: → Site 01, VLAN 02 (IoT)
:0103: → Site 01, VLAN 03 (guests)
:0200: → Site 02, Subnet 00
:0201: → Site 02, VLAN 01
```

### Option 3: Function-Based

```text
:0000: → Core infrastructure / reserved
:0001-00ff: → Servers / DMZ
:0100-01ff: → Management
:0200-02ff: → Production users
:0300-03ff: → Development
:0400-04ff: → Guest / IoT
:1000-1fff: → Remote sites (256 sites × 16 subnets each)
:f000-ffff: → Reserved / experimental
```

## Assigning Subnets on Linux

```bash
# Assign a /64 subnet to an interface
sudo ip -6 addr add 2001:db8:abcd:0000::1/64 dev eth0

# Configure multiple subnets for VLANs
# VLAN 1
sudo ip link add link eth0 name eth0.1 type vlan id 1
sudo ip link set dev eth0.1 up
sudo ip -6 addr add 2001:db8:abcd:0001::1/64 dev eth0.1

# VLAN 2
sudo ip link add link eth0 name eth0.2 type vlan id 2
sudo ip link set dev eth0.2 up
sudo ip -6 addr add 2001:db8:abcd:0002::1/64 dev eth0.2

# Verify routing
ip -6 route show | grep "2001:db8:abcd"
```

## Documenting Your Subnet Plan

A simple YAML format for documentation:

```yaml
# ipv6-subnets.yaml
prefix: "2001:db8:abcd::/48"
allocations:
  - id: "0001"
    subnet: "2001:db8:abcd:1::/64"
    description: "HQ - User LAN (VLAN 1)"
    site: HQ
    vlan: 1
  - id: "0002"
    subnet: "2001:db8:abcd:2::/64"
    description: "HQ - IoT (VLAN 2)"
    site: HQ
    vlan: 2
  - id: "0101"
    subnet: "2001:db8:abcd:101::/64"
    description: "Branch1 - User LAN"
    site: Branch1
    vlan: 1
```

## Conclusion

Splitting a /48 into /64 subnets is straightforward: the 16-bit subnet field (bits 49-64) gives you 65,536 subnets to allocate. The critical design decision is your numbering scheme - hierarchical hex encoding (site + VLAN) scales best for multi-site organizations, while simple sequential numbering works for single-site deployments. Always document your allocation plan before configuring devices.
