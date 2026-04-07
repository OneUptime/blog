# Validation Summary: How to Set Cluster Management Timeouts in Rook Helm Chart

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph
- Kubernetes
- Helm

## Sources Consulted
- Rook rook-ceph operator Helm chart `values.yaml` (master and release-1.16 branches) — https://github.com/rook/rook/blob/master/deploy/charts/rook-ceph/values.yaml
- Rook CephCluster CR example `cluster.yaml` — https://github.com/rook/rook/blob/master/deploy/examples/cluster.yaml
- Rook Go types for `CephClusterHealthCheckSpec`, `DaemonHealthSpec`, and `ProbeSpec` in the Rook source code

## Issues Found
1. **Fabricated `operatorTimeout` Helm value**: The post included a section titled "Operator Reconcile Timeout" claiming that `operatorTimeout: 5m` controls "the maximum time allowed for a single reconcile loop iteration." This value does not exist anywhere in the rook-ceph Helm chart `values.yaml`. A search across both `master` and `release-1.16` branches returned zero results for `operatorTimeout`, `operator.timeout`, or any reconcile timeout setting. **Fix:** Removed the entire "Operator Reconcile Timeout" subsection and updated the Summary paragraph to remove the reference to "slow reconciliation."

## Review Notes
- The `unreachableNodeTolerationSeconds` default of 5 seconds is correct. The Helm chart comment clarifies this overrides the Kubernetes default pod failure toleration of 5 minutes for the `node.kubernetes.io/unreachable` taint.
- The CephCluster healthCheck configuration (daemonHealth intervals of 45s/60s/60s and livenessProbe nesting under `probe:`) matches the official Rook examples and Go type definitions.
- The Helm repo name `rook-release` is consistent with official Rook installation docs (`helm repo add rook-release https://charts.rook.io/release`).
