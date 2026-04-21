# How to Perform Supernetting to Summarize Routes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Supernetting, Routing, BGP, OSPF, Route Summarization

Description: Supernetting (route aggregation or summarization) combines multiple contiguous IPv4 prefixes into a single shorter-prefix advertisement, reducing routing table size and improving network scalability.

## What Is Supernetting?

Supernetting is the reverse of subnetting. Instead of splitting a block into smaller subnets, you combine multiple contiguous blocks into one larger summary prefix.

Example: Combine four /24 networks into one /22:
```text
192.168.0.0/24
192.168.1.0/24  →  192.168.0.0/22
192.168.2.0/24
192.168.3.0/24
```

## Requirements for Summarization

1. The networks must be **contiguous** (no gaps).
2. They must form a **power-of-two** sized group.
3. The starting address must be aligned to the summary block boundary.

## Python: Computing the Summary Prefix

```python
import ipaddress

def summarize_networks(networks: list) -> str:
    """
    Return one clean summary prefix for the given networks.
    Networks must be contiguous and aligned for a single summary.
    """
    nets = [ipaddress.IPv4Network(n, strict=False) for n in networks]
    # Collapse contiguous or overlapping networks into the shortest prefix list.
    summary = list(ipaddress.collapse_addresses(nets))
    if len(summary) != 1:
        raise ValueError("Networks do not form one clean summary prefix")
    return str(summary[0])

# Four contiguous /24s

nets = ["192.168.0.0/24", "192.168.1.0/24",
        "192.168.2.0/24", "192.168.3.0/24"]
print(summarize_networks(nets))  # 192.168.0.0/22

# Using built-in collapse
result = list(ipaddress.collapse_addresses(
    [ipaddress.IPv4Network(n) for n in nets]))
print(result)  # [IPv4Network('192.168.0.0/22')]
```

## Manual Summarization Steps

To find the summary of `10.1.4.0/24` through `10.1.7.0/24`:

1. Convert to binary:
   ```text
   10.1.00000100.0  (10.1.4.0)
   10.1.00000101.0  (10.1.5.0)
   10.1.00000110.0  (10.1.6.0)
   10.1.00000111.0  (10.1.7.0)
   ```
2. Find common bits: `10.1.000001` - the first 22 bits match.
3. Summary prefix: `10.1.4.0/22`

## Configuring Route Summarization

On a Cisco IOS router (OSPF):
```text
# Summarize 10.1.4.0/22 at the ABR
router ospf 1
  area 0 range 10.1.4.0 255.255.252.0
```

On Linux with FRRouting (BGP):
```text
router bgp 65001
  address-family ipv4 unicast
    aggregate-address 10.1.4.0/22 summary-only
```

## Key Takeaways

- Supernetting combines contiguous power-of-two blocks into one shorter prefix.
- Summarization reduces routing table size and hides internal topology changes.
- Networks must be contiguous and the starting address must be properly aligned.
- Use `ipaddress.collapse_addresses()` in Python to compute summaries automatically.
