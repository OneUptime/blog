# How to Set Node Selectors and Tolerations for Rook Operator via Helm

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, Helm, Operator, Scheduling

Description: Configure node selectors and tolerations for the Rook-Ceph operator pod via Helm to control which nodes host the operator workload.

---

## Overview

In mixed workload clusters, you may want the Rook-Ceph operator to run on dedicated infrastructure nodes rather than application nodes. Helm chart values for `nodeSelector` and `tolerations` give you precise control over operator pod placement.

## Setting a Node Selector

To restrict the operator to nodes with a specific label, define `nodeSelector` in your values:

```yaml
nodeSelector:
  kubernetes.io/os: linux
  node-role: storage-infra
```

Label the target nodes before deploying:

```bash
kubectl label node storage-node-1 node-role=storage-infra
kubectl label node storage-node-2 node-role=storage-infra
```

## Configuring Tolerations

Infrastructure nodes often carry taints to repel regular workloads. Add matching tolerations so the operator can be scheduled there:

```yaml
tolerations:
  - key: node-role.kubernetes.io/control-plane
    operator: Exists
    effect: NoSchedule
  - key: storage-dedicated
    operator: Equal
    value: "true"
    effect: NoSchedule
```

Apply the taint to target nodes:

```bash
kubectl taint node storage-node-1 storage-dedicated=true:NoSchedule
```

## Combined Values Example

```yaml
# rook-operator-placement.yaml
nodeSelector:
  kubernetes.io/os: linux
  node-role: storage-infra

tolerations:
  - key: storage-dedicated
    operator: Equal
    value: "true"
    effect: NoSchedule
```

Apply via Helm:

```bash
helm upgrade rook-ceph rook-release/rook-ceph \
  --namespace rook-ceph \
  -f rook-operator-placement.yaml
```

## Verifying Placement

Check which node the operator is running on after applying the changes:

```bash
kubectl get pod -n rook-ceph -l app=rook-ceph-operator \
  -o wide
```

If the operator pod fails to schedule, inspect the events:

```bash
kubectl describe pod -n rook-ceph -l app=rook-ceph-operator | \
  grep -A10 Events
```

A `0/3 nodes are available` message typically indicates a missing label or mismatched toleration.

## Handling Rescheduling After Node Changes

When you change node selectors or tolerations and the operator is already running on an incompatible node, delete the pod to force rescheduling:

```bash
kubectl delete pod -n rook-ceph -l app=rook-ceph-operator
```

The Deployment controller recreates the pod on a matching node.

## Summary

Using `nodeSelector` and `tolerations` in the Rook-Ceph operator Helm chart lets you pin the operator to dedicated infrastructure nodes. Pair node selectors with matching node labels and tolerations with matching taints to ensure the operator lands exactly where intended without affecting other workloads.
