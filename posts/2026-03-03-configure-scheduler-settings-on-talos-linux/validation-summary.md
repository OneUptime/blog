# Validation Summary: How to Configure Scheduler Settings on Talos Linux

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Talos Linux (machine configuration, `cluster.scheduler`, `machine.controlPlane.scheduler`)
- Kubernetes kube-scheduler
- KubeSchedulerConfiguration API (`kubescheduler.config.k8s.io/v1`)
- Scheduler plugins (NodeResourcesFit, NodeResourcesBalancedAllocation) and scoring strategies (LeastAllocated, MostAllocated)
- `talosctl` CLI (`logs`, `apply-config`)
- `kubectl` CLI

## Sources Consulted
- Talos v1alpha1 configuration reference: https://docs.siderolabs.com/talos/v1.7/reference/configuration/v1alpha1/config/
- Kubernetes kube-scheduler config v1 API reference: https://kubernetes.io/docs/reference/config-api/kube-scheduler-config.v1/
- Kubernetes scheduler configuration docs: https://kubernetes.io/docs/reference/scheduling/config/
- KEP-2458 (NodeResources scoring strategy consolidation): https://github.com/kubernetes/enhancements/tree/master/keps/sig-scheduling/2458-node-resource-score-strategy
- Talos control plane / static pods documentation: https://docs.siderolabs.com/talos/v1.7/learn-more/control-plane/

## Issues Found
1. **Invalid plugin `NodeResourcesLeastAllocated` in v1 API** (Custom Scheduler Configuration example).
   The post listed `disabled: - name: NodeResourcesLeastAllocated`. In `kubescheduler.config.k8s.io/v1`, `NodeResourcesLeastAllocated` (and `NodeResourcesMostAllocated`, `RequestedToCapacityRatio`) no longer exist as standalone plugins — they were merged into `NodeResourcesFit` as scoring strategies per KEP-2458. Trying to disable a plugin that doesn't exist is a configuration error. Removed the `disabled` block from that example; the `pluginConfig` already correctly expresses `MostAllocated` via `NodeResourcesFit.scoringStrategy.type`.

2. **Wrong YAML path for disabling the scheduler** (Disabling the Scheduler section).
   The post showed `cluster.scheduler.disabled: true`. The `disabled` field is not part of `cluster.scheduler` (SchedulerConfig) in Talos v1alpha1. It belongs under `machine.controlPlane.scheduler.disabled` (a per-node setting on `MachineControlPlaneConfig`). Corrected the YAML path and updated the surrounding sentence.

3. **`talosctl service kube-scheduler` is incorrect** (Applying Scheduler Configuration section).
   `kube-scheduler` is a Kubernetes static pod managed by kubelet, not a Talos system service. `talosctl service` only enumerates Talos-managed services (apid, containerd, cri, etcd, kubelet, machined, trustd, udevd, etc.). Replaced with `kubectl get pods -n kube-system -l component=kube-scheduler`, which is the correct way to verify the static pod restarted.

4. **`talosctl logs kube-scheduler` missing `-k` flag** (Monitoring Scheduler Behavior section).
   Static pods live in the Kubernetes CRI namespace, not the Talos system namespace. `talosctl logs` defaults to the system namespace, so the `-k` (`--kubernetes`) flag is required to retrieve kube-scheduler logs. Added the `-k` flag and a short inline comment explaining why.

## Review Notes
- The "Resource-Aware Scheduling" section heading on line 145 is missing the `##` markdown prefix and renders as plain text rather than a subheading. Left as-is because the task scope is technical correctness only, not stylistic/markdown formatting.
- The post uses `registry.k8s.io/kube-scheduler:v1.30.0` as an illustrative pinned image; this is correct in form but readers should match the image tag to their Talos/Kubernetes version. Not a defect — just a version caveat.
- The `bind-address: "0.0.0.0"` example exposes the scheduler's metrics/health endpoint on all interfaces. Valid configuration, but production users typically want this restricted to a specific interface; the post doesn't warn about this. Not changed since it's a stylistic/advisory point rather than a technical error.
- The post relies on the `extraArgs` + `extraVolumes` + `machine.files` pattern to ship a custom `KubeSchedulerConfiguration`. Newer Talos versions also support an inline `cluster.scheduler.config` field that accepts the KubeSchedulerConfiguration directly. The approach shown still works; it's just one of two valid options.
