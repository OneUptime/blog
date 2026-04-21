# How to Summarize IPv4 Routes for Efficient Routing Table Design

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Route Summarization, Aggregation, CIDR, Network Design, BGP

Description: Learn how to calculate IPv4 route summaries and supernets to reduce routing table size and improve network scalability.

## Why Summarize Routes?

Route summarization (aggregation) replaces multiple specific routes with a single covering prefix:
- Smaller routing tables → faster lookups
- Less routing protocol traffic → faster convergence
- Simpler troubleshooting
- Hides internal network instability

## Step 1: Identify Routes to Summarize

For summarization to work, routes must be contiguous in the address space:

```text
Can be summarized (contiguous):
  10.1.0.0/24
  10.1.1.0/24
  10.1.2.0/24
  10.1.3.0/24
  → Summary: 10.1.0.0/22

Cannot be summarized efficiently (non-contiguous):
  10.1.0.0/24
  10.1.2.0/24   (gap: 10.1.1.0 missing)
  → Would require 10.1.0.0/22 which includes unowned addresses
```

## Step 2: Calculate the Summary Route

To find the summary:
1. Convert all network addresses to binary
2. Find the longest common bit prefix
3. The summary prefix length = number of common bits

```text
Summarize 10.1.0.0/24, 10.1.1.0/24, 10.1.2.0/24, 10.1.3.0/24:

10.1.0.0  = 00001010.00000001.00000000.00000000
10.1.1.0  = 00001010.00000001.00000001.00000000
10.1.2.0  = 00001010.00000001.00000010.00000000
10.1.3.0  = 00001010.00000001.00000011.00000000

Common prefix: 00001010.00000001.000000 (22 bits)
Summary: 10.1.0.0/22
```

## Step 3: Use Python to Calculate Summaries

```python
from ipaddress import ip_network, collapse_addresses

def summarize_routes(route_list):
    """Calculate the summary route for a list of networks."""
    networks = [ip_network(r) for r in route_list]

    # Use Python's collapse_addresses to find the minimum set of prefixes
    collapsed = list(collapse_addresses(networks))

    print(f"Input routes ({len(networks)}):")
    for n in networks:
        print(f"  {n}")
    print(f"\nSummary routes ({len(collapsed)}):")
    for n in collapsed:
        print(f"  {n}")

    return collapsed

# Example 1: Clean summarization

summarize_routes(['10.1.0.0/24', '10.1.1.0/24', '10.1.2.0/24', '10.1.3.0/24'])
# Result: 10.1.0.0/22

# Example 2: Multiple summaries
summarize_routes(['192.168.0.0/24', '192.168.1.0/24', '192.168.10.0/24', '192.168.11.0/24'])
# Result: 192.168.0.0/23, 192.168.10.0/23
```

## Step 4: Find the Tightest Summary for Any Route Set

```python
from ipaddress import ip_network, collapse_addresses

def find_supernet(networks):
    """Find the tightest supernet that covers all given networks."""
    nets = [ip_network(n) for n in networks]

    # The supernet must cover all networks
    # Start with the first network and expand until it covers all
    supernet = nets[0]
    for net in nets[1:]:
        while not net.subnet_of(supernet):
            # Expand to parent
            supernet = supernet.supernet()
            if supernet.prefixlen == 0:
                break

    return supernet

supernet = find_supernet(['10.1.0.0/24', '10.1.1.0/24', '10.1.2.0/24', '10.1.3.0/24'])
print(f"Tightest summary: {supernet}")  # 10.1.0.0/22

# Check if the supernet includes extra space
nets = [ip_network('10.1.0.0/24'), ip_network('10.1.1.0/24'),
        ip_network('10.1.2.0/24'), ip_network('10.1.3.0/24')]
covered = list(collapse_addresses(nets))
extra_addresses = supernet.num_addresses - sum(n.num_addresses for n in covered)
print(f"Extra addresses covered: {extra_addresses}")  # 0
```

## Step 5: Configure Route Summarization in Cisco IOS

**OSPF Area Summary at ABR:**
```text
router ospf 1
  area 1 range 10.1.0.0 255.255.252.0   ! Summarize 10.1.0-3.0/24 as 10.1.0.0/22
  area 2 range 10.2.0.0 255.255.252.0
```

**BGP Aggregate:**
```text
router bgp 65001
  aggregate-address 10.0.0.0 255.255.0.0 summary-only
  ! summary-only suppresses the more-specific routes
```

**Static Route Aggregation:**
```text
! Install the aggregate route; advertise it with your routing protocol
ip route 10.1.0.0 255.255.252.0 Null0   ! Aggregate (discard route)
! More-specific routes pointing to actual next-hops
ip route 10.1.0.0 255.255.255.0 192.168.1.2
ip route 10.1.1.0 255.255.255.0 192.168.1.3
```

## Conclusion

Clean route summarization requires contiguous, power-of-2 aligned address blocks. Calculate a single covering prefix by finding the common bit prefix, or use Python's `ipaddress.collapse_addresses()` to produce the minimum set of prefixes. Configure summarization in OSPF with `area X range` at ABRs and in BGP with `aggregate-address`. Hierarchical addressing design (where address allocation follows topology) is the key prerequisite for clean summarization - you can only summarize well what you planned well.
