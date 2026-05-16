# Validation Summary: How to Troubleshoot Cgroup-Related Issues on Talos Linux

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Talos Linux
- talosctl
- Kubernetes
- Linux cgroup v2
- Kubelet resource management
- Kubernetes resource requests, limits, QoS, and evictions

## Sources Consulted
- Sidero Labs Talos CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Sidero Labs Talos logging documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/logging-and-telemetry/logging
- Sidero Labs Talos machine configuration reference: https://docs.siderolabs.com/talos/v1.13/reference/configuration/v1alpha1/config
- Linux kernel cgroup v2 documentation: https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html
- Kubernetes cgroup v2 documentation: https://kubernetes.io/docs/concepts/architecture/cgroups/
- Kubernetes kubelet command reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/
- Kubernetes kubelet configuration API reference: https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/
- Kubernetes feature gates reference: https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates/
- Kubernetes Pod QoS documentation: https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/

## Issues Found
- The post used `talosctl ls`, but the current Talos CLI reference documents `talosctl list` for directory listings. Changed the command to `talosctl list /sys/fs/cgroup/kubepods.slice --nodes <node-ip>`.
- The OOM diagnosis described `oom > 0` as meaning the OOM killer was triggered. In cgroup v2, `oom_kill` records killed processes, while `oom` records the cgroup entering OOM state. Updated the comments to distinguish `oom_kill`, `oom`, and `max`.
- The memory usage comment said `memory.current` showed usage at the time of the kill. `memory.current` is current cgroup memory usage, not historical usage. Updated the wording.
- The explicit pod cgroup paths used `<uid>` without noting systemd escaping. Added `<uid_with_underscores>` and a note that Pod UID dashes are usually escaped as underscores in systemd cgroup names.
- The CPU and IO discovery loops only matched pods under QoS sub-slices and missed Guaranteed pods directly under `kubepods.slice`. Replaced the hard-coded glob with `find /sys/fs/cgroup/kubepods.slice -name "kubepods*pod*.slice" -type d`.
- The `cpu-cfs-quota-period` example omitted the required `CustomCPUCFSQuotaPeriod` feature gate for non-default values. Added `feature-gates: "CustomCPUCFSQuotaPeriod=true"` to the Talos kubelet `extraArgs` example.

## Review Notes
The remaining examples are intentionally diagnostic and environment-dependent. The post assumes Talos with cgroup v2 and the systemd cgroup driver, which matches current Kubernetes recommendations and Talos defaults, but cgroup paths can still vary by runtime, QoS class, and Kubernetes version.
