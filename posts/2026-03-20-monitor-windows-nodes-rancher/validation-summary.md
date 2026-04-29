# Validation Summary: How to Monitor Windows Nodes in Rancher

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Rancher (Kubernetes management)
- Kubernetes (DaemonSet, Service, nodeSelector, tolerations, HostProcess containers)
- windows_exporter (Prometheus exporter for Windows)
- Prometheus Operator (ServiceMonitor CRD)
- PromQL (alerting expressions)
- Grafana (dashboards)

## Sources Consulted
- [prometheus-community/windows_exporter README](https://github.com/prometheus-community/windows_exporter) — verified the `--collectors.enabled` flag and default port 9182
- [windows_exporter Kubernetes deployment guide](https://github.com/prometheus-community/windows_exporter/blob/master/kubernetes/kubernetes.md) — verified HostProcess container requirements
- [windows_exporter daemonset.yaml example](https://github.com/prometheus-community/windows_exporter/blob/master/kubernetes/windows-exporter-daemonset.yaml) — verified securityContext and hostNetwork settings
- [windows_exporter service collector docs](https://github.com/prometheus-community/windows_exporter/blob/master/docs/collector.service.md) — verified `windows_service_state` and `windows_service_start_mode` metric names and labels
- [windows_exporter os collector docs](https://github.com/prometheus-community/windows_exporter/blob/master/docs/collector.os.md) — confirmed `windows_os_physical_memory_free_bytes` is no longer exposed
- [windows_exporter memory collector docs](https://github.com/prometheus-community/windows_exporter/blob/master/docs/collector.memory.md) — verified `windows_memory_available_bytes` and `windows_memory_physical_total_bytes`
- [windows_exporter cpu collector docs](https://github.com/prometheus-community/windows_exporter/blob/master/docs/collector.cpu.md) — confirmed `windows_cpu_time_total{mode="idle"}` is correct
- [Grafana dashboard 14694](https://grafana.com/grafana/dashboards/14694) — confirmed it is the Windows Exporter Dashboard
- [Issue #1131 — cs collector deprecation/removal](https://github.com/prometheus-community/windows_exporter/issues/1131) — confirmed `cs` collector has been removed in favor of `cpu_info`/`memory`/`os`

## Issues Found

1. **Missing HostProcess container configuration in DaemonSet (Step 1).** Without `hostProcess: true` in `securityContext.windowsOptions` and `hostNetwork: true`, a containerized windows_exporter cannot read host-level performance counters and will only report container metrics. Added the `hostNetwork: true` and `securityContext.windowsOptions.hostProcess: true` / `runAsUserName: "NT AUTHORITY\\SYSTEM"` block as documented in the upstream Kubernetes deployment example.

2. **Deprecated `cs` collector in `--collectors.enabled` (Step 1).** The `cs` collector has been removed from current windows_exporter releases — physical memory moved to the `memory` collector and logical processor info moved to `cpu_info`. Replaced `cs` with `cpu_info` in the collectors list.

3. **Invalid memory metric names in WindowsNodeLowMemory alert (Step 5).** `windows_os_physical_memory_free_bytes` is not exposed by the current `os` collector and `windows_cs_physical_memory_bytes` is from the deprecated `cs` collector. Replaced with the supported `windows_memory_available_bytes / windows_memory_physical_total_bytes` from the `memory` collector.

4. **Invalid service metric and labels in WindowsServiceDown alert (Step 5).** The post used `windows_service_status{status="stopped", start_mode="auto"}`, but the actual metric is `windows_service_state` with a `state` label, and start mode is exposed as a separate metric `windows_service_start_mode` with a `start_mode` label. Rewrote the expression as `windows_service_state{state="stopped"} == 1 and on(instance, name) windows_service_start_mode{start_mode="auto"} == 1`.

## Review Notes

- The upstream prometheus-community DaemonSet example also uses an init container that runs `New-NetFirewallRule` to open TCP/9182 in the Windows host firewall. The post does not include this; on clusters where the Windows host firewall blocks 9182, scraping will fail and an init container or out-of-band firewall rule may be needed. Left out of fixes since some environments (e.g., domain-joined nodes with policy-managed firewalls) don't need it.
- HostProcess containers require Kubernetes 1.22+ with containerd 1.6+ on the Windows nodes. This is universally true for any current Rancher/RKE2 install but worth noting for very old clusters.
- The `release: monitoring` label on the ServiceMonitor assumes the kube-prometheus-stack Helm release is named `monitoring`; this depends on the user's Prometheus Operator install and is fine as a common-case example.
- The `tolerations` use a `key: os, value: windows` taint — this matches the convention used by some Rancher Windows node pool setups but is not universal. Users on clusters using the `node.kubernetes.io/os` taint or no taint at all may need to adjust.
- `image: ...:latest` is convenient for a tutorial but should be pinned to a specific version (e.g., `0.30.x`) for production use.
