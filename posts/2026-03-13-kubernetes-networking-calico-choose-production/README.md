# How to Choose Kubernetes Networking for Calico Users for Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, CNI, Production, Networking, BGP, VXLAN, IP-in-IP

Description: A decision framework for selecting Calico networking modes and IP address management strategies for production Kubernetes deployments.

---

## Introduction

Choosing the right networking configuration for a production Calico deployment involves several interconnected decisions: encapsulation mode, BGP peering topology, IP pool sizing, and IPv6 support. Each decision has performance, operational, and compatibility implications that compound in a production environment.

This post provides a structured decision framework for the key networking choices Calico users face when designing for production. The framework is opinionated - based on what works in real production environments - while acknowledging that every infrastructure environment has unique constraints.

## Prerequisites

- Understanding of your cloud provider or on-premises network topology
- Knowledge of whether your network fabric supports BGP
- Decision made on eBPF vs iptables dataplane (covered in a separate post)
- Capacity planning: estimated node count and pod density

## Decision 1: Encapsulation Mode

| Mode | When to Use | Overhead |
|---|---|---|
| IP-in-IP | Cloud VPCs without BGP peering where protocol 4 is supported | Low (20 bytes per packet) |
| VXLAN | Cloud environments blocking IP-in-IP or other non-TCP/UDP protocols | Medium (50 bytes per packet) |
| Native (BGP) | On-premises with BGP-capable ToR switches | None |
| CrossSubnet | Multi-AZ deployments where same-subnet traffic is native and cross-subnet is encapsulated | Variable |

For cloud VPC networks that cannot route pod CIDRs directly, VXLAN or IP-in-IP are common overlay choices; in Azure, use VXLAN because the Azure network fabric blocks IP-in-IP packets. For bare-metal deployments with a BGP-capable fabric (Junos, EOS, Cumulus), native routing eliminates encapsulation overhead entirely.

```mermaid
graph TD
    Q1{Does your network\nblock non-TCP/UDP protocols?}
    Q1 -->|Yes| VXLAN[Use VXLAN]
    Q1 -->|No| Q2{Do you have a\nBGP-capable fabric?}
    Q2 -->|Yes| BGP[Use Native BGP\nNo encapsulation]
    Q2 -->|No| Q3{Multi-AZ cluster?}
    Q3 -->|Yes| CS[Use CrossSubnet\nNative same-AZ, encap cross-AZ]
    Q3 -->|No| IPIP[Use IP-in-IP]
```

## Decision 2: IP Pool Sizing

The most common production mistake is an undersized IP pool. Calculate your pool size:

- Calico allocates IPs in blocks (default /26 = 64 IPs per IPv4 block)
- Blocks are allocated to hosts on demand, allowing Calico to aggregate routes
- Add 30% headroom for burst scaling and rolling upgrades

For a cluster with maximum 100 nodes at 50 pods per node:
- Required: 100 × 64 = 6,400 IPs minimum with default IPv4 blocks
- With 30% headroom: 8,320 IPs → use a /18 (16,384 IPs)

```bash
# Check current allocation

calicoctl ipam show
```

## Decision 3: BGP Peering Topology

If using native BGP routing, choose between:

- **Node-to-node mesh**: Every node peers with every other node. Simple, but O(n²) peer relationships. Use for clusters with fewer than 50 nodes.
- **Route reflectors**: Designated nodes act as BGP route reflectors. Scales to thousands of nodes. Required for large clusters.

```bash
# Disable node-to-node mesh for large clusters
calicoctl patch bgpconfiguration default \
  -p '{"spec":{"nodeToNodeMeshEnabled":false}}'
```

## Decision 4: IPv4 vs. Dual-Stack

Calico supports IPv4-only, IPv6-only, and dual-stack configurations. For most production clusters, IPv4-only is the default. Enable dual-stack only if your workloads require IPv6 reachability. With the Tigera operator, configure both IPv4 and IPv6 pools at install time:

```yaml
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  calicoNetwork:
    ipPools:
      - blockSize: 26
        cidr: 10.48.0.0/21
        encapsulation: IPIP
        natOutgoing: Enabled
        nodeSelector: all()
      - blockSize: 122
        cidr: 2001::/64
        encapsulation: None
        natOutgoing: Enabled
        nodeSelector: all()
```

Dual-stack requires Calico IPAM and Kubernetes dual-stack support, and should be enabled at cluster creation - it cannot be retrofitted to existing single-stack clusters without downtime.

## Best Practices

- Size IP pools at cluster creation - resizing requires careful IPAM migration
- Use CrossSubnet mode for multi-AZ deployments to avoid unnecessary encapsulation overhead within an AZ
- For clusters > 50 nodes with BGP, deploy route reflectors on dedicated non-worker nodes
- Document your encapsulation mode, pool CIDR, and BGP topology in your cluster runbook - these are the facts you need fastest during incidents

## Conclusion

Production Calico networking decisions center on four choices: encapsulation mode (matched to your fabric capabilities), IP pool size (sized generously at creation), BGP topology (mesh for small, route reflectors for large), and IPv4/dual-stack. Making these decisions explicitly before cluster creation - and documenting the rationale - prevents the most common production networking problems.
