# Validation Summary: How to Manage Disk Space on Talos Linux Nodes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (talosctl, machine configuration)
- Kubernetes (kubelet configuration, kubectl, eviction thresholds)
- etcd (status, alarms, compaction)
- Prometheus / PrometheusRule (alerting, predict_linear)
- containerd / CRI (image garbage collection)

## Sources Consulted
- Talos Linux CLI reference: https://docs.siderolabs.com/talos/v1.7/reference/cli/
- Talos `talosctl image` subcommands (source): https://github.com/siderolabs/talos/blob/main/cmd/talosctl/cmd/talos/image.go
- Talos `perf` package resources (CPUStats / MemoryStats): https://github.com/siderolabs/talos/blob/v1.7.0/pkg/machinery/resources/perf/cpu.go and `/mem.go`
- Talos `runtime` package resource list: https://github.com/siderolabs/talos/tree/main/pkg/machinery/resources/runtime
- Talos etcd maintenance documentation: https://docs.siderolabs.com/talos/v1.7/build-and-extend-talos/cluster-operations-and-maintenance/etcd-maintenance
- Kubernetes Kubelet Configuration (v1beta1): https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/
- Kubernetes node-pressure eviction docs (eviction signals, soft/hard thresholds)
- Kubernetes Job `ttlSecondsAfterFinished` (TTL Controller) docs

## Issues Found
1. **Invalid command `talosctl get images`** — Talos does not expose an "images" COSI resource type. The `talosctl image` family handles image listing instead. Changed to `talosctl image list --nodes 192.168.1.10`, which matches the source in `cmd/talosctl/cmd/talos/image.go`.
2. **Invalid command `talosctl get systemstat`** — There is no `SystemStat` resource type in the Talos `runtime` package, and the `perf` package only defines `CPUStats.perf.talos.dev` and `MemoryStats.perf.talos.dev` (queried via `cpustats` / `memorystats`). Replaced with `talosctl get cpustats` and `talosctl get memorystats`, which are the actual resources for system performance statistics.

## Review Notes
- `talosctl get mounts` is a valid alias for the `MountStatus` resource, though its default table output does not include the human-readable used/total/percent values shown in the post's illustrative comment (`/dev/sda6 (EPHEMERAL) - 45GB used of 200GB (22%)`). This is presented as approximate example output and was left as-is; readers may want to use `-o yaml` for full details or use `talosctl mounts` (the df-style command) for usage percentages.
- All kubelet configuration field names used (`imageGCHighThresholdPercent`, `imageGCLowThresholdPercent`, `imageMinimumGCAge`, `containerLogMaxSize`, `containerLogMaxFiles`, `evictionHard`, `evictionSoft`, `evictionSoftGracePeriod`) are valid `KubeletConfiguration` v1beta1 fields.
- Eviction signals (`nodefs.available`, `nodefs.inodesFree`, `imagefs.available`) are valid.
- `talosctl apply-config --mode auto` is a valid mode (auto is also the default if `--mode` is omitted, so the second invocation is a no-op variant of the first; left unchanged because the comment is technically true and the author is illustrating the explicit flag).
- `talosctl upgrade --preserve` and the `ghcr.io/siderolabs/installer` image reference are both valid; the `v1.7.0` tag is pinned to a real Talos release and works as an example.
- `talosctl etcd status` and `talosctl etcd alarm list` are correct per the etcd maintenance docs.
- The `predict_linear` PromQL query and `PrometheusRule` `monitoring.coreos.com/v1` manifest are syntactically correct.
- The Job example uses `ttlSecondsAfterFinished` correctly; the field is GA since Kubernetes 1.23.
