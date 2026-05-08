# How to Create the Calico IPAMConfiguration Resource

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, IPAMConfiguration, Kubernetes, IP Address Management, Networking

Description: Create Calico IPAMConfiguration resources to control IP address allocation behavior and pool assignment in your cluster.

---

## Introduction

The Calico IPAMConfiguration resource controls how Calico allocates IP addresses to workloads across your cluster. It defines the global IPAM behavior including whether strict affinity is enforced for IP block assignments to nodes. This configuration directly impacts IP allocation efficiency and routing table size.

By default, Calico assigns IP blocks to nodes on a first-come basis and allows borrowing from blocks assigned to other nodes when a local block is exhausted. The IPAMConfiguration resource lets you change this behavior to enforce strict affinity, which is required for certain networking modes and integration scenarios.

This guide covers creating IPAMConfiguration resources for different cluster architectures, including strict affinity mode for cloud routing and relaxed mode for flexible IP allocation.

## Prerequisites

- A Kubernetes cluster with Calico installed (v3.20+)
- `calicoctl` installed and configured
- `kubectl` access with cluster-admin privileges
- Understanding of your cluster IP address plan

## Understanding the Default IPAM Behavior

Check the current IPAM configuration:

```bash
calicoctl ipam show --show-configuration
```

If no custom configuration exists, Calico uses default settings with strict affinity disabled.

Check the current IP pools:

```bash
calicoctl get ippool -o wide
```

## Creating an IPAMConfiguration with Strict Affinity

Strict affinity prevents borrowing IPs from blocks assigned to other nodes. This is required for integrations that depend on pod IPs staying within the local node's assigned blocks:

```yaml
apiVersion: projectcalico.org/v3
kind: IPAMConfiguration
metadata:
  name: default
spec:
  strictAffinity: true
  maxBlocksPerHost: 10
```

```bash
kubectl apply -f ipam-strict.yaml
```

## Creating an IPAMConfiguration with Relaxed Affinity

For clusters where IP allocation flexibility is more important than routing simplicity, keep strict affinity disabled:

```yaml
apiVersion: projectcalico.org/v3
kind: IPAMConfiguration
metadata:
  name: default
spec:
  strictAffinity: false
  maxBlocksPerHost: 0
```

Setting maxBlocksPerHost to 0 means no limit on blocks per host.

```bash
kubectl apply -f ipam-relaxed.yaml
```

## Configuring IPAM for VPC Routing Integration

When integrating with cloud VPC routing that installs per-node routes, strict affinity keeps workload IPs within the blocks assigned to their node:

```yaml
apiVersion: projectcalico.org/v3
kind: IPAMConfiguration
metadata:
  name: default
spec:
  strictAffinity: true
  maxBlocksPerHost: 5
```

Pair this with an IPPool that uses the correct CIDR for your VPC:

```yaml
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: vpc-pod-network
spec:
  cidr: 10.244.0.0/16
  ipipMode: Never
  natOutgoing: true
  nodeSelector: all()
  blockSize: 26
```

```bash
kubectl apply -f ipam-vpc.yaml
kubectl apply -f vpc-ippool.yaml
```

## Limiting Blocks Per Host

In large clusters, limiting blocks per host prevents any single node from consuming too many IP blocks:

```yaml
apiVersion: projectcalico.org/v3
kind: IPAMConfiguration
metadata:
  name: default
spec:
  strictAffinity: true
  maxBlocksPerHost: 4
```

```bash
kubectl apply -f ipam-limited-blocks.yaml
```

With a /26 block size (64 IPs per block) and maxBlocksPerHost set to 4, each node has IPAM capacity for up to 256 pod IPs, subject to kubelet and node capacity limits.

## Verification

Confirm the IPAMConfiguration is applied:

```bash
kubectl get ipamconfigurations default -o yaml
```

Check block allocation across nodes:

```bash
calicoctl ipam show --show-blocks
```

Verify that new pods receive IPs from the correct blocks:

```bash
kubectl run test-pod --image=busybox --restart=Never -- sleep 3600
kubectl get pod test-pod -o jsonpath='{.status.podIP}'
```

Clean up the test pod:

```bash
kubectl delete pod test-pod
```

## Troubleshooting

If pods fail to get IP addresses after changing IPAM configuration, check for exhausted blocks:

```bash
calicoctl ipam show
```

If strict affinity is enabled and a node has no free IPs in its blocks, pods on that node will stay Pending. Check node block assignments:

```bash
calicoctl ipam show --show-blocks
```

Verify the IPAMConfiguration name is exactly "default" as Calico only reads this specific name:

```bash
kubectl get ipamconfigurations
```

Check calico-node logs for IPAM errors:

```bash
kubectl logs -n calico-system -l k8s-app=calico-node --tail=30 | grep -i "ipam"
```

## Conclusion

The Calico IPAMConfiguration resource controls fundamental IP allocation behavior in your cluster. Use strict affinity when integrating with cloud routing or when you need predictable per-node IP ranges. Use relaxed affinity for maximum IP utilization flexibility. Always verify block allocation after changes and monitor for IP exhaustion in strict affinity mode.
