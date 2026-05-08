# How to Update the Calico BlockAffinity Resource Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, BlockAffinity, IPAM, Kubernetes, Networking, IP Management

Description: Learn how to safely update Calico BlockAffinity resources without disrupting pod networking or causing IP address conflicts.

---

## Introduction

The Calico BlockAffinity resource records which nodes have affinity for specific CIDR blocks in your cluster's IP address management system. Each BlockAffinity ties an IP block to a particular node, so Calico IPAM can prefer addresses from the associated block for pods scheduled on that node.

Manually updating BlockAffinity resources can lead to IP address conflicts, orphaned allocations, or pods losing network connectivity. Calico manages these resources internally through IPAM, and the supported operations for BlockAffinity resources are get, list, and watch rather than create, update, or delete. Because these resources are tightly coupled with the IPAM subsystem, changes must be coordinated carefully to avoid disrupting running workloads.

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
  deleted: false
```

## Backing Up Before Changes

Always create a backup of your BlockAffinity resources before modifying them:

```bash
calicoctl get blockaffinities -o yaml > blockaffinity-backup-$(date +%Y%m%d).yaml
```

Also capture IPAM block usage to help with later comparison:

```bash
calicoctl ipam show --show-blocks > ipamblocks-backup-$(date +%Y%m%d).txt
```

## Draining Workloads Before Update

If you need to move workloads off the node that currently owns a block, first drain that node:

```bash
kubectl drain node01 --ignore-daemonsets --delete-emptydir-data --grace-period=60
```

Verify no regular pods are still running on the drained node:

```bash
kubectl get pods --all-namespaces -o wide | grep node01
```

## Applying the Update Safely

Do not use `calicoctl apply` to reassign a BlockAffinity. Calico IPAM manages BlockAffinity resources, and direct create, update, and delete operations are not supported for this resource type. After the old workloads have been drained and their pod IPs released by normal pod deletion, let Calico allocate blocks for the target node as new workloads are scheduled there.

If you need to influence future allocations, update the supported IPPool configuration, such as `nodeSelector`, before creating new pods. Verify the pool configuration with:

```bash
calicoctl get ippools -o yaml
```

To release leaked IPAM allocations, use `calicoctl ipam check` to generate a report and release addresses from that report rather than editing BlockAffinity objects directly.

```bash
calicoctl datastore migrate lock
calicoctl ipam check -o report.json
calicoctl ipam release --from-report report.json
calicoctl datastore migrate unlock
```

## Verification

Confirm the BlockAffinity state after Calico has reconciled IPAM:

```bash
calicoctl get blockaffinities -o yaml | grep -A 5 "192.168.10.0/26"
```

Verify IPAM consistency:

```bash
calicoctl ipam check
```

Check that new pods on the target node receive an expected Calico IP address:

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

If you see leaked IPAM allocations, create an IPAM report and release the leaked addresses from that report:

```bash
calicoctl ipam check -o report.json
calicoctl ipam release --from-report report.json
```

For orphaned IP allocations where the original endpoint no longer exists:

```bash
calicoctl ipam release --ip=192.168.10.5
```

If the calico-node pod is crash-looping after the change, check for duplicate block assignments:

```bash
calicoctl get blockaffinities -o yaml | grep -B 3 "192.168.10.0/26"
```

## Conclusion

Working around Calico BlockAffinity resources requires careful planning to avoid IP conflicts and connectivity disruptions. Always back up existing state, drain affected workloads, avoid direct BlockAffinity edits, and validate IPAM consistency after making changes. Following the procedures in this guide helps ensure that IPAM repairs and allocation changes complete without impacting running services.
