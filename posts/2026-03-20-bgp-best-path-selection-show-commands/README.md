# How to Verify BGP Best Path Selection Using show Commands

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BGP, Routing, Best Path, FRR, Cisco, Verification, Troubleshooting

Description: Learn how to use BGP show commands to verify which path is selected as best and understand the BGP best path selection algorithm in action.

---

BGP best path selection determines which route BGP prefers among multiple candidates and attempts to install in the routing table. When traffic is not flowing as expected, verifying path selection is the first troubleshooting step.

## BGP Best Path Selection Order

BGP implementations commonly evaluate these attributes in roughly this order; exact behavior and later tie-breakers can vary by implementation and configuration:

1. **Weight** (implementation-specific; supported by Cisco IOS and FRR; highest wins)
2. **Local Preference** (highest wins; default 100)
3. **Locally originated** (locally originated > learned)
4. **AS Path length** (shortest wins)
5. **Origin** (IGP < EGP < Incomplete)
6. **MED** (lowest wins; by default compared only among paths from the same neighboring AS)
7. **eBGP over iBGP** (external > internal)
8. **IGP metric to next-hop** (lowest wins)
9. **Oldest / already-selected eBGP path** (more stable wins)
10. **Router ID** (lowest wins)

## show Commands for Best Path Verification

### FRR (Linux / VyOS)

```bash
# Show the BGP table for a specific prefix - * = valid, > = best path

vtysh -c "show bgp ipv4 unicast 192.0.2.0/24"

# Example output:
# BGP routing table entry for 192.0.2.0/24
# Paths: (2 available, best #1, table default)
#   Advertised to update-groups:
#     1
#   65100
#     10.0.0.1 from 10.0.0.1 (10.0.0.1)
#       Origin IGP, metric 0, localpref 200, valid, external, best   ← BEST PATH
#   65200 65100
#     10.0.0.2 from 10.0.0.2 (10.0.0.2)
#       Origin IGP, metric 0, localpref 100, valid, external        ← NOT best (lower localpref)

# Show full BGP table
vtysh -c "show bgp ipv4 unicast"

# Show only the best paths selected by BGP
vtysh -c "show bgp ipv4 unicast" | grep '^[[:space:]]*\*>'
```

### Why a Path Was Selected

```bash
# Show detailed path information for the prefix; the winning path is marked "best"
# and may include tie-break notes such as "Older Path" or "First path received"
vtysh -c "show bgp ipv4 unicast 192.0.2.0/24"

# Show the best-path criteria currently configured
vtysh -c "show bgp bestpath"

# Show path attributes for a specific neighbor
vtysh -c "show bgp ipv4 unicast neighbors 10.0.0.1 advertised-routes"
vtysh -c "show bgp ipv4 unicast neighbors 10.0.0.1 received-routes"
```

### Cisco IOS / IOS XE Equivalent

```text
! Show all BGP paths for a prefix
show ip bgp 192.0.2.0 255.255.255.0

! Show only the best path for that prefix
show ip bgp 192.0.2.0 255.255.255.0 bestpath

! Show why each path won or lost (IOS XE 16.10.1+)
show ip bgp 192.0.2.0 255.255.255.0 best-path-reason
```

## Manipulating Best Path

```bash
# FRR: increase local preference for paths from a specific neighbor
# (higher localpref = preferred)
vtysh << 'EOF'
conf t
route-map SET-LOCALPREF permit 10
  set local-preference 200
router bgp 65001
  neighbor 10.0.0.1 route-map SET-LOCALPREF in
EOF

# Apply with soft reset (no session disruption)
vtysh -c "clear bgp 10.0.0.1 soft in"

# Verify the new localpref is reflected in the BGP table
vtysh -c "show bgp ipv4 unicast 192.0.2.0/24"
```

## Key Takeaways

- In FRR `show bgp ipv4 unicast` output, `*` means valid and `>` marks the BGP best path.
- Local Preference is the most commonly tuned attribute for iBGP path selection (higher = preferred).
- AS Path length is the most commonly tuned attribute for eBGP path selection (shorter = preferred).
- Use `show bgp ipv4 unicast <prefix>` on FRR or `show ip bgp <prefix>` on Cisco, not `show ip route`, to see all BGP paths and why one was chosen.
