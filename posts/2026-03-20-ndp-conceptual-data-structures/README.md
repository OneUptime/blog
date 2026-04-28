# How to Understand NDP Conceptual Data Structures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NDP, Data Structure, Neighbor Cache, Prefix Lists, Default Router List

Description: Understand the four conceptual data structures defined in RFC 4861 - Neighbor Cache, Destination Cache, Prefix List, and Default Router List - and how they work together in IPv6.

## Introduction

RFC 4861 defines four conceptual data structures that every IPv6 node maintains for NDP: the Neighbor Cache, Destination Cache, Prefix List, and Default Router List. Together, these structures enable address resolution, next-hop determination, and PMTU caching. Understanding what each structure contains and how they interact is essential for implementing IPv6 networking or debugging connectivity issues.

## The Four NDP Data Structures

```text
1. Neighbor Cache
   Purpose: Maps IPv6 addresses to link-layer addresses + NUD state
   Key:     IPv6 address + interface
   Value:   Link-layer (MAC) address + NUD state + timers
   Linux:   ip -6 neigh show

2. Destination Cache
   Purpose: Caches per-destination routing info and PMTU
   Key:     Destination IPv6 address
   Value:   Next-hop address, PMTU, interface to use
   Linux:   ip -6 route show cache

3. Prefix List
   Purpose: List of on-link prefixes learned from RA
   Key:     Prefix + prefix length
   Value:   Valid Lifetime, Preferred Lifetime
   Linux:   ip -6 route show proto ra

4. Default Router List
   Purpose: List of routers to use as default gateways
   Key:     Router's link-local address
   Value:   Router Lifetime, route preference
   Linux:   ip -6 route show default
```

## Neighbor Cache

```bash
# View neighbor cache

ip -6 neigh show

# Each entry contains:
# - IPv6 address of neighbor
# - Interface on which neighbor is reachable
# - Link-layer (MAC) address
# - NUD state: INCOMPLETE, REACHABLE, STALE, DELAY, PROBE, FAILED, PERMANENT
# - Timers (managed by kernel)

# Populated by:
# - NA replies to NS
# - Proactive NA (unsolicited)
# - SLLA/TLLA options in other NDP messages

# Used for:
# - Forwarding packets to on-link destinations
# - NUD reachability confirmation
```

## Destination Cache

```bash
# View destination cache
ip -6 route show cache

# Each entry contains:
# - Destination address
# - Next-hop address (may be destination itself for on-link)
# - Interface
# - Learned PMTU (from ICMPv6 Packet Too Big)
# - Expiry time (for PMTU entries)

# Populated by:
# - Routing lookups (kernel adds entry when packet forwarded)
# - ICMPv6 Packet Too Big (updates PMTU for destination)
# - Redirect messages (updates next-hop)

# Flush the destination cache (forces re-lookup + PMTU rediscovery)
sudo ip -6 route flush cache
```

## Prefix List

```bash
# View prefix list (RA-installed on-link routes)
ip -6 route show proto ra

# Each entry contains:
# - Prefix and prefix length
# - Valid Lifetime (as route expiry)
# - Preferred Lifetime (when addresses from this prefix become deprecated)
# - Interface

# Populated by:
# - Prefix Information options in RA (L=1)

# Used for:
# - Determining if destination is on-link
# - Controlling SLAAC address formation (A=1 entries)

# Example on-link routes:
# 2001:db8::/64 dev eth0 proto ra metric 256 expires 2591899sec
```

## Default Router List

```bash
# View default router list
ip -6 route show default

# Each entry contains:
# - Router's link-local or global address
# - Interface
# - Expiry (from Router Lifetime in RA)
# - Metric (from Router Preference in RA: High=low metric, Low=high metric)

# Populated by:
# - Router Advertisements with Router Lifetime > 0

# Used for:
# - Selecting default gateway for off-link destinations
# - Automatic failover when a router's RA expires

# If multiple routers with same metric: selection may be round-robin
```

## How the Structures Work Together

```python
class IPv6NextHopDetermination:
    """
    Simulate RFC 4861 next-hop determination using the four NDP data structures.
    """

    def __init__(self):
        self.neighbor_cache = {}    # IPv6 addr → {mac, state}
        self.destination_cache = {} # dst addr → {nexthop, pmtu, interface}
        self.prefix_list = []       # [(prefix, prefixlen, valid_lft)]
        self.default_router_list = [] # [(router_addr, lifetime, metric)]

    def is_on_link(self, destination: str) -> bool:
        """Check Prefix List for on-link determination."""
        import ipaddress
        dst = ipaddress.ip_address(destination)
        for prefix, prefixlen, valid_lft in self.prefix_list:
            if valid_lft > 0:
                network = ipaddress.ip_network(f"{prefix}/{prefixlen}", strict=False)
                if dst in network:
                    return True
        return False

    def get_next_hop(self, destination: str) -> str | None:
        """Determine next-hop for a destination."""
        # Check destination cache first
        if destination in self.destination_cache:
            return self.destination_cache[destination]['nexthop']

        # Check if on-link
        if self.is_on_link(destination):
            return destination  # On-link: destination IS the next-hop

        # Use default router
        if self.default_router_list:
            # Select router with lowest metric
            router = min(self.default_router_list, key=lambda r: r[2])
            return router[0]

        return None  # No route
```

## Conclusion

The four NDP data structures work in concert to handle all IPv6 routing and address resolution decisions. The Neighbor Cache provides L3→L2 mapping with NUD state. The Destination Cache provides a fast-path cache for per-destination routing and PMTU. The Prefix List determines on-link destinations. The Default Router List provides fallback gateways. Linux exposes all four through `ip -6 neigh`, `ip -6 route show cache`, `ip -6 route show`, and `ip -6 route show default` respectively.
