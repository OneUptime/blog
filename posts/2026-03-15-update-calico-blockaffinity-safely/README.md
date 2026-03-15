# How to Update the Calico BlockAffinity Resource Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, BlockAffinity, IPAM, Kubernetes, Networking, IP Management

Description: Learn how to safely update Calico BlockAffinity resources without disrupting pod networking or causing IP address conflicts.

---

## Introduction

The Calico BlockAffinity resource controls which nodes have affinity for specific CIDR blocks in your cluster's IP address management system. Each BlockAffinity ties an IP block to a particular node, ensuring that pods scheduled on that node receive IP addresses from the associated block.

Updating BlockAffinity resources incorrectly can lead to IP address conflicts, orphaned allocations, or pods losing network connectivity. Because these resources are tightly coupled with the IPAM subsystem, changes must be coordinated carefully to avoid disrupting running workloads.

This guide walks through the safe process for updating BlockAffinity resources, including pre-update checks, backup procedures, and validation steps that prevent common pitfalls.

## Prerequisites

- A running Kubernetes cluster with Calico CNI installed
- `kubectl` configured with cluster-admin privileges
- `calicoctl` binary installed and configured
- Familiarity with Calico IPAM concepts and IP pools

## Inspecting Current BlockAffinity State

Before making any changes, examine the existing BlockAffinity resources in your cluster:

```bash
calicoctl get blockaffinities -o yaml
```

Check which nodes own which blocks:

```bash
calicoctl get blockaffinities -o wide
```

Review the specific BlockAffinity you plan to update:

```yaml
apiVersion: projectcalico.org/v3
kind: BlockAffinity
metadata:
  name: node01-192-168-10-0-26
spec:
  cidr: 192.168.10.0/26
  node: node01
  state: confirmed
  deleted: "false"
```

## Backing Up Before Changes

Always create a backup of your BlockAffinity resources before modifying them:

```bash
calicoctl get blockaffinities -o yaml > blockaffinity-backup-$(date +%Y%m%d).yaml
```

Also back up related IPAMBlocks to ensure consistency:

```bash
calicoctl get ipamblocks -o yaml > ipamblocks-backup-$(date +%Y%m%d).yaml
```

## Draining Workloads Before Update

If you need to reassign a block to a different node, first drain the workloads using IPs from that block:

```bash
kubectl drain node01 --ignore-daemonsets --delete-emptydir-data --grace-period=60
```

Verify no pods are still using IPs from the target block:

```bash
kubectl get pods --all-namespaces -o wide | grep node01
```

## Applying the Update Safely

Use `calicoctl apply` with the updated resource. Change the node assignment carefully:

```yaml
apiVersion: projectcalico.org/v3
kind: BlockAffinity
metadata:
  name: node02-192-168-10-0-26
spec:
  cidr: 192.168.10.0/26
  node: node02
  state: confirmed
  deleted: "false"
```

Apply with:

```bash
calicoctl apply -f updated-blockaffinity.yaml
```

To release a block affinity without reassigning, mark it as deleted:

```yaml
apiVersion: projectcalico.org/v3
kind: BlockAffinity
metadata:
  name: node01-192-168-10-0-26
spec:
  cidr: 192.168.10.0/26
  node: node01
  state: confirmed
  deleted: "true"
```

## Verification

Confirm the update applied correctly:

```bash
calicoctl get blockaffinities -o yaml | grep -A 5 "192.168.10.0/26"
```

Verify IPAM consistency:

```bash
calicoctl ipam check
```

Check that new pods on the target node receive IPs from the correct block:

```bash
kubectl run test-pod --image=busybox --restart=Never --overrides='{"spec":{"nodeName":"node02"}}' -- sleep 3600
kubectl get pod test-pod -o wide
```

Clean up the test pod:

```bash
kubectl delete pod test-pod
```

## Troubleshooting

If pods fail to get IP addresses after the update, check the calico-node logs:

```bash
kubectl logs -n kube-system -l k8s-app=calico-node --tail=50 | grep -i "ipam\|block"
```

If you see IPAM block conflicts, restore from your backup:

```bash
calicoctl apply -f blockaffinity-backup-$(date +%Y%m%d).yaml
```

For orphaned block affinities where the original node no longer exists:

```bash
calicoctl ipam release --ip=192.168.10.5
```

If the calico-node pod is crash-looping after the change, check for duplicate block assignments:

```bash
calicoctl get blockaffinities -o yaml | grep -B 3 "192.168.10.0/26"
```

## Conclusion

Updating Calico BlockAffinity resources requires careful planning to avoid IP conflicts and connectivity disruptions. Always back up existing resources, drain affected workloads, and validate IPAM consistency after making changes. Following the procedures in this guide helps ensure that block reassignments and modifications complete without impacting running services.
