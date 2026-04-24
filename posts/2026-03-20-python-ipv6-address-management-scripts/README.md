# How to Build IPv6 Address Management Scripts in Python - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, IPv6, IPAM, Address Management, Automation, Network

Description: Build IPv6 address management (IPAM) scripts in Python to allocate prefixes, track assignments, and generate reports.

## Building a Simple IPv6 IPAM

This example builds a file-backed IPv6 IPAM that can allocate and track prefix assignments:

```python
import ipaddress
import json
import os
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from typing import Optional

@dataclass
class PrefixAllocation:
    prefix: str
    prefix_len: int
    assigned_to: str
    purpose: str
    allocated_at: str
    status: str = "allocated"

class IPv6IPAM:
    """Simple file-backed IPv6 IPAM."""

    def __init__(self, pool_prefix: str, db_file: str = "ipam.json"):
        self.pool = ipaddress.IPv6Network(pool_prefix)
        self.db_file = db_file
        self.allocations: dict[str, PrefixAllocation] = {}
        self._load()

    def _load(self):
        """Load existing allocations from file."""
        if os.path.exists(self.db_file):
            with open(self.db_file) as f:
                data = json.load(f)
                self.allocations = {
                    k: PrefixAllocation(**v)
                    for k, v in data.items()
                }

    def _save(self):
        """Save allocations to file."""
        with open(self.db_file, "w") as f:
            json.dump(
                {k: asdict(v) for k, v in self.allocations.items()},
                f, indent=2
            )

    def _has_active_overlap(self, candidate: ipaddress.IPv6Network) -> bool:
        """Return True if candidate overlaps an active allocation."""
        return any(
            candidate.overlaps(ipaddress.IPv6Network(a.prefix))
            for a in self.allocations.values()
            if a.status == "allocated"
        )

    def allocate(
        self,
        prefix_len: int,
        assigned_to: str,
        purpose: str
    ) -> Optional[PrefixAllocation]:
        """Allocate the next available prefix of given length."""
        for subnet in self.pool.subnets(new_prefix=prefix_len):
            if self._has_active_overlap(subnet):
                continue

            prefix_str = str(subnet)
            if prefix_str in self.allocations:
                alloc = self.allocations[prefix_str]
                alloc.prefix_len = prefix_len
                alloc.assigned_to = assigned_to
                alloc.purpose = purpose
                alloc.allocated_at = datetime.now(timezone.utc).isoformat()
                alloc.status = "allocated"
            else:
                alloc = PrefixAllocation(
                    prefix=prefix_str,
                    prefix_len=prefix_len,
                    assigned_to=assigned_to,
                    purpose=purpose,
                    allocated_at=datetime.now(timezone.utc).isoformat()
                )
                self.allocations[prefix_str] = alloc

            self._save()
            return alloc
        return None

    def release(self, prefix_str: str) -> bool:
        """Release an allocated prefix."""
        if prefix_str in self.allocations:
            self.allocations[prefix_str].status = "available"
            self._save()
            return True
        return False

    def list_allocations(self) -> list[PrefixAllocation]:
        """List all allocations."""
        return list(self.allocations.values())

    def utilization_report(self) -> dict:
        """Generate utilization report."""
        allocated = sum(
            1 for a in self.allocations.values()
            if a.status == "allocated"
        )
        return {
            "pool": str(self.pool),
            "total_allocated": allocated,
            "allocations": [asdict(a) for a in self.list_allocations()]
        }

# Usage example

ipam = IPv6IPAM("2001:db8::/40")

# Allocate prefixes for different customers
alloc1 = ipam.allocate(48, "customer-a", "Production VPC")
alloc2 = ipam.allocate(48, "customer-b", "Dev Environment")
alloc3 = ipam.allocate(56, "home-user-1", "Residential /56")

print("Allocations:")
for alloc in ipam.list_allocations():
    print(f"  {alloc.prefix:30} → {alloc.assigned_to} ({alloc.purpose})")

# Print utilization
report = ipam.utilization_report()
print(f"\nTotal allocated: {report['total_allocated']}")
```

## Checking for Overlapping Allocations

```python
import ipaddress

def find_overlaps(prefixes: list[str]) -> list[tuple[str, str]]:
    """Find any overlapping prefixes in a list."""
    networks = [ipaddress.IPv6Network(p) for p in prefixes]
    overlaps = []

    for i in range(len(networks)):
        for j in range(i + 1, len(networks)):
            if networks[i].overlaps(networks[j]):
                overlaps.append((str(networks[i]), str(networks[j])))

    return overlaps

# Test
prefixes = [
    "2001:db8:1::/48",
    "2001:db8:2::/48",
    "2001:db8:1:100::/56",   # This overlaps with the first!
    "2001:db8:3::/48",
]

overlaps = find_overlaps(prefixes)
if overlaps:
    for a, b in overlaps:
        print(f"OVERLAP: {a} and {b}")
else:
    print("No overlaps detected")
```

## Generating Configuration from IPAM

Auto-generate router configuration from IPAM data:

```python
def generate_router_config(allocations: list[PrefixAllocation]) -> str:
    """Generate network device configuration from IPAM allocations."""
    lines = ["# Auto-generated IPv6 routes"]
    lines.append("# Generated: " + datetime.now(timezone.utc).isoformat())
    lines.append("")

    for alloc in allocations:
        if alloc.status == "allocated":
            lines.append(f"# Customer: {alloc.assigned_to} - {alloc.purpose}")
            lines.append(f"ipv6 route {alloc.prefix} Null0")  # Black-hole summary
            lines.append("")

    return "\n".join(lines)

config = generate_router_config(ipam.list_allocations())
print(config)
```

## Conclusion

A Python-based IPv6 IPAM script provides the core allocation tracking needed for network management. The `ipaddress` module handles prefix arithmetic, while a simple JSON backend provides persistence. For production use, replace the file backend with a database or integrate with tools like NetBox via its API.
