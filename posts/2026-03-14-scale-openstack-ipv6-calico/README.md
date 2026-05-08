# How to Scale OpenStack IPv6 with Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: OpenStack, Calico, IPv6, Scaling, Networking

Description: A practical guide to scaling IPv6 networking in OpenStack with Calico, covering dual-stack configuration, IPv6 route management, neighbor discovery optimization, and large-scale deployment strategies.

---

## Introduction

IPv6 adoption in OpenStack environments is growing as organizations prepare for IPv4 address exhaustion and implement dual-stack networking. Calico supports IPv6 natively, but scaling IPv6 requires specific attention to neighbor discovery, route table management, and dual-stack policy configuration that differs from IPv4-only deployments.

This guide covers configuring and scaling IPv6 in OpenStack with Calico, from initial dual-stack setup through optimization for large deployments. We address IPv6-specific challenges including neighbor discovery protocol (NDP) scaling, extended route tables, and security group considerations for IPv6 traffic.

The key architectural difference with IPv6 in Calico is that neighbor discovery replaces ARP, and OpenStack VM routes are typically advertised as /128 host routes, so route distribution and neighbor table sizing matter at scale.

## Prerequisites

- An OpenStack deployment with Calico networking
- IPv6 connectivity between compute nodes
- Understanding of IPv6 addressing and subnetting
- `calicoctl` configured with datastore access
- Kernel version 4.x or later with full IPv6 support

## Configuring Dual-Stack Neutron Subnets

Set up IPv6 subnets alongside existing IPv4 subnets for dual-stack operation. In Calico for OpenStack, OpenStack controls whether a VM gets IPv4, IPv6, or both addresses; Calico honors the addresses that Neutron assigns.

```bash
# Create a shared Neutron network for dual-stack VMs
openstack network create --share dual-stack-vm-net

# IPv4 subnet for the same VM network
openstack subnet create \
  --network dual-stack-vm-net \
  --ip-version 4 \
  --subnet-range 10.0.0.0/16 \
  --gateway 10.0.0.1 \
  --dhcp \
  openstack-ipv4

# IPv6 subnet for OpenStack VMs
# Use a routed GUA prefix for externally reachable VMs, or a ULA prefix for private IPv6.
openstack subnet create \
  --network dual-stack-vm-net \
  --ip-version 6 \
  --subnet-range fd00:10:96::/64 \
  --gateway fd00:10:96::1 \
  --ipv6-ra-mode slaac \
  --ipv6-address-mode slaac \
  --dhcp \
  openstack-ipv6
```

```bash
# Verify both subnets are active
openstack subnet list --network dual-stack-vm-net
openstack subnet show openstack-ipv6
```

## Optimizing IPv6 Neighbor Discovery at Scale

IPv6 uses Neighbor Discovery Protocol (NDP) instead of ARP. At scale, NDP can generate significant traffic. Optimize kernel parameters on compute nodes.

```bash
#!/bin/bash
# optimize-ipv6-ndp.sh
# Optimize IPv6 neighbor discovery on compute nodes

# Increase IPv6 neighbor table sizes
sudo sysctl -w net.ipv6.neigh.default.gc_thresh1=4096
sudo sysctl -w net.ipv6.neigh.default.gc_thresh2=8192
sudo sysctl -w net.ipv6.neigh.default.gc_thresh3=16384

# On Linux kernels before 6.3, consider raising net.ipv6.route.max_size
# if you see route cache pressure. On newer kernels, IPv6 route cache
# garbage collection is managed without this setting.

# Set NDP retransmit timer explicitly
sudo sysctl -w net.ipv6.neigh.default.retrans_time_ms=1000

# Persist settings
cat << 'EOF' | sudo tee /etc/sysctl.d/99-calico-ipv6.conf
# IPv6 scaling optimizations for Calico
net.ipv6.neigh.default.gc_thresh1 = 4096
net.ipv6.neigh.default.gc_thresh2 = 8192
net.ipv6.neigh.default.gc_thresh3 = 16384
# Explicit NDP retransmit timer in milliseconds
net.ipv6.neigh.default.retrans_time_ms = 1000
EOF

sudo sysctl --system
```

