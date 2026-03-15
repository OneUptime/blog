# How to Use the Calico IPAMConfiguration Resource in Real Clusters

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, IPAMConfiguration, Kubernetes, Production, IP Address Management

Description: Deploy Calico IPAMConfiguration in production clusters for efficient IP management across cloud, bare-metal, and hybrid environments.

---

## Introduction

In production Kubernetes clusters, IP address management directly impacts scalability, routing efficiency, and network integration. The Calico IPAMConfiguration resource governs how IP blocks are distributed to nodes and whether addresses can be shared across nodes. Getting this right is critical for clusters that need to scale beyond a few hundred pods.

Different infrastructure environments demand different IPAM strategies. Cloud-based clusters using VPC routing need strict affinity for clean route advertisements. Bare-metal clusters with limited IP space benefit from relaxed affinity for maximum utilization. Hybrid environments may need careful block sizing to balance both concerns.

This guide covers production IPAM patterns for AWS VPC routing, bare-metal environments, large-scale clusters, and multi-pool architectures.

## Prerequisites

- A Kubernetes cluster with Calico installed (v3.20+)
- `calicoctl` installed and configured
- `kubectl` access with cluster-admin privileges
- Understanding of your network infrastructure and IP address plan

## AWS VPC Routing Integration

For clusters using AWS VPC routing instead of overlay networking, strict affinity is required so each node advertises a predictable set of CIDRs:

```yaml
apiVersion: projectcalico.org/v3
kind: IPAMConfiguration
metadata:
  name: default
spec:
  strictAffinity: true
  maxBlocksPerHost: 4
```

Pair with an IPPool configured for native routing:

```yaml
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: aws-pod-cidr
spec:
  cidr: 10.244.0.0/16
  blockSize: 26
  ipipMode: Never
  vxlanMode: Never
  natOutgoing: true
  nodeSelector: all()
```

```bash
calicoctl apply -f ipam-aws.yaml
calicoctl apply -f ippool-aws.yaml
```

## Bare-Metal High-Density Configuration

On bare-metal clusters where every IP matters, use relaxed affinity with smaller block sizes:

```yaml
apiVersion: projectcalico.org/v3
kind: IPAMConfiguration
metadata:
  name: default
spec:
  strictAffinity: false
  maxBlocksPerHost: 0
```

Use a smaller block size to reduce waste:

```yaml
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: baremetal-pods
spec:
  cidr: 10.42.0.0/16
  blockSize: 28
  ipipMode: Always
  natOutgoing: true
  nodeSelector: all()
```

```bash
calicoctl apply -f ipam-baremetal.yaml
calicoctl apply -f ippool-baremetal.yaml
```

With a /28 block size, each block has 16 IPs. Relaxed affinity allows nodes to borrow from other blocks when their local blocks are full.

## Large-Scale Cluster Configuration

For clusters with hundreds of nodes, limit blocks per host to keep the routing table manageable:

```yaml
apiVersion: projectcalico.org/v3
kind: IPAMConfiguration
metadata:
  name: default
spec:
  strictAffinity: true
  maxBlocksPerHost: 3
```

Use a larger IP pool with bigger blocks:

```yaml
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: large-cluster-pods
spec:
  cidr: 10.0.0.0/14
  blockSize: 24
  ipipMode: CrossSubnet
  natOutgoing: true
  nodeSelector: all()
```

```bash
calicoctl apply -f ipam-large.yaml
calicoctl apply -f ippool-large.yaml
```

With /24 blocks (256 IPs each) and 3 blocks per host, each node supports up to 768 pods.

## Monitoring IPAM Utilization

Set up regular IPAM health checks in production:

```bash
# Check overall utilization
calicoctl ipam show

# Check per-node block allocation
calicoctl ipam show --show-blocks

# Check for IP exhaustion warnings
kubectl logs -n calico-system -l k8s-app=calico-node --tail=100 | grep -i "no free"
```

Create a monitoring script to alert on high utilization:

```bash
#!/bin/bash
TOTAL=$(calicoctl ipam show 2>/dev/null | grep "IPs in use" | awk '{print $1}')
CAPACITY=$(calicoctl ipam show 2>/dev/null | grep "total capacity" | awk '{print $1}')

if [ -n "$TOTAL" ] && [ -n "$CAPACITY" ]; then
  USAGE_PCT=$((TOTAL * 100 / CAPACITY))
  if [ "$USAGE_PCT" -gt 80 ]; then
    echo "WARNING: IPAM utilization at ${USAGE_PCT}%"
  fi
fi
```

## Verification

Verify the complete IPAM setup:

```bash
calicoctl get ipamconfiguration default -o yaml
calicoctl get ippool -o wide
calicoctl ipam show --show-blocks
```

Test pod scheduling across nodes:

```bash
for i in 1 2 3; do
  kubectl run ipam-test-$i --image=busybox --restart=Never -- sleep 30
done
kubectl get pods -o wide | grep ipam-test
kubectl delete pod ipam-test-1 ipam-test-2 ipam-test-3
```

## Troubleshooting

If nodes cannot allocate new blocks, check whether maxBlocksPerHost has been reached:

```bash
calicoctl ipam show --show-blocks | grep <node-name> | wc -l
```

If IP pools are exhausted, either expand the CIDR or add a new pool:

```bash
calicoctl ipam show
```

For clusters experiencing IP churn, check for leaked IPs from terminated pods:

```bash
calicoctl ipam show --show-blocks | grep -v "allocated"
```

Check calico-node IPAM logs for detailed allocation information:

```bash
kubectl logs -n calico-system -l k8s-app=calico-node --tail=50 | grep -i "ipam\|block\|affinity"
```

## Conclusion

Production IPAM configuration depends heavily on your infrastructure. Use strict affinity with cloud VPC routing for clean route advertisements, relaxed affinity on bare metal for maximum IP utilization, and block limits in large clusters to control routing table growth. Monitor utilization continuously and plan capacity expansions before pools are exhausted. The right IPAM strategy prevents pod scheduling failures and keeps your cluster running smoothly at scale.
