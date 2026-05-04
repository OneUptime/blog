# Validation Summary: How to Configure Longhorn Priority Classes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Longhorn (storage)
- Kubernetes
- Kubernetes PriorityClass (scheduling.k8s.io/v1)
- Helm
- kubectl

## Sources Consulted
- Longhorn Helm chart values.yaml: https://raw.githubusercontent.com/longhorn/longhorn/master/chart/values.yaml
- Longhorn settings reference: https://longhorn.io/docs/1.7.0/references/settings/
- Kubernetes Pod Priority and Preemption documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/

## Issues Found
1. **Misleading comment about priority value range.** The original YAML said the value `1000000` was "between node-critical (2000001000) and system-cluster-critical (2000000000)", but `1000000` is far below both built-in classes. Updated the comment to correctly state the value is "below system-cluster-critical (2000000000) and system-node-critical (2000001000)".
2. **Incorrect Longhorn Helm chart values structure.** The post had `priorityClass: { name: "..." }` (an object with a `name` field) under `longhornManager`, `longhornDriver`, and `longhornUI`. According to the official Longhorn Helm chart values.yaml, `priorityClass` is a direct string value, not a nested object. Updated all three component blocks to use `priorityClass: "..."` directly.

## Review Notes
- The built-in priority class values cited (`system-cluster-critical: 2000000000`, `system-node-critical: 2000001000`) are correct per Kubernetes documentation.
- The `kubectl patch settings.longhorn.io priority-class` command correctly targets the top-level `value` field of the Longhorn Setting CRD.
- The `kubectl patch` JSON-patch operations on the `longhorn-manager` DaemonSet, `longhorn-driver-deployer` Deployment, and `longhorn-ui` Deployment use correct resource names and a valid path for `priorityClassName`.
- The Longhorn UI navigation path "Setting → General → Priority Class" matches the current UI layout.
- Note for readers: the `globalDefault: true` field on `production-standard` only affects pods that have no `priorityClassName` set at admission time and only takes effect for one PriorityClass per cluster. Existing pods will not be retroactively updated.
