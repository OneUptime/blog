# How to Plan IPv6 for Multi-Tenant Data Centers - Centers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Multi-Tenant, Data Center, VRF, Segmentation

Description: Plan IPv6 addressing and segmentation for multi-tenant data center environments using VRF isolation, unique prefixes per tenant, and firewall policies.

## IPv6 Multi-Tenant Architecture

Multi-tenant data centers require IPv6 isolation between tenants while sharing physical infrastructure. The key mechanisms are:

- **VRF (Virtual Routing and Forwarding)**: separate routing tables per tenant
- **VLAN segmentation**: Layer 2 isolation per tenant
- **Dedicated /40 or /48 per tenant**: non-overlapping IPv6 address space
- **Firewall policy**: inter-tenant traffic must cross a firewall

## Address Allocation Strategy

```text
ISP assigns: 2001:db8::/32 (or /28 for large DC)

Tenant allocation:
  Tenant A: 2001:db8:a000::/40 (256 /48s for growth)
  Tenant B: 2001:db8:b000::/40
  Tenant C: 2001:db8:c000::/40

  Per-tenant /48 breakdown:
  2001:db8:a000::/48 → Tenant A production
  2001:db8:a001::/48 → Tenant A staging
  2001:db8:a002::/48 → Tenant A DMZ

Infrastructure:
  2001:db8:ff00::/48 → DC management network
  2001:db8:ff01::/48 → Provider transit links
```

## VRF Configuration per Tenant

```bash
! Cisco NX-OS: VRF per tenant with IPv6

vrf context TENANT_A
  rd 65001:100
  address-family ipv6 unicast
    route-target import 65001:100
    route-target export 65001:100

interface Vlan100
  vrf member TENANT_A
  ipv6 address 2001:db8:a000:100::1/64

! BGP VRF routing
router bgp 65001
  vrf TENANT_A
    address-family ipv6 unicast
      network 2001:db8:a000:100::/64
```

## Linux: Network Namespace per Tenant

```bash
# Create namespace for each tenant

ip netns add tenant_a
ip netns add tenant_b

# Assign interfaces to tenant namespaces
ip link add veth-a-out type veth peer name veth-a-in
ip link set veth-a-in netns tenant_a

# Configure host-side gateway and bring links up
ip -6 addr add 2001:db8:a000:100::1/64 dev veth-a-out
ip link set veth-a-out up

# Configure IPv6 in tenant namespace
ip netns exec tenant_a ip link set lo up
ip netns exec tenant_a ip link set veth-a-in up
ip netns exec tenant_a ip -6 addr add 2001:db8:a000:100::2/64 dev veth-a-in
ip netns exec tenant_a ip -6 route add default via 2001:db8:a000:100::1 dev veth-a-in

# Verify isolation
ip netns exec tenant_a ping -6 2001:db8:a000:100::1
ip netns exec tenant_a ping -6 2001:db8:b000:200::1  # Should fail unless explicit routing/firewall policy is added
```

## Firewall Policies for Tenant Isolation

```bash
# ip6tables rules: block inter-tenant traffic at default gateway

# Allow intra-tenant traffic
ip6tables -A FORWARD -s 2001:db8:a000::/40 -d 2001:db8:a000::/40 -j ACCEPT
ip6tables -A FORWARD -s 2001:db8:b000::/40 -d 2001:db8:b000::/40 -j ACCEPT

# Block inter-tenant traffic (must route through firewall)
ip6tables -A FORWARD -s 2001:db8:a000::/40 -d 2001:db8:b000::/40 -j DROP
ip6tables -A FORWARD -s 2001:db8:b000::/40 -d 2001:db8:a000::/40 -j DROP

# Allow traffic to/from internet
ip6tables -A FORWARD -s 2001:db8:a000::/40 -j ACCEPT
ip6tables -A FORWARD -d 2001:db8:a000::/40 -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
```

## Tenant IPv6 Prefix Advertisement

```bash
# radvd: per-VLAN RA configuration for each tenant

cat > /etc/radvd.conf << 'EOF'
# Tenant A VLAN 100
interface vlan100 {
    AdvSendAdvert on;
    AdvManagedFlag on;  # Use DHCPv6 for addresses on this VLAN

    prefix 2001:db8:a000:100::/64 {
        AdvOnLink on;
        AdvAutonomous off;
    };
};

# Tenant B VLAN 200
interface vlan200 {
    AdvSendAdvert on;

    prefix 2001:db8:b000:200::/64 {
        AdvOnLink on;
        AdvAutonomous on;
    };
};
EOF
```

## IPAM for Multi-Tenant IPv6

```python
#!/usr/bin/env python3
# tenant-ipam.py - Simple IPv6 IPAM for multi-tenant DC

import ipaddress
from typing import Dict, List

class TenantIPAM:
    def __init__(self, dc_prefix: str):
        self.dc_net = ipaddress.ip_network(dc_prefix)
        self.allocations: Dict[str, str] = {}

    def allocate_tenant(self, tenant_id: str, size: int = 40) -> str:
        """Allocate a /size prefix to a tenant."""
        used = {ipaddress.ip_network(p) for p in self.allocations.values()}
        for subnet in self.dc_net.subnets(new_prefix=size):
            if subnet not in used:
                self.allocations[tenant_id] = str(subnet)
                return str(subnet)
        raise ValueError(f"No /{size} available for {tenant_id}")

    def list_allocations(self) -> List[dict]:
        return [{"tenant": t, "prefix": p} for t, p in self.allocations.items()]

# Usage
ipam = TenantIPAM("2001:db8::/32")
ipam.allocate_tenant("tenant_a")
ipam.allocate_tenant("tenant_b")
for alloc in ipam.list_allocations():
    print(f"Tenant {alloc['tenant']}: {alloc['prefix']}")
```

## Conclusion

Multi-tenant IPv6 data center design requires three pillars: unique /40 or /48 prefix blocks per tenant (from a structured /32 allocation), VRF isolation on routing equipment, and firewall enforcement at tenant boundaries. Use VRF-aware routing (Cisco `vrf member`, Juniper routing-instances) to prevent cross-tenant routing at the network layer. Assign VLANs per tenant, use a /64 per VLAN, and configure per-VLAN radvd with tenant-specific prefixes. Block inter-tenant forwarding with ip6tables FORWARD rules, requiring tenant-to-tenant traffic to cross a firewall for security policy enforcement.
