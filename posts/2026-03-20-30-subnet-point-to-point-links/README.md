# How to Understand the /30 Subnet for Point-to-Point Links

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Subnetting, Point-to-Point, WAN, Networking, /30

Description: A /30 subnet provides exactly 2 usable host addresses, making it the traditional choice for point-to-point links between two routers where only two addresses are needed and broadcast overhead...

## /30 Subnet Structure

A /30 subnet has:
- **4 total addresses** (2 host bits: 2^2 = 4)
- **1 network address** (all zeros)
- **2 usable host addresses**
- **1 broadcast address** (all ones)

```text
Network:    x.x.x.0   (11111100 final mask → block size 4)
Host A:     x.x.x.1
Host B:     x.x.x.2
Broadcast:  x.x.x.3
```

## /30 Subnet Table for 192.168.1.0/24

```python
import ipaddress

parent = ipaddress.IPv4Network("192.168.1.0/24")
subnets_30 = list(parent.subnets(new_prefix=30))

print(f"Total /30 subnets in a /24: {len(subnets_30)}")
print("\nFirst 8 /30 subnets:")
for s in subnets_30[:8]:
    hosts = list(s.hosts())
    print(f"  {str(s):20s}  Host-A={hosts[0]}  Host-B={hosts[1]}")
```

Output:
```text
Total /30 subnets in a /24: 64
First 8 /30 subnets:
  192.168.1.0/30       Host-A=192.168.1.1  Host-B=192.168.1.2
  192.168.1.4/30       Host-A=192.168.1.5  Host-B=192.168.1.6
  192.168.1.8/30       Host-A=192.168.1.9  Host-B=192.168.1.10
  ...
```

## Configuring a /30 P2P Link on Linux

```bash
# Router A side

sudo ip addr add 10.10.10.1/30 dev eth1

# Router B side
sudo ip addr add 10.10.10.2/30 dev eth1

# Verify connectivity
ping 10.10.10.2   # From Router A
```

## When to Use /30 vs /31

| Scenario | Recommended |
|----------|-------------|
| Cisco IOS to Cisco IOS link | /30 (traditional) or /31 (RFC 3021) |
| Cisco to third-party | /30 (maximum compatibility) |
| Linux to Linux router | /31 (saves 2 addresses) |
| Virtual interfaces/tunnels | /30 or /31 |

## Allocating P2P Links from a Block

```python
# Allocate /30 P2P links from 10.254.0.0/24
p2p_block = ipaddress.IPv4Network("10.254.0.0/24")
p2p_links = list(p2p_block.subnets(new_prefix=30))

connections = [
    ("Router-A", "Router-B"),
    ("Router-A", "Router-C"),
    ("Router-B", "Router-D"),
]

print("P2P Link Allocations:")
for i, (r1, r2) in enumerate(connections):
    link = p2p_links[i]
    hosts = list(link.hosts())
    print(f"  {r1} <-> {r2}: {link} ({hosts[0]} - {hosts[1]})")
```

## Key Takeaways

- /30 provides exactly 2 usable host addresses - ideal for router-to-router links.
- One /24 yields 64 /30 subnets, making it an efficient P2P link pool.
- /31 (RFC 3021) is even more efficient because it uses both addresses as host addresses on a point-to-point link, but requires both sides to support it.
- Allocate a dedicated block (e.g., 10.254.0.0/24) for all P2P links to keep them organized.
