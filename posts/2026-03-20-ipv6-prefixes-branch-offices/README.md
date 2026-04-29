# How to Assign IPv6 Prefixes to Branch Offices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Branch Networking, WAN, Address Planning, DHCPv6-PD

Description: Learn how to systematically assign IPv6 prefixes to branch offices using hierarchical allocation, DHCPv6 Prefix Delegation, and consistent numbering conventions.

## Introduction

Assigning IPv6 prefixes to branch offices requires a systematic approach that enables route summarization, simplifies firewall policies, and scales as new branches are added. The standard approach is to give each branch a /56 or /48 prefix from a dedicated block, with the branch number encoded in the prefix for easy identification.

## Branch Allocation Strategy

```text
Organization /40: 2001:db8:1000::/40 (from ISP /32)

Branch range: 2001:db8:1010::/48 (256 possible /56 branches)

Each branch gets a /56:
  Branch 001: 2001:db8:1010:100::/56  (256 /64 subnets)
  Branch 002: 2001:db8:1010:200::/56
  Branch 003: 2001:db8:1010:300::/56
  ...
  Branch 255: 2001:db8:1010:ff00::/56

Encoding: Branch number in the high-order byte of the 4th hextet
  Branch 001 → 0x01 → 1010:100::/56
  Branch 010 → 0x0a → 1010:a00::/56
  Branch 255 → 0xff → 1010:ff00::/56
```

## Python: Branch Prefix Allocator

```python
import ipaddress

class BranchAllocator:
    """Allocate /56 prefixes to branch offices from a /48 block."""

    def __init__(self, branch_block: str):
        self.block = ipaddress.IPv6Network(branch_block)
        if self.block.prefixlen != 48:
            raise ValueError("Branch block must be a /48")
        self._branches = {}

    def allocate_branch(self, branch_id: int, branch_name: str) -> ipaddress.IPv6Network:
        """Allocate a /56 to a branch. branch_id must be 1-255."""
        if not 1 <= branch_id <= 255:
            raise ValueError("Branch ID must be 1-255")
        if branch_id in self._branches:
            return self._branches[branch_id]["prefix"]

        # Calculate the /56 for this branch
        subnets_56 = list(self.block.subnets(new_prefix=56))
        prefix = subnets_56[branch_id]

        self._branches[branch_id] = {
            "name": branch_name,
            "prefix": prefix,
            "subnets": list(prefix.subnets(new_prefix=64)),
        }
        return prefix

    def get_branch_subnet(self, branch_id: int, subnet_id: int) -> ipaddress.IPv6Network:
        """Get a specific /64 from a branch's /56."""
        if branch_id not in self._branches:
            raise ValueError(f"Branch {branch_id} not allocated")
        subnets = self._branches[branch_id]["subnets"]
        return subnets[subnet_id]

    def report(self):
        print(f"Branch Prefix Report")
        print(f"Parent block: {self.block}")
        print(f"Branches: {len(self._branches)}")
        print()
        for bid, info in sorted(self._branches.items()):
            print(f"  Branch {bid:3d} ({info['name']:20s}): {info['prefix']}")

# Usage

allocator = BranchAllocator("2001:db8:1010::/48")
allocator.allocate_branch(1, "New York")
allocator.allocate_branch(2, "Chicago")
allocator.allocate_branch(3, "London")
allocator.allocate_branch(10, "Singapore")
allocator.report()

# Get a specific subnet within a branch
user_vlan = allocator.get_branch_subnet(1, 1)  # Branch 1, VLAN 1
print(f"\nNYC User VLAN: {user_vlan}")
```

## Branch Router Configuration

Each branch router receives its /56 via DHCPv6-PD from the WAN:

```bash
# Branch router: /etc/wide-dhcpv6/dhcp6c.conf
interface wan0 {
    send ia-pd 1;
    send rapid-commit;
};

id-assoc pd 1 {
    # User VLAN (VLAN 1) gets subnet ID 1
    prefix-interface vlan1 {
        sla-id 1;
        sla-len 8;   # /56 + 8 = /64
        ifid 1;
    };
    # Server VLAN (VLAN 10) gets subnet ID 10
    prefix-interface vlan10 {
        sla-id 10;
        sla-len 8;
        ifid 1;
    };
    # Management VLAN (VLAN 100) gets subnet ID 100
    prefix-interface vlan100 {
        sla-id 100;
        sla-len 8;
        ifid 1;
    };
};
```

## WAN Routing Back to HQ

The branch prefix must be routable from HQ:

```bash
# HQ router: static route pointing to branch WAN link
sudo ip -6 route add 2001:db8:1010:100::/56 via 2001:db8:10f0:1::1

# Or better: run OSPFv3 / BGP between HQ and branch
# Branch router advertises its /56 into the routing protocol
# HQ router summarizes all branches as 2001:db8:1010::/48
```

## Branch Firewall Policy Template

```bash
# All branches share the same policy (using prefix math):
# Block branch-to-branch traffic (each branch is isolated)
ip6tables -A FORWARD -s 2001:db8:1010::/48 \
                     -d 2001:db8:1010::/48 -j DROP

# Allow branches to reach HQ servers
ip6tables -A FORWARD -s 2001:db8:1010::/48 \
                     -d 2001:db8:1020::/64 -j ACCEPT

# Allow HQ management to reach branch management subnets
ip6tables -A FORWARD -s 2001:db8:1001::/64 \
                     -d 2001:db8:1010::/48 -j ACCEPT
```

## Conclusion

Assigning IPv6 prefixes to branch offices becomes systematic when you use a dedicated block for branches and encode the branch number in the prefix. Each branch receives a /56 (256 subnets), delivered via DHCPv6-PD for dynamic deployment or static assignment for managed branches. The hierarchical structure enables clean route summarization at the WAN edge and simplifies policy configuration that applies to all branches uniformly.
