# How to Redistribute Connected Routes into OSPF

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OSPF, Route Redistribution, IPv4, Networking, FRR, Cisco, Connected Routes

Description: Learn how to redistribute directly connected IPv4 routes into OSPF to make stub networks reachable by other OSPF routers without running OSPF on those interfaces.

---

Route redistribution allows routes from one routing protocol (or the routing table) to be imported into another. Redistributing connected routes into OSPF is useful when you have directly attached networks (loopbacks, stub LANs) that should be visible in the OSPF domain.

## When to Redistribute Connected Routes

- Loopback interfaces not included in any OSPF area but needed for reachability.
- Stub network segments where running OSPF would add unnecessary complexity.
- Importing data-plane networks (storage, management) that aren't OSPF-enabled.

## FRR: Redistribute Connected Routes

```bash
vtysh << 'EOF'
conf t

! Enter OSPF configuration
router ospf
  ospf router-id 10.0.0.1

  ! Redistribute all directly connected routes as Type 2 External (E2)
  redistribute connected

  ! Optional: use a route map to filter which connected routes are redistributed
  redistribute connected route-map FILTER-CONNECTED

  ! Redistribute connected with a specific metric
  redistribute connected metric 20 metric-type 1
EOF
```

## Filtering with a Route Map

Only redistribute specific connected subnets using a route map.

```bash
vtysh << 'EOF'
conf t

! Create a prefix list matching only specific connected subnets
ip prefix-list ALLOWED-CONNECTED seq 10 permit 192.168.100.0/24
ip prefix-list ALLOWED-CONNECTED seq 20 permit 10.99.0.0/16
ip prefix-list ALLOWED-CONNECTED seq 100 deny any

! Create the route map
route-map FILTER-CONNECTED permit 10
  match ip address prefix-list ALLOWED-CONNECTED

router ospf
  redistribute connected route-map FILTER-CONNECTED
EOF
```

## Cisco IOS Equivalent

```text
router ospf 1
  redistribute connected subnets     ! "subnets" is required to include non-classful routes
  redistribute connected subnets route-map FILTER-CONNECTED
```

## Metric Types for Redistributed Routes

| Type | Propagation | Use Case |
|------|-------------|---------|
| E1 | Cost increases as routes travel through OSPF | When you want more accurate path selection |
| E2 | Cost stays constant (default) | Simpler; typical for external routes |

```bash
! Redistribute as External Type 1 (cost accumulates)
redistribute connected metric-type 1

! Redistribute as External Type 2 (cost stays fixed; default)
redistribute connected metric-type 2
```

## Verifying Redistribution

```bash
# Check OSPF database for Type 5 (external) LSAs

vtysh -c "show ip ospf database external"

# Verify the redistributed routes appear in OSPF
vtysh -c "show ip ospf database external detail"

# Check a remote router's routing table to confirm the prefix is reachable
vtysh -c "show ip route 192.168.100.0/24"
# Should show: O E2 192.168.100.0/24 via ...

# On the redistributing router, confirm it is acting as an ASBR
vtysh -c "show ip ospf" | grep -i "autonomous system boundary"

# From a remote OSPF router, confirm the redistributing router is seen as an ASBR
vtysh -c "show ip ospf border-routers"
```

## Key Takeaways

- `redistribute connected` in OSPF imports all directly connected IPv4 subnets as Type 5 LSAs.
- Add `subnets` on Cisco IOS; FRR includes all prefixes by default.
- Use a route map to limit which connected routes are redistributed - redistributing everything can cause routing instability.
- Redistributed routes appear as `O E1` or `O E2` in the routing table of other OSPF routers.
