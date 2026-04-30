# How to Design an IPv6 Addressing Plan for an ISP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, ISP, BGP, Address Planning, Networking

Description: Design a complete IPv6 addressing plan for an Internet Service Provider, covering customer allocations, infrastructure, peering, and route summarization.

## Introduction

Designing an IPv6 addressing plan for an ISP requires careful thought about customer allocations, infrastructure prefixes, peering links, loopbacks, and route summarization. A well-structured plan ensures scalability as the customer base grows and keeps the global routing table manageable.

## ISP Allocation Model

A common starting point is a /32 from the RIR. The ISP's job is to delegate portions of this to:
- Residential customers (/56 or /60 each)
- Business customers (/48 each)
- Hosting customers (/48 or /52 each)
- ISP's own infrastructure blocks (/48s per PoP or function)

## High-Level Address Plan

```text
ISP prefix: 2001:db8::/32

Allocation map:
  2001:db8:0000::/36     Infrastructure (ISP-internal)
    2001:db8:0000::/48   Core routers / backbone
    2001:db8:0001::/48   PoP 1 (New York)
    2001:db8:0002::/48   PoP 2 (London)
    2001:db8:0003::/48   PoP 3 (Singapore)
    2001:db8:00f0::/48   Management / OOB

  2001:db8:1000::/36     Residential customers (/56 each)
    2001:db8:1000::/56   Customer 1 (residential)
    2001:db8:1000:100::/56 Customer 2 (residential)
    ...                  (up to 1,048,576 residential customers from this /36)

  2001:db8:2000::/36     Business customers (/48 each)
    2001:db8:2000::/48   Business customer 1
    2001:db8:2001::/48   Business customer 2
    ...                  (up to 4,096 business customers)

  2001:db8:3000::/36     Hosting / datacenter (/48 each)

  2001:db8:f000::/36     Peering / transit infrastructure
    2001:db8:f000::/64   IXP 1 peering LAN
    2001:db8:f000:1::/64 IXP 2 peering LAN
    2001:db8:fffe::/64   Transit provider links
```

## Infrastructure Loopbacks

```python
import ipaddress

# Generate loopback addresses for core routers

# One /128 per router from infrastructure block
LOOPBACK_PREFIX = "2001:db8:0000:ff00::/120"  # 255 usable loopbacks via hosts()

def assign_loopbacks(prefix, count):
    """Assign loopback /128 addresses to routers."""
    net = ipaddress.IPv6Network(prefix)
    hosts = list(net.hosts())[:count]
    return hosts

loopbacks = assign_loopbacks(LOOPBACK_PREFIX, 10)
for i, lb in enumerate(loopbacks, 1):
    print(f"  Router {i:2d} loopback: {lb}/128")

# Output:
# Router  1 loopback: 2001:db8:0:ff00::1/128
# Router  2 loopback: 2001:db8:0:ff00::2/128
# ...
```

## Customer Allocation System

```python
import ipaddress

class ISPAllocator:
    """Simple ISP prefix allocation tracker."""

    def __init__(self, residential_block: str, business_block: str):
        self.residential = ipaddress.IPv6Network(residential_block)
        self.business = ipaddress.IPv6Network(business_block)
        self.next_residential = 0
        self.next_business = 0

    def allocate_residential(self, customer_id: str) -> ipaddress.IPv6Network:
        """Allocate a /56 to a residential customer."""
        subnets = list(self.residential.subnets(new_prefix=56))
        if self.next_residential >= len(subnets):
            raise RuntimeError("Residential pool exhausted")
        prefix = subnets[self.next_residential]
        self.next_residential += 1
        print(f"  Residential {customer_id}: {prefix}")
        return prefix

    def allocate_business(self, customer_id: str) -> ipaddress.IPv6Network:
        """Allocate a /48 to a business customer."""
        subnets = list(self.business.subnets(new_prefix=48))
        if self.next_business >= len(subnets):
            raise RuntimeError("Business pool exhausted")
        prefix = subnets[self.next_business]
        self.next_business += 1
        print(f"  Business {customer_id}: {prefix}")
        return prefix

allocator = ISPAllocator(
    residential_block="2001:db8:1000::/36",
    business_block="2001:db8:2000::/36",
)

# Allocate to customers
allocator.allocate_residential("CUST-001")
allocator.allocate_residential("CUST-002")
allocator.allocate_business("BIZ-001")
```

## Route Summarization Strategy

```nginx
The ISP announces these summaries to upstream providers:
  2001:db8::/32  ← Full ISP block (single announcement)

Internally, the IGP carries more-specific routes:
  2001:db8:0000::/36  ← Infrastructure
  2001:db8:1000::/36  ← Residential customers
  2001:db8:2000::/36  ← Business customers

Individual customer /48s and /56s are NOT leaked to the global table.
```

## BGP Configuration Skeleton

```bash
# Cisco IOS: ISP BGP configuration
# router bgp 64500
#  neighbor 2001:db8:f000::1 remote-as 64501
#  address-family ipv6 unicast
#   network 2001:db8::/32
#   aggregate-address 2001:db8::/32 summary-only
#   neighbor 2001:db8:f000::1 activate
#   neighbor 2001:db8:f000::1 prefix-list ANNOUNCE out
#
# ipv6 prefix-list ANNOUNCE seq 10 permit 2001:DB8::/32
# ipv6 prefix-list ANNOUNCE seq 20 deny ::/0 le 128
```

## Conclusion

An ISP's IPv6 address plan divides a /32 allocation into logical blocks for customer types, infrastructure, and peering. Separating these into distinct /36 blocks enables clean summarization and makes prefix-based routing policies trivial. Residential customers get /56 delegations (256 subnets each), business customers get /48 (65,536 subnets), and ISP infrastructure uses a dedicated /36 with structured loopback and peering addressing.
