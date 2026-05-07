# How to Aggregate IPv4 Routes Using Supernetting

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Supernetting, Routing, BGP, Route Aggregation, OSPF

Description: IPv4 route aggregation combines multiple specific routes into a single summary advertisement, reducing routing table size and improving convergence by hiding internal topology changes behind the...

## Why Aggregate Routes?

A router advertising 256 /24 routes individually:
- Bloats the routing table with 256 entries
- Causes a BGP update for every internal change
- Increases CPU processing during convergence

Advertising one /16 summary replaces all 256 entries with one, while hiding internal changes.

## Identifying Aggregatable Routes

Routes can be summarized into a single supernet if they are:
1. Contiguous (no gaps between them)
2. Form a power-of-two sized group
3. Start at the correct boundary

```python
import ipaddress

def find_summary(networks: list[str]) -> str:
    """Return a single summary route when the input aggregates cleanly."""
    nets = [ipaddress.IPv4Network(n) for n in networks]
    collapsed = list(ipaddress.collapse_addresses(nets))
    if len(collapsed) != 1:
        raise ValueError(f"Multiple summary routes would be required: {collapsed}")
    return str(collapsed[0])

# Example: 8 contiguous /24s → should summarize to /21

routes = [f"10.1.{i}.0/24" for i in range(8)]  # 10.1.0.0 through 10.1.7.0
print(f"8 × /24 summarize to: {find_summary(routes)}")

# Verify with collapse_addresses
collapsed = list(ipaddress.collapse_addresses(
    [ipaddress.IPv4Network(r) for r in routes]))
print(f"Collapsed: {collapsed}")
```

## Configuring Aggregation in BGP (FRRouting)

```text
# /etc/frr/frr.conf
router bgp 65001
  address-family ipv4 unicast
    ! More-specific routes inside 10.1.0.0/21 must already exist in the BGP table
    ! Advertise summary and suppress more-specific advertisements
    aggregate-address 10.1.0.0/21 summary-only
    !
    ! Or advertise both summary and specifics, use:
    ! aggregate-address 10.1.0.0/21
  exit-address-family
```

## OSPF Area Summarization

```text
# ABR summarization in OSPF
router ospf 1
  area 1 range 10.1.0.0/21
  ! Summarizes intra-area routes in area 1 that fall within 10.1.0.0/21
```

## Linux: Static Summary Route

```bash
# Instead of 8 specific /24 routes, add one /21 summary
sudo ip route add 10.1.0.0/21 via 192.168.1.1

# Verify it covers the expected range
ip route show 10.1.0.0/21
python3 -c "import ipaddress; print(list(ipaddress.IPv4Network('10.1.0.0/21').subnets(new_prefix=24)))"
```

## Key Takeaways

- A single summary route requires contiguous networks forming a power-of-two group aligned to its boundary.
- `ipaddress.collapse_addresses()` returns the minimum set of summary routes for a list of networks.
- BGP `aggregate-address summary-only` suppresses advertisement of more-specific routes to neighbors.
- OSPF ABR summarization uses `area range` to hide intra-area detail from the backbone.
