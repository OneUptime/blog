# Validation Summary: How to Configure Longhorn Priority Classes - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Longhorn
- Kubernetes
- Kubernetes PriorityClass
- `kubectl`
- Helm / Longhorn chart configuration

## Sources Consulted
- Longhorn Priority Class documentation: https://longhorn.io/docs/1.11.1/advanced-resources/deploy/priority-class/
- Longhorn settings reference: https://longhorn.io/docs/1.11.1/references/settings/
- Longhorn customizing default settings: https://longhorn.io/docs/latest/advanced-resources/deploy/customizing-default-settings/
- Longhorn official chart PriorityClass manifest: https://raw.githubusercontent.com/longhorn/charts/v1.11.x/charts/longhorn/templates/priorityclass.yaml
- Longhorn official chart values: https://raw.githubusercontent.com/longhorn/charts/v1.11.x/charts/longhorn/values.yaml
- Kubernetes Pod Priority and Preemption: https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- Kubernetes Node-pressure Eviction: https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/
- Kubernetes Advanced Pod Configuration: https://kubernetes.io/docs/concepts/workloads/pods/advanced-pod-config/

## Issues Found
- The post used `value: 1000000` for `longhorn-critical`. I changed it to `1000000000` to match Longhorn's official PriorityClass manifest.
- The post described node-pressure behavior as "memory or CPU" pressure and said Kubernetes evicts the lowest-priority pods first. I corrected this to node-pressure events such as memory or disk pressure and removed the absolute eviction-order claim, because Kubernetes also considers requests and usage during kubelet eviction decisions.
- The post used `setting.longhorn.io` in the `kubectl patch` and `kubectl get` examples. I changed these to `settings.longhorn.io`, which matches Longhorn's documented CRD resource naming.
- The post implied the Longhorn `priority-class` setting applies to all Longhorn pods and restarts them uniformly. I corrected this to state that the setting applies to system-managed components, that user-deployed components such as Longhorn Manager, Driver, and UI must be configured separately, and that volume detachment affects when the change is applied.
- The priority hierarchy described built-in priorities as generic `kube-system` pod values. I changed this to reference the built-in `system-node-critical` and `system-cluster-critical` classes directly.

## Review Notes
- Review was performed against Kubernetes documentation current as of 2026-04-29 and Longhorn 1.11.1 documentation, with the official `v1.11.x` chart used to confirm the shipped `longhorn-critical` manifest and default chart values.
- The post is technically accurate after the corrections above.
