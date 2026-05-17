# Validation Summary: How to Configure Memory Limits with Cgroups on Talos Linux

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Talos Linux (machine configuration, kubelet)
- Kubernetes (Memory QoS, pod resources, QoS classes)
- cgroup v2 memory controller (memory.min, memory.low, memory.high, memory.max, memory.events, memory.stat)
- Linux OOM killer
- talosctl
- kubectl
- Prometheus / kube-state-metrics / cAdvisor alert rules
- Kubelet eviction thresholds
- NodeSwap feature gate

## Sources Consulted
- KEP-2570 Memory QoS — https://github.com/kubernetes/enhancements/blob/master/keps/sig-node/2570-memory-qos/README.md
- Kubernetes blog: "Quality-of-Service for Memory Resources" — https://kubernetes.io/blog/2023/05/05/qos-memory-resources/
- Kubernetes Pod QoS docs — https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/
- Kernel cgroup v2 documentation (memory controller) — https://www.kernel.org/doc/Documentation/admin-guide/cgroup-v2.rst
- Kubelet eviction docs — https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/
- Kubernetes swap support — https://kubernetes.io/docs/concepts/architecture/nodes/#swap-memory
- Talos Linux configuration reference for `machine.kubelet`

## Issues Found
1. **Incorrect `memory.high` formula description and example value.** The post originally said `memory.high = 966367641 (approximately 90% of 1 GiB)` for a 512Mi/1Gi pod and that the formula is `memory.max * memoryThrottlingFactor`. Per KEP-2570, for Burstable pods Kubernetes uses `memory.high = floor[(requests + memoryThrottlingFactor * (limits - requests)) / pageSize] * pageSize`, which gives ~1,020,051,456 bytes (~973 MiB), not 90% of the limit. The `limit * factor` form only ever applied historically to the Guaranteed case (and current Memory QoS does not even set `memory.high` for Guaranteed pods). Updated both the worked example and the in-YAML comment to the correct formula.
2. **Misleading mapping for `memory.low`.** The post's "Kubernetes → cgroup v2" table associated `resources.requests.memory` with `memory.low` as "best-effort protection", implying Kubernetes sets `memory.low` from requests. Kubernetes Memory QoS does not set `memory.low` at all — it only sets `memory.min` and `memory.high`. Removed the `memory.low` row from the table and added a short note clarifying that `memory.low` exists in cgroup v2 but is not configured by Memory QoS.

## Review Notes
- The "Understanding the Memory Hierarchy" prose for `memory.min`, `memory.low`, `memory.high`, and `memory.max` accurately reflects cgroup v2 semantics.
- The `memory.events` field descriptions (low/high/max/oom/oom_kill/oom_group_kill) are slight simplifications of the kernel definitions (e.g., `low` actually counts reclaims that occurred despite usage being below memory.low, and `high` counts throttling/direct-reclaim events), but they convey the right intent for an operations audience.
- Cgroup paths shown (`/sys/fs/cgroup/kubepods.slice/kubepods-burstable.slice/...`) assume the systemd cgroup driver, which is the common default for Talos's containerd setup on cgroup v2. Users running the cgroupfs driver would see `/sys/fs/cgroup/kubepods/burstable/...` instead.
- `memorySwap.swapBehavior: "LimitedSwap"` and the `NodeSwap` feature gate are valid. `NodeSwap` is beta and enabled-by-default in Kubernetes 1.30+, so the `feature-gates` entry is only strictly required on older releases.
- The kubelet eviction settings are shown under `extraArgs` (command-line flags). Talos also supports placing these inside `extraConfig` as a KubeletConfiguration (`evictionHard`, `evictionSoft`, etc.), which is the more future-proof form since many kubelet flags are being phased out — worth considering for a future revision.
- `memoryManagerPolicy: "Static"` additionally requires CPU Manager set to `static` and Topology Manager set to something other than `none`; the example only shows the memory side, so readers enabling it for real should configure those prerequisites separately.
