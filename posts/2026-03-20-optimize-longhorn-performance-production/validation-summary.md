# Validation Summary: How to Optimize Longhorn Performance for Production - Optimize Production

## Status
validated

## Post Type
Tutorial / Production-readiness guide

## Technologies Covered
- Longhorn (Rancher distributed block storage for Kubernetes)
- Kubernetes (StorageClass, PriorityClass, kubectl, CRDs)
- Prometheus (PromQL queries against Longhorn metrics)
- ext4 filesystem (mkfs.ext4, mount options)
- Linux disk/network tooling (lsblk, iperf3, fstab)
- Helm (Longhorn manager resource configuration)

## Sources Consulted
- Longhorn metrics reference: https://longhorn.io/docs/latest/monitoring/metrics/
- Longhorn settings reference: https://longhorn.io/docs/latest/references/settings/
- Longhorn StorageClass parameters: https://longhorn.io/docs/latest/references/storage-class-parameters/

## Issues Found
- **Incorrect Prometheus metric names and query types.** The original "Key Prometheus Metrics for Performance" block treated Longhorn's volume metrics as Prometheus histograms/counters, which they are not. Specifically:
  - `longhorn_volume_read_latency_microseconds_bucket` does not exist; the actual metric is the gauge `longhorn_volume_read_latency` (nanoseconds, not microseconds), so `histogram_quantile(...)` is invalid against it.
  - `longhorn_volume_read_iops`, `longhorn_volume_write_iops`, `longhorn_volume_read_throughput`, and `longhorn_volume_write_throughput` are gauges, so wrapping them in `rate(...)` produces meaningless output. Replaced with direct gauge selectors.
  - `longhorn_disk_storage_available_bytes` and `longhorn_disk_storage_maximum_bytes` do not exist. Longhorn exposes `longhorn_disk_capacity_bytes` (total) and `longhorn_disk_usage_bytes` (used). Rewrote the alert expression as `(longhorn_disk_capacity_bytes - longhorn_disk_usage_bytes) / longhorn_disk_capacity_bytes < 0.25` to preserve the original "alert when free space drops below 25%" intent.

## Review Notes
- Several `kubectl patch settings.longhorn.io ...` examples set values that match the documented defaults (e.g. `concurrent-replica-rebuild-per-node-limit=5`, `auto-cleanup-system-generated-snapshot=true`, `storage-minimal-available-percentage=25`, and `priority-class=longhorn-critical`). These are technically correct (no-ops on a fresh install) and serve as illustrative configuration examples, so they were left as-is.
- `replica-replenishment-wait-interval` is set to `300` in the post; Longhorn's default is `600`. This is a deliberate tuning choice and is correctly described.
- Setting `replica-zone-soft-anti-affinity` to `false` for strict zone anti-affinity is accurate per the Longhorn settings reference.
- StorageClass parameters (`numberOfReplicas`, `dataLocality: best-effort`, `diskSelector`, `fsType`, `staleReplicaTimeout`) and the `driver.longhorn.io` provisioner name are all valid.
- The `longhornManager.resources` Helm snippet is illustrative; users should consult the Longhorn chart values for the exact key path in the version they install (this is correctly hedged with "typically configured during Helm installation").