```mermaid
graph TD
    A[Dual-Stack VM] --> B[IPv4 10.0.x.x]
    A --> C[IPv6 fd00:10:96::x]
    B --> D[IPv4 Neutron Subnet]
    C --> E[IPv6 Neutron Subnet]
    D --> F[Calico Routes]
    E --> G[Calico Routes]
    F --> H[Compute Fabric]
    G --> H
```

## Configuring IPv6 Security Policies

Create network policies that handle both IPv4 and IPv6 traffic.

```yaml
# dual-stack-policy.yaml
# Network policy for dual-stack environment
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: dual-stack-web-policy
spec:
  selector: role == 'web'
  types:
    - Ingress
    - Egress
  ingress:
    # Allow HTTP over both IPv4 and IPv6
    - action: Allow
      protocol: TCP
      destination:
        ports:
          - 80
          - 443
    # Allow ICMPv6 (required for IPv6 to function)
    - action: Allow
      protocol: ICMPv6
  egress:
    # Allow DNS over both protocols
    - action: Allow
      protocol: UDP
      destination:
        ports:
          - 53
    # Allow all IPv6 traffic to internal range
    - action: Allow
      destination:
        nets:
          - fd00:10:96::/48
    # Allow all IPv4 traffic to internal range
    - action: Allow
      destination:
        nets:
          - 10.0.0.0/8
```

## Scaling BGP for IPv6 Routes

Configure BGP to handle IPv6 route distribution efficiently.

```yaml
# bgp-ipv6-config.yaml
# BGP configuration for route-reflector or fabric peering
apiVersion: projectcalico.org/v3
kind: BGPConfiguration
metadata:
  name: default
spec:
  nodeToNodeMeshEnabled: false
  asNumber: 64512
---
apiVersion: projectcalico.org/v3
kind: BGPPeer
metadata:
  name: route-reflector-ipv6
spec:
  # Peer every compute node with an IPv6-capable route reflector or fabric router
  nodeSelector: all()
  peerIP: 2001:db8:10::1
  asNumber: 64512
```

## Verification

Verify dual-stack connectivity and route distribution.

```bash
#!/bin/bash
# verify-ipv6-scale.sh
# Verify IPv6 scaling configuration

echo "=== IPv6 Subnet Status ==="
openstack subnet list --ip-version 6
openstack subnet show openstack-ipv6 -f value -c cidr -c ipv6_ra_mode -c ipv6_address_mode

echo ""
echo "=== IPv6 Routes on Compute Nodes ==="
for node in $(openstack compute service list -f value -c Host | sort -u); do
  v6routes=$(ssh ${node} 'ip -6 route show proto bird | wc -l')
  echo "${node}: ${v6routes} IPv6 BGP routes"
done

echo ""
echo "=== IPv6 Neighbor Table ==="
for node in $(openstack compute service list -f value -c Host | sort -u); do
  neighbors=$(ssh ${node} 'ip -6 neigh show | wc -l')
  echo "${node}: ${neighbors} IPv6 neighbors"
done

echo ""
echo "=== Dual-Stack Connectivity Test ==="
echo "Create a test VM and verify it gets both IPv4 and IPv6 addresses"
```

## Troubleshooting

- **VMs not getting IPv6 addresses**: Verify the OpenStack IPv6 subnet exists and has available addresses. Check that the OpenStack subnet is configured for IPv6 with SLAAC or DHCPv6.
- **IPv6 connectivity fails between VMs**: Check that ICMPv6 is allowed in security groups (required for NDP). Verify IPv6 routes exist on compute nodes with `ip -6 route show proto bird`.
- **NDP table overflow**: Increase `gc_thresh` values for IPv6 neighbor tables. This manifests as intermittent IPv6 connectivity when the neighbor table is full.
- **BGP not advertising IPv6 routes**: Verify BIRD is configured for the IPv6 address family. Check BIRD logs for IPv6-specific errors.

## Conclusion

Scaling IPv6 in OpenStack with Calico requires attention to NDP optimization, dual-stack policy configuration, and BGP tuning for the larger route tables that IPv6 brings. By configuring appropriate Neutron subnets, optimizing kernel parameters, and ensuring security policies cover both address families, you can build a reliable dual-stack OpenStack deployment that scales to thousands of VMs.
