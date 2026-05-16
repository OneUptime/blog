# Validation Summary: How to Test High Availability Scenarios in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- talosctl
- Kubernetes
- kubectl
- etcd
- Kubernetes virtual IP / Talos VIP
- PersistentVolumeClaims and replicated storage
- Helm
- Litmus Chaos

## Sources Consulted
- Talos Linux CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Talos Linux virtual shared IP documentation: https://docs.siderolabs.com/talos/v1.9/networking/vip/
- Kubernetes Nodes documentation: https://kubernetes.io/docs/concepts/architecture/nodes/
- Kubernetes Node-pressure Eviction documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/
- Kubernetes Pod lifecycle documentation: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- Litmus Chaos node-drain experiment documentation: https://litmuschaos.github.io/litmus/experiments/categories/nodes/node-drain/
- Litmus Chaos node experiment tunables: https://litmuschaos.github.io/litmus/experiments/categories/nodes/common-tunables-for-node-experiments/
- Litmus Helm chart documentation: https://github.com/litmuschaos/litmus-helm

## Issues Found
- The worker, control plane, and rolling-update failure examples used `talosctl shutdown` without `--force` while describing abrupt node failure behavior. Talos documents `--force` as shutting down without cordon/drain, so the examples were updated to use `--force`.
- The worker recovery example used `talosctl reset --graceful=false`, which resets/wipes a node rather than powering a previously shut down node back on. Replaced it with guidance to use VM, cloud, or hardware power controls.
- The expected worker-failure comments incorrectly tied pod termination directly to `node-monitor-grace-period`. Kubernetes first marks the node NotReady/Unknown after missed heartbeats, then node-controller eviction starts after the unreachable-node eviction delay. Updated the comments to reflect that sequence.
- The network partition section said the isolated node should stop serving API requests. That was too broad: the important failure mode is loss of etcd quorum, so Kubernetes API requests requiring etcd on that isolated control plane node fail. Updated the wording.
- The storage failover example passed a Kubernetes node name directly to `talosctl --nodes`. That is only safe if the node name is resolvable as a Talos endpoint. Updated the command to resolve the Kubernetes node's `InternalIP` before calling `talosctl shutdown --force`.
- The resource exhaustion example set both a 4Gi memory request and a 4Gi memory limit. That tests scheduling or container-limit behavior more than node pressure. Reduced the request and removed the limit so the stress process can actually create node memory pressure in an isolated test environment.

## Review Notes
- The Kubernetes manifests use current stable APIs (`apps/v1` Deployment, `v1` Service, `v1` PVC/Pod) and valid topology spread, readiness probe, and resource fields.
- The `kubectl`, `helm`, `talosctl etcd status`, `talosctl etcd members`, and `talosctl get addresses` command forms are consistent with the consulted documentation.
- The Litmus `node-drain` example is structurally aligned with the documented `ChaosEngine` tunables, but a real installation also needs the appropriate ChaosExperiment and service account/RBAC in the target namespace.
