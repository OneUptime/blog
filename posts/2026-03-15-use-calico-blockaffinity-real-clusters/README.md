# How to Use the Calico BlockAffinity Resource in Real Clusters

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, BlockAffinity, IPAM, Kubernetes, Networking, Production

Description: Practical guide to managing Calico BlockAffinity resources in production Kubernetes clusters for efficient IP address allocation.

---

## Introduction

In production Kubernetes clusters, the Calico BlockAffinity resource determines how IP address blocks are distributed across nodes. Each node claims affinity for one or more CIDR blocks, and pods scheduled on that node receive IPs from those blocks. This design reduces the number of routes needed in the cluster and improves IPAM performance.

Understanding how BlockAffinity works in real clusters is essential for capacity planning, troubleshooting IP exhaustion, and managing node scaling events. When nodes are added or removed, BlockAffinity resources are created and cleaned up as part of the IPAM lifecycle.

This guide covers practical scenarios you will encounter when operating Calico IPAM in production, including monitoring block distribution, handling node failures, and optimizing IP utilization.

## Prerequisites

- A production Kubernetes cluster running Calico v3.20 or later
- `calicoctl` installed and configured
- `kubectl` with cluster-admin access
- At least one configured Calico IPPool

## Understanding Block Distribution

List all block affinities to see how IP blocks are distributed:

```bash
calicoctl get blockaffinities -o wide
```

View the IPPool configuration that governs block sizes:

```yaml
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: default-ipv4-ippool
spec:
  cidr: 10.244.0.0/16
  blockSize: 26
  ipipMode: Always
  natOutgoing: true
  nodeSelector: all()
```

The `blockSize: 26` means each block holds 64 IP addresses. Check how many blocks each node owns:

```bash
calicoctl get blockaffinities -o yaml | grep "node:" | sort | uniq -c | sort -rn
```

## Monitoring IP Utilization Per Block

Check the actual IP usage within each block:

```bash
calicoctl ipam show --show-blocks
```

For a specific node, see which blocks are assigned and their utilization:

```bash
calicoctl ipam show --show-blocks | grep node01
```

## Handling Node Scale-Up Events

When a new node joins the cluster, Calico automatically creates a BlockAffinity. Verify the assignment after the node becomes ready:

```bash
kubectl get nodes -w
calicoctl get blockaffinities -o yaml | grep -A 4 "new-node"
```

If a new node does not receive a block, check the IPPool has available space:

```bash
calicoctl ipam show
```

## Handling Node Removal and Cleanup

When decommissioning a node, clean up its block affinities to return IPs to the pool:

```bash
kubectl drain node-to-remove --ignore-daemonsets --delete-emptydir-data
kubectl delete node node-to-remove
```

Verify block affinities are released:

```bash
calicoctl get blockaffinities -o yaml | grep "node-to-remove"
```

If orphaned affinities remain, run an IPAM check to identify leaked addresses and release them:

```bash
calicoctl ipam check -o report.json
calicoctl ipam release --from-report=report.json
```

## Restricting Blocks to Specific Nodes

Use node selectors on IPPools to control which nodes can claim blocks from specific pools:

```yaml
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: gpu-nodes-pool
spec:
  cidr: 10.245.0.0/24
  blockSize: 28
  ipipMode: Always
  natOutgoing: true
  nodeSelector: "hardware == 'gpu'"
```

Apply the pool and label your GPU nodes:

```bash
calicoctl apply -f gpu-pool.yaml
kubectl label node gpu-node-01 hardware=gpu
```

## Verification

Confirm block affinities match your expected topology:

```bash
calicoctl get blockaffinities -o wide
```

Verify pods receive IPs from the correct pools:

```bash
kubectl run gpu-test --image=busybox --restart=Never --overrides='{"spec":{"nodeName":"gpu-node-01"}}' -- sleep 3600
kubectl get pod gpu-test -o jsonpath='{.status.podIP}'
kubectl delete pod gpu-test
```

Run the IPAM consistency check:

```bash
calicoctl ipam check
```

## Troubleshooting

If nodes are running out of IPs, check if blocks are fully allocated:

```bash
calicoctl ipam show --show-blocks
```

If a node has too many blocks while others have none, this may indicate uneven scheduling. Check the `maxBlocksPerHost` setting in your IPAM configuration.

If block affinities are stuck in a pending state, restart the calico-node pod on the affected node:

```bash
kubectl delete pod -n kube-system -l k8s-app=calico-node --field-selector spec.nodeName=affected-node
```

For IP leak detection, compare allocated IPs against running pods:

```bash
calicoctl ipam check
```

## Conclusion

Managing Calico BlockAffinity resources in production requires monitoring IP utilization, handling node lifecycle events, and ensuring consistent block distribution. By understanding how block affinities interact with IPPools and node selectors, you can optimize IP allocation and prevent exhaustion issues in large-scale clusters.
