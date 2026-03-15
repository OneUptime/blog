# How to Use the Calico IPPool Resource in Real Clusters

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, IPPool, Kubernetes, Networking, IPAM, Production, Multi-Tenancy

Description: Practical patterns for using Calico IPPool resources in production Kubernetes clusters with multi-zone and multi-tenant configurations.

---

## Introduction

In production environments, a single default IPPool rarely meets all networking requirements. Real clusters often span multiple availability zones, run workloads with different network characteristics, and need IP address isolation between tenants or environments.

Calico IPPool resources provide the flexibility to address these scenarios. By creating multiple pools with targeted node selectors, different encapsulation modes, and specific CIDR ranges, you can build a network architecture that matches your infrastructure layout.

This guide covers practical IPPool patterns used in production Kubernetes clusters, including multi-zone deployments, tenant isolation, and capacity planning strategies.

## Prerequisites

- A production Kubernetes cluster with Calico CNI
- `kubectl` and `calicoctl` with cluster admin access
- Node labels configured for zones, roles, or tenant assignment
- An IP address plan that accounts for future cluster growth

## Multi-Zone IPPool Configuration

Assign separate pools per availability zone to simplify network debugging and provide zone-level IP management:

```yaml
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: zone-a-pool
spec:
  cidr: 10.244.0.0/18
  vxlanMode: CrossSubnet
  natOutgoing: true
  nodeSelector: topology.kubernetes.io/zone == "us-east-1a"
  blockSize: 26
---
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: zone-b-pool
spec:
  cidr: 10.244.64.0/18
  vxlanMode: CrossSubnet
  natOutgoing: true
  nodeSelector: topology.kubernetes.io/zone == "us-east-1b"
  blockSize: 26
---
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: zone-c-pool
spec:
  cidr: 10.244.128.0/18
  vxlanMode: CrossSubnet
  natOutgoing: true
  nodeSelector: topology.kubernetes.io/zone == "us-east-1c"
  blockSize: 26
```

Apply all pools at once:

```bash
calicoctl apply -f multi-zone-pools.yaml
```

## Namespace-Specific Pool Assignment

Use annotations to direct specific namespaces to use particular pools:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  annotations:
    cni.projectcalico.org/ipv4pools: '["production-pool"]'
```

Create the corresponding pool:

```yaml
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: production-pool
spec:
  cidr: 10.245.0.0/16
  vxlanMode: Always
  natOutgoing: true
  nodeSelector: node-role.kubernetes.io/worker == "true"
  blockSize: 26
```

## Dedicated Pools for System Workloads

Isolate system and infrastructure pods with a dedicated small pool:

```yaml
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: system-pool
spec:
  cidr: 10.246.0.0/20
  vxlanMode: CrossSubnet
  natOutgoing: true
  nodeSelector: node-role.kubernetes.io/control-plane == ""
  blockSize: 28
```

A smaller blockSize of 28 gives 16 IPs per block, which is appropriate for control-plane nodes that run fewer pods.

## No-NAT Pool for External-Facing Services

Some workloads need routable IPs without NAT. Create a pool with natOutgoing disabled:

```yaml
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: external-routable-pool
spec:
  cidr: 172.16.0.0/24
  vxlanMode: Never
  natOutgoing: false
  nodeSelector: node-role.kubernetes.io/edge == "true"
  blockSize: 29
```

Ensure your upstream routers have routes for this CIDR pointing to your cluster nodes.

## Capacity Planning

Calculate pool sizes based on your workload requirements:

```bash
# Check current IPAM utilization
calicoctl ipam show

# View block allocations per node
calicoctl ipam show --show-blocks

# Count pods per node
kubectl get pods -A -o wide --no-headers | awk '{print $8}' | sort | uniq -c | sort -rn
```

A /16 CIDR gives 65,534 usable IPs. With a blockSize of 26, each node gets blocks of 64 IPs. Plan for at least 2x your expected maximum pod count to handle churn.

## Verification

Validate your multi-pool setup is working correctly:

```bash
# List all pools with their status
calicoctl get ippools -o wide

# Check that pods in each zone get correct IPs
kubectl get pods -A -o wide | grep us-east-1a

# Verify namespace annotation is respected
kubectl run test --image=busybox -n production --restart=Never -- sleep 3600
kubectl get pod test -n production -o jsonpath='{.status.podIP}'

# Check IPAM utilization across pools
calicoctl ipam show
```

## Troubleshooting

- If a namespace annotation is not respected, verify the pool name in the annotation matches exactly with `calicoctl get ippools`
- When pods land on the wrong pool, check node labels match the nodeSelector with `kubectl get node <name> --show-labels`
- If a pool runs out of IPs, check utilization with `calicoctl ipam show` and consider expanding with an additional non-overlapping pool
- For cross-zone connectivity issues with VXLANCrossSubnet, verify that nodes in different zones are on different L2 subnets
- Monitor pool utilization with Prometheus metrics from calico-node: `felix_ipam_allocations` and `felix_ipam_blocks`

## Conclusion

Using multiple Calico IPPool resources in production clusters enables zone-aware IP allocation, tenant isolation, and workload-specific networking configurations. The key to success is planning your CIDR ranges to avoid overlaps, sizing pools for growth, and using node selectors and namespace annotations to control allocation. Monitor utilization regularly to avoid exhaustion scenarios.
