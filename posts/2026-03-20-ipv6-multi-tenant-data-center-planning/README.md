# How to Plan IPv6 for Multi-Tenant Data Centers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Multi-Tenant, Data Center, Network Planning, Virtualization

Description: A guide to planning IPv6 address space, segmentation, and routing for multi-tenant data center environments.

## The Multi-Tenant Challenge

Multi-tenant data centers must provide isolation between tenants while efficiently using IPv6 address space. With IPv6's vast address space, every tenant can receive a generous allocation, but the planning must still be deliberate.

## Address Allocation Strategy

Assign a dedicated /48 or /56 prefix per tenant, drawn from your data center's /32 allocation:

```text
Data Center Allocation: 2001:db8::/32

Tenant A: 2001:db8:0001::/48
Tenant B: 2001:db8:0002::/48
Tenant C: 2001:db8:0003::/48
...
Management: 2001:db8:ffff::/48
```

Each tenant's /48 allows them 65,536 subnets internally - more than enough for complex workloads.

## Isolation Mechanisms

Use VRFs (Virtual Routing and Forwarding) to isolate tenant routing tables even on shared infrastructure:

```text
# Cisco IOS-XE VRF configuration for tenant isolation

vrf definition TENANT-A
 address-family ipv6
  exit-address-family

interface GigabitEthernet1.100
 encapsulation dot1q 100
 vrf forwarding TENANT-A
 ipv6 address 2001:db8:1:100::1/64
```

## VLAN and Prefix Mapping

Map tenant VLANs to per-VLAN /64 subnets consistently:

| Tenant | VLAN  | IPv6 Prefix             |
|--------|-------|-------------------------|
| A      | 100   | 2001:db8:1:100::/64     |
| B      | 200   | 2001:db8:2:200::/64     |
| C      | 300   | 2001:db8:3:300::/64     |

## BGP Route Leaking for Shared Services

In MP-BGP-based designs, shared services (DNS, NTP, patch servers) can be exposed to tenants using selective route-target import:

```text
# Import the shared-services VRF into the tenant VRF

vrf definition SHARED-SERVICES
 rd 65000:100
 address-family ipv6
  route-target both 65000:100
  exit-address-family

vrf definition TENANT-A
 rd 65000:1
 address-family ipv6
  route-target both 65000:1
  route-target import 65000:100
  exit-address-family
```

## DHCPv6 for Tenant Address Assignment

Deploy per-tenant DHCPv6 scopes to control address assignment:

```text
# ISC Kea DHCPv6 subnet for Tenant A
{
  "subnet6": [
    {
      "subnet": "2001:db8:1:100::/64",
      "id": 100,
      "pools": [
        { "pool": "2001:db8:1:100::100-2001:db8:1:100::ffff" }
      ],
      "option-data": [
        { "name": "dns-servers", "data": "2001:db8:ffff:10::53" }
      ]
    }
  ]
}
```

## Monitoring Tenant Traffic

Use IPFIX/NetFlow with tenant prefix filtering to produce per-tenant traffic reports. Tools like `pmacct` can aggregate flows by source prefix.

## Security Between Tenants

Always deploy ACLs or security groups at tenant boundaries. Never rely solely on VRF isolation for security - combine with explicit firewall policies.

## Conclusion

Planning IPv6 for multi-tenant data centers requires a hierarchical address plan, VRF-based isolation, and consistent VLAN-to-prefix mapping. The generous IPv6 address space eliminates the need for overlapping addresses, simplifying inter-tenant policy management.
