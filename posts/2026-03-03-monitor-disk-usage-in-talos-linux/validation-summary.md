# Validation Summary: How to Monitor Disk Usage in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (talosctl CLI, COSI resources, etcd)
- Kubernetes (node conditions, kubectl, Metrics Server)
- Prometheus (PromQL, PrometheusRule CRD, predict_linear)
- Node Exporter (node_filesystem_*, node_disk_* metrics)
- Grafana (dashboard panels, gauge/timeseries)
- Helm (kube-prometheus-stack)
- Bash scripting

## Sources Consulted
- Talos CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Talos cli.md (raw): https://raw.githubusercontent.com/siderolabs/talos/main/website/content/v1.14/reference/cli.md
- Talos disk management: https://docs.siderolabs.com/talos/v1.10/configure-your-talos-cluster/storage-and-disk-management/disk-management
- Talos source code (resource definitions):
  - `pkg/machinery/resources/block/disk.go` (`Disks.block.talos.dev`)
  - `pkg/machinery/resources/block/device.go` (`BlockDevices.block.talos.dev`)
  - `pkg/machinery/resources/runtime/runtime.go` (`MountStatusSpec`)
  - `pkg/machinery/resources/perf/cpu.go` (`CPUStats.perf.talos.dev`)
  - `pkg/machinery/resources/perf/mem.go` (`MemoryStats.perf.talos.dev`)
  - `internal/app/machined/internal/server/v1alpha1/v1alpha1_monitoring.go` (SystemStat gRPC method)
- Prometheus Node Exporter metric names (well-known: `node_filesystem_size_bytes`, `node_filesystem_avail_bytes`, `node_filesystem_files`, `node_filesystem_files_free`, `node_disk_read_bytes_total`, `node_disk_written_bytes_total`, `node_disk_io_time_seconds_total`)
- etcd metrics (well-known: `etcd_mvcc_db_total_size_in_bytes`, `etcd_mvcc_db_total_size_in_use_in_bytes`, `etcd_disk_backend_commit_duration_seconds_bucket`)
- Grafana dashboard 1860 (Node Exporter Full) — confirmed by community usage

## Issues Found

1. **`talosctl get mounts` is not a valid command.** The COSI resource is `MountStatus` (accessed as `mountstatus`), and the `df`-like usage output (size/used/available/percent) is produced by the `talosctl mounts` subcommand (without `get`). The original `talosctl get mounts -o yaml` would not produce the "usage percentages" claimed.
   - **Fixed:** Replaced `talosctl get mounts` with `talosctl mounts` for usage stats, and used `talosctl get mountstatus -o yaml` for the structured resource example. Updated the descriptive paragraph to clarify that `/var` is the mount path for the EPHEMERAL partition.

2. **`talosctl get systemstat` is not a valid COSI resource.** `SystemStat` is a gRPC method exposed by the Talos `MachineService`, not a COSI resource — `talosctl get` only works for COSI resources, so this command fails.
   - **Fixed:** Replaced with valid COSI resources `talosctl get cpustats` (from `CPUStats.perf.talos.dev`) and `talosctl get memorystats` (from `MemoryStats.perf.talos.dev`).

3. **`talosctl stats` description is incorrect.** The official help text reads "Get container stats" — it returns per-container CPU/memory consumption (containerd-backed), not host-level system resource usage or disk IO.
   - **Fixed:** Updated the comment to describe per-container resource usage, and added a clarifying note that disk IO must come from Prometheus / Node Exporter.

4. **Script `grep -E "EPHEMERAL|STATE"` would not match `talosctl mounts` output.** The `talosctl mounts` subcommand outputs device paths (e.g. `/dev/sda6`) and mount points (e.g. `/`, `/var`, `/system/state`) — not partition labels like `EPHEMERAL` or `STATE`. The script as written would return nothing.
   - **Fixed:** Updated the grep patterns to match mount paths (`/var`, `/system/state`) which correspond to the EPHEMERAL and STATE partitions respectively. Also switched from `talosctl get mounts` to `talosctl mounts`.

## Review Notes

- `talosctl get blockdevices` and `talosctl get disks` were verified against source (`BlockDevices.block.talos.dev` and `Disks.block.talos.dev`) and are correct.
- `talosctl etcd status` and `talosctl etcd alarm list` are both documented commands and were left unchanged.
- All Prometheus and etcd metric names, the PrometheusRule CRD format, the Helm install command, the JSONPath in `kubectl get nodes -o custom-columns=...`, and the Grafana dashboard JSON snippet are correct.
- The post correctly observes that `kubectl top nodes` does not report disk usage.
- Grafana dashboard ID 1860 (Node Exporter Full) is a real, widely-used community dashboard.
- Minor stylistic observation (not a correctness issue): the section "Checking System Statistics" now uses COSI perf resources that don't include disk IO; the post already correctly directs users to Node Exporter for disk IO metrics, which is the right tool.
