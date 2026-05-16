# Validation Summary: How to Monitor Storage Health on Talos Linux

## Status
validated

## Post Type
Tutorial / How-To Guide

## Technologies Covered
- Talos Linux (talosctl CLI, Talos API resources)
- Kubernetes (PersistentVolumes, PersistentVolumeClaims, CSI drivers, kubelet)
- Prometheus (kube-prometheus-stack, PrometheusRule CRD, PromQL)
- Grafana (dashboard ConfigMap, sidecar discovery)
- Helm (chart installation)
- Longhorn (storage backend monitoring)
- Rook-Ceph (storage backend monitoring)
- kube-state-metrics (PVC phase metrics)

## Sources Consulted
- Talos Linux talosctl CLI reference: https://www.talos.dev/v1.12/reference/cli/
- Talos Disk Management documentation: https://www.talos.dev/v1.12/talos-guides/configuration/disk-management/
- Talos GitHub issue tracker for SMART support: https://github.com/siderolabs/talos/issues/11239
- Kubernetes kubelet metrics reference (kubelet_volume_stats_*): https://kubernetes.io/docs/reference/instrumentation/metrics/
- kube-state-metrics PVC metrics: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/storage/persistentvolumeclaim-metrics.md
- Prometheus Operator PrometheusRule CRD: https://prometheus-operator.dev/docs/api-reference/api/
- kube-prometheus-stack Helm chart: https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack
- Longhorn CRDs: https://longhorn.io/docs/
- Rook-Ceph toolbox documentation: https://rook.io/docs/rook/latest-release/Troubleshooting/ceph-toolbox/

## Issues Found

1. **Incorrect `talosctl get hardwareinfo` command and misleading SMART claim** (Checking SMART Data section).
   - **What was wrong:** The post claimed you could check disk SMART health through the Talos API using `talosctl -n 10.0.0.11 get hardwareinfo`. No `hardwareinfo` resource exists in Talos (the actual hardware-related resources are `cpu`, `memorymodule`, `pcidevice`, `processor`, `systeminformation`, etc.). More importantly, Talos does not bundle smartctl and does not expose SMART attributes through its API at all — this is a known open feature request (siderolabs/talos#11239).
   - **What I changed:** Replaced the misleading lead-in with a correct explanation that smartctl is not bundled and SMART attributes are not exposed via the API. Replaced `talosctl get hardwareinfo` with `talosctl get disks -o yaml`, which is the closest valid command for inspecting detailed disk metadata (model, serial, transport, rotational, WWID). Kept the dmesg command unchanged as it is correct.

## Review Notes

- All other talosctl commands (`disks`, `usage`, `mounts`, `get blockdevices`, `dmesg`) are valid and current as of Talos v1.12.
- All kubelet volume metrics referenced (`kubelet_volume_stats_used_bytes`, `kubelet_volume_stats_capacity_bytes`, `kubelet_volume_stats_available_bytes`, `kubelet_volume_stats_inodes_used`, `kubelet_volume_stats_inodes`) are correct standard kubelet metric names.
- The `kube_persistentvolumeclaim_status_phase` metric from kube-state-metrics is correct.
- The PrometheusRule CRD structure (`apiVersion: monitoring.coreos.com/v1`) is correct and current.
- The kube-prometheus-stack Helm install snippet is structurally correct; users should note that `local-path` is the local-path-provisioner StorageClass which may not be installed by default in every cluster (worth confirming before running).
- The Grafana dashboard ConfigMap uses the `grafana_dashboard: "1"` sidecar label, which is the conventional pattern used by kube-prometheus-stack's Grafana sidecar — correct.
- The Longhorn (`volumes.longhorn.io`, `nodes.longhorn.io`, `engines.longhorn.io`) and Rook-Ceph toolbox commands are all valid.
- Section heading "Checking SMART Data" was kept intact even after the correction; ideally a future revision would rename it to something like "Checking Disk Metadata and Errors" since SMART is not actually being read, but renaming was out of scope per "do not restructure" guidance.
- The CronJob example uses `alpine:latest` — pinning to a specific Alpine version would be a hygiene improvement, but it is not technically incorrect.
