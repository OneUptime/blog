# How to Plan SRv6 Deployment for Your Network

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SRv6, Deployment, Planning, Network Architecture, Migration, Networking

Description: Plan a structured SRv6 deployment covering address space allocation, hardware assessment, phased rollout strategy, and monitoring requirements.

## Introduction

Deploying SRv6 requires planning across multiple dimensions: address allocation, hardware capability assessment, IGP/BGP configuration, and service migration. A phased approach minimizes risk while delivering incremental value.

## Step 1: Address Space Planning

```javascript
Allocate SRv6 address space from an operator-owned IPv6 prefix. The `5f00::/16` values below are example placeholders:

Example hierarchy:
  5f00:SSSS:NNNN:PPPP:FFFF:AAAA:AAAA:AAAA
        │     │    │    │    └── Arguments (service parameters)
        │     │    │    └─────── Function (locally assigned behavior ID)
        │     │    └──────────── Port/PoP (data center or pop)
        │     └───────────────── Node ID
        └─────────────────────── Site/Region

Example allocation:
  Site 1:  5f00:0001::/32
    Node 1: 5f00:0001:0001::/48
    Node 2: 5f00:0001:0002::/48
  Site 2:  5f00:0002::/32
    Node 1: 5f00:0002:0001::/48
```

```python
# srv6_address_planner.py - generate SID allocations

import ipaddress

def allocate_node_sids(site: int, node: int,
                       functions: dict) -> dict:
    """
    Allocate SIDs for a node.
    functions: {name: locally_assigned_function_value}
    """
    locator = f"5f00:{site:04x}:{node:04x}::/48"
    base = int(ipaddress.IPv6Address(f"5f00:{site:04x}:{node:04x}::"))

    sids = {"locator": locator, "sids": {}}
    for name, func_val in functions.items():
        sid_int = base | (func_val << 64)
        sids["sids"][name] = str(ipaddress.IPv6Address(sid_int))

    return sids

# Allocate SIDs for Site 1, Node 1

node_sids = allocate_node_sids(
    site=1, node=1,
    functions={"End": 0, "End.DT6": 0xe000, "End.DT4": 0xe001}
)
print(f"Locator: {node_sids['locator']}")
for name, sid in node_sids['sids'].items():
    print(f"  {name}: {sid}")
```

## Step 2: Hardware Assessment

```bash
# Check if routers support SRv6 and whether forwarding is in hardware or software

# Linux: verify kernel/iproute2 SRv6 support
uname -r
ip -6 route add 2001:db8:1:1::1/128 encap seg6local action End dev lo
ip -6 route del 2001:db8:1:1::1/128 dev lo

# Vendor hardware support is platform- and release-specific:
# Cisco: verify the SRv6 support matrix for your exact IOS XR release and platform
# Juniper: SRv6 network-programming examples start with Junos 20.3R1 on supported hardware
# Arista: verify current EOS SRv6 documentation/TOIs for your exact platform and release
# Linux: requires kernel and iproute2 with seg6/seg6local support
# P4 targets: SRv6 capability depends on the pipeline program and target ASIC/NIC limits
```

## Step 3: Phased Deployment Plan

```text
Phase 1: Lab Validation (Month 1-2)
  - Build topology with FRRouting or vendor test equipment
  - Validate IS-IS SRv6 locator advertisement
  - Validate End, End.X, End.DT4, End.DT6 functions
  - Run iperf3/netperf benchmarks
  - Validate uSID if applicable

Phase 2: Core Network (Month 3-4)
  - Enable SRv6 on backbone/spine nodes
  - Configure locators and IS-IS advertisement
  - Establish BGP SR-Policy peering with controller
  - NO service migration yet - underlay only

Phase 3: First Services (Month 5-6)
  - Migrate one L3VPN customer from MPLS to SRv6 End.DT6
  - Monitor for 2 weeks before proceeding
  - Document rollback procedure

Phase 4: Scale and Optimize (Month 7+)
  - Migrate remaining services
  - Enable uSID compression
  - Decommission MPLS LDP if target is SRv6-only
```

## Step 4: IS-IS Configuration for Locator Advertisement

```text
! IS-IS configuration template
router isis CORE
 net 49.0001.0000.0000.0001.00
 is-type level-2-only
 metric-style wide
 !
 address-family ipv6 unicast
  metric 10
  segment-routing srv6
   locator MAIN
   !
  !
 !
!
```

## Step 5: Monitoring Requirements

```yaml
# Monitoring checklist for SRv6 deployment

metrics_required:
  control_plane:
    - IS-IS adjacency count (should stay stable)
    - BGP session count and prefix counts
    - SRv6 SID advertisement count per node

  data_plane:
    - Packets per SID (encap/decap counters)
    - SRv6 forwarding errors
    - Locator prefix reachability (ping each locator)

  performance:
    - Per-path latency (ping each locator or use SRv6 OAM to probe SIDs)
    - Throughput through service chains (iperf3)
    - CPU utilization on SRv6 nodes

  alerting:
    - SID unreachable > 30 seconds → critical
    - Locator withdrawn from IS-IS → critical
    - BGP session carrying SRv6 services or SR Policy down → critical
```

## Rollback Plan

```bash
# Quick rollback: remove SRv6 steering routes so traffic can use the non-SRv6 path
# (assuming a non-SRv6 route already exists)

# Linux: remove encap routes
ip -6 route flush table 200
ip -6 route del 2001:db8:100::/48 table 200

# Cisco IOS XR example: remove SRv6 from the affected protocol context
# router isis CORE
#  address-family ipv6 unicast
#   no segment-routing srv6

# Log the rollback with timestamp
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) SRv6 rollback executed" >> /var/log/network-changes.log
```

## Conclusion

SRv6 deployment success depends on systematic planning: locator address allocation, hardware validation, phased service migration, and comprehensive monitoring. Start with a lab, validate each function, then migrate low-impact services first. Use OneUptime to create a deployment monitoring dashboard tracking all SRv6 KPIs before and after migration.
