# Validation Summary: How to Configure Resource Limits for Pods on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine configuration, kubelet reservations, cgroup v2)
- Kubernetes (Pod resources, QoS classes, LimitRange, ResourceQuota)
- kubectl (apply, describe, top, get events)
- talosctl (read)
- cgroups (CFS throttling stats)
- JVM heap sizing inside containers

## Sources Consulted
- Kubernetes — Resource Management for Pods and Containers: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes — Configure Quality of Service for Pods: https://kubernetes.io/docs/tasks/configure-pod-container/quality-service-pod/
- Kubernetes — About cgroup v2: https://kubernetes.io/docs/concepts/architecture/cgroups/
- Kubernetes kubelet OOM watcher source (event reason `SystemOOM`): https://github.com/kubernetes/kubernetes/blob/master/pkg/kubelet/oom/oom_watcher_linux.go
- Talos v1.3.0 release notes (cgroup v2 default): https://github.com/siderolabs/talos/releases/tag/v1.3.0
- Talos v1.9 MachineConfig reference (`machine.kubelet.extraConfig`): https://docs.siderolabs.com/talos/v1.9/reference/configuration/v1alpha1/config/
- Sidero docs — Cgroups Resource Analysis: https://docs.siderolabs.com/talos/v1.9/build-and-extend-talos/cluster-operations-and-maintenance/cgroups-analysis
- Kubernetes — LimitRange: https://kubernetes.io/docs/concepts/policy/limit-range/
- Kubernetes — Resource Quotas: https://kubernetes.io/docs/concepts/policy/resource-quotas/

## Issues Found

1. **Incorrect cgroup path (cgroup v1 layout shown for a cgroup v2 system).**
   The post showed `/sys/fs/cgroup/cpu/kubepods/burstable/pod<pod-uid>/cpu.stat`, which is the cgroup v1 hierarchy. Talos Linux has defaulted to cgroup v2 since v1.3.0 (December 2022), and the kubelet uses the systemd cgroup driver, so the unified-hierarchy/systemd-slice path is required. The cgroup v2 stat keys are also different (`throttled_usec` instead of `throttled_time`). Updated the path to:
   `/sys/fs/cgroup/kubepods.slice/kubepods-burstable.slice/kubepods-burstable-pod<pod_uid_with_underscores>.slice/cpu.stat`
   and updated the stat name reference accordingly, plus added a short clarifying sentence about cgroup v2 + systemd driver and the UID-dashes-to-underscores convention.

2. **Wrong event reason for OOM events.**
   The post used `--field-selector reason=OOMKilling` for `kubectl get events`. The kubelet's OOM watcher emits node-level OOM events with reason **`SystemOOM`** (see `pkg/kubelet/oom/oom_watcher_linux.go`); `OOMKilled` is the container termination reason in the Pod status, not an Event `reason`. Updated the filter to `reason=SystemOOM` and adjusted the surrounding comment to make clear these are node-level OOM events.

## Review Notes
- `machine.kubelet.extraConfig` with `systemReserved`, `kubeReserved`, and `evictionHard` keys was verified against the Talos v1alpha1 config reference and is correct.
- The QoS-class description is slightly simplified — strictly, **Burstable** means the Pod has at least one container with a CPU or memory request/limit set and does not qualify as Guaranteed (e.g., a Pod with only requests set is Burstable even though there are no limits at all). The post's "request or limit set, but they are not equal" phrasing is a minor simplification rather than an outright error, so it was left as-is to preserve the author's voice.
- For container-level OOM kills (as opposed to node-level system OOM), a more reliable signal is `kubectl get pods -o json | jq '... | select(.lastState.terminated.reason=="OOMKilled")'`. This is supplementary and was not added to keep the scope of edits minimal.
- The cgroup paths and `cpu.stat` field names should be re-verified if Talos or kubelet defaults change again (e.g., a future switch in cgroup driver).
