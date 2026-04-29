# How to Understand Longest Prefix Match in Routing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, Routing, IPv4, CIDR

Description: Learn how longest prefix match (LPM) works, why it is the fundamental algorithm for IPv4 routing table lookups, and how to apply it manually and programmatically.

## What Is Longest Prefix Match?

Longest Prefix Match (LPM) is the algorithm used by routers to select the most specific route for a destination IP address. When multiple routes match, the route with the **longest prefix length** (most specific) is chosen.

**Rule**: The more bits the prefix matches, the more specific (and preferred) it is.

## Simple Example

```text
Routing Table:
  10.0.0.0/8     → Router A  (matches all 10.x.x.x)
  10.1.0.0/16    → Router B  (matches 10.1.x.x)
  10.1.1.0/24    → Router C  (matches 10.1.1.x)
  10.1.1.1/32    → Router D  (matches exactly 10.1.1.1)

Packet to 10.1.1.1:
  Match /8:  10.0.0.0/8   → 10.1.1.1 IN this network ✓ (8 bits match)
  Match /16: 10.1.0.0/16  → 10.1.1.1 IN this network ✓ (16 bits match)
  Match /24: 10.1.1.0/24  → 10.1.1.1 IN this network ✓ (24 bits match)
  Match /32: 10.1.1.1/32  → 10.1.1.1 IS this host    ✓ (32 bits match)

Winner: /32 (longest) → Route to Router D
```

## How Prefix Length Relates to Specificity

```python
import ipaddress

def match_and_length(dest, prefix):
    dest_ip = ipaddress.ip_address(dest)
    network = ipaddress.ip_network(prefix)
    if dest_ip in network:
        return network.prefixlen
    return -1

destination = '10.1.1.1'
prefixes = ['10.0.0.0/8', '10.1.0.0/16', '10.1.1.0/24', '10.1.1.1/32', '0.0.0.0/0']

matches = [(p, match_and_length(destination, p)) for p in prefixes if match_and_length(destination, p) >= 0]
matches.sort(key=lambda x: x[1], reverse=True)

print(f"All matches for {destination}:")
for prefix, length in matches:
    print(f"  /{length:2d}  {prefix}")
print(f"\nBest match: {matches[0][0]}")
```

Output:
```text
All matches for 10.1.1.1:
  /32  10.1.1.1/32
  /24  10.1.1.0/24
  /16  10.1.0.0/16
  / 8  10.0.0.0/8
  / 0  0.0.0.0/0

Best match: 10.1.1.1/32
```

## Why LPM Is Critical

### Route Aggregation

ISPs aggregate many small prefixes into one larger announcement to reduce routing table size. LPM ensures more-specific routes still work:

```text
A BGP table might have:
  10.0.0.0/8    via AS100 (aggregate)
  10.1.1.0/24   via AS200 (more specific - AS200's actual prefix)

Traffic to 10.1.1.10:
  LPM selects /24 → goes to AS200 (correct!)
```

### Blackhole Routes

A /32 blackhole drops traffic to one specific IP without affecting the surrounding subnet:

```bash
ip route add blackhole 10.1.1.5/32
# All other traffic to 10.1.1.0/24 works fine

```

### Null Routes for Security

```bash
# Block specific attacker's IP while allowing their subnet
ip route add blackhole 203.0.113.99/32
```

## LPM in Hardware

Real routers implement LPM in hardware using:
- **TCAM** (Ternary Content-Addressable Memory) - parallel lookup
- **Trie structures** - tree-based prefix matching

Linux uses an LC-trie for IPv4 software routing lookups.

## Verification Example

```bash
# Test LPM on Linux
ip route show
# default via 192.168.1.1 dev eth0
# 192.168.1.0/24 dev eth0 scope link
# 10.0.0.0/8 via 192.168.1.2 dev eth0

ip route get 10.1.1.50
# 10.1.1.50 via 192.168.1.2 dev eth0   ← /8 route used (longest match)

# Add more specific route
ip route add 10.1.1.0/24 via 192.168.1.3 dev eth0

ip route get 10.1.1.50
# 10.1.1.50 via 192.168.1.3 dev eth0   ← /24 route now wins (LPM)
```

## Key Takeaways

- LPM selects the route with the most prefix bits matching the destination.
- /32 routes (host routes) always win over network routes.
- Default routes (0.0.0.0/0) always lose to any more-specific route.
- `ip route get DEST` shows which route Linux will actually use.

**Related Reading:**

- [How to Understand How IPv4 Routing Decisions Are Made](https://oneuptime.com/blog/post/2026-03-20-ipv4-routing-decisions/view)
- [How to Understand Administrative Distance in Routing](https://oneuptime.com/blog/post/2026-03-20-administrative-distance-routing/view)
- [How to View the Routing Table on Linux](https://oneuptime.com/blog/post/2026-03-20-view-routing-table-linux/view)
