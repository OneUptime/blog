# How to Create an IPv4 Address Migration Plan for Network Mergers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Network Migration, Mergers, Renumbering, NAT, Network Design

Description: Create a structured IPv4 address migration plan for network mergers that resolves CIDR conflicts using NAT, phased renumbering, and dual-stack transition periods.

## Introduction

Network mergers inevitably surface overlapping IPv4 address spaces. A structured migration plan resolves conflicts with minimal downtime using temporary NAT, phased renumbering, and a clear cutover timeline.

## Phase 1 - Discovery and Conflict Analysis

```python
import ipaddress

def find_conflicts(company_a: dict, company_b: dict) -> list:
    conflicts = []
    for name_a, cidr_a in company_a.items():
        net_a = ipaddress.IPv4Network(cidr_a)
        for name_b, cidr_b in company_b.items():
            net_b = ipaddress.IPv4Network(cidr_b)
            if net_a.overlaps(net_b):
                conflicts.append({
                    "a": (name_a, cidr_a),
                    "b": (name_b, cidr_b),
                })
    return conflicts

company_a = {
    "corp_lan":   "10.1.0.0/16",
    "servers":    "10.10.0.0/24",
    "data_center":"192.168.0.0/20",
}
company_b = {
    "corp_lan":   "10.1.0.0/16",   # CONFLICT
    "branch":     "172.16.0.0/16",
    "servers":    "10.20.0.0/24",
}

for c in find_conflicts(company_a, company_b):
    print(f"CONFLICT: {c['a']} overlaps {c['b']}")
```

## Phase 2 - Temporary NAT Bridge (Week 1–4)

```text
Until renumbering is complete, use temporary static NAT to allow
communication between conflicting address spaces.

Company A 10.1.0.0/16  ←→   NAT   ←→  Company B 10.1.0.0/16
          (A-side)        bridge        (translated to 100.64.x.x)
```

```cisco
! On the merger gateway
ip nat inside source static network 10.1.0.0 100.64.0.0 255.255.0.0
!
interface GigabitEthernet0/0
 description Company-A-LAN
 ip nat inside
!
interface GigabitEthernet0/1
 description Company-B-LAN
 ip nat outside
```

## Phase 3 - New Address Allocation

```text
Post-merger master allocation: 10.0.0.0/8

  Legacy Company A:   10.0.0.0/12    (immediate keep, renumber over time)
  Legacy Company B:   10.16.0.0/12   (immediate keep, renumber over time)
  Merged Corporate:   10.48.0.0/12   (new greenfield allocations)
  Data Centers:       10.64.0.0/12
  DMZ / Cloud:        10.80.0.0/12
```

## Phase 4 - Phased Renumbering Checklist

```text
For each subnet being renumbered:

[ ] Assign new address in IPAM
[ ] Deploy DHCP scope for new range (keep old scope active)
[ ] Update DNS A/PTR records to reflect new IPs
[ ] Update firewall rules and ACLs for new range
[ ] Add static routes for new subnet to all routers
[ ] Migrate servers (add new IP → update apps → remove old IP)
[ ] Wait for DHCP lease expiry on client subnets
[ ] Remove old DHCP scope and DNS records
[ ] Update monitoring/SNMP targets
[ ] Decommission NAT translation for that subnet
```

## Phase 5 - DNS Strategy

```text
# Publish both records internally during transition

# Make sure the service is reachable on both IPs before adding the new record
app-server.corp.com.  IN A  10.1.5.10   # old
app-server.corp.com.  IN A  10.50.5.10  # new

# After all clients updated:
# Remove old record, keep TTL low (60s) during transition
```

## Migration Timeline Template

```text
Week 1-2:   Discovery, conflict mapping, new addressing plan
Week 3-4:   NAT bridge in production, connectivity tested
Week 5-8:   Renumber DMZ and servers (least client impact)
Week 9-16:  Renumber branch offices (DHCP-driven, minimal downtime)
Week 17-20: Renumber HQ and critical subnets
Week 21-24: Decommission NAT bridges, validate routing
Week 25+:   Monitor, clean up stale DNS/firewall rules
```

## Conclusion

Resolve merger IP conflicts in phases: temporary NAT for immediate connectivity, parallel DNS records during transition, and scheduled renumbering with DHCP migration. Automate conflict detection with Python and track progress in an IPAM tool with cutover dates attached to each subnet.
