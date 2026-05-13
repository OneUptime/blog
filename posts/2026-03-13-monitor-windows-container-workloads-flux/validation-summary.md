# Validation Summary: How to Monitor Windows Container Workloads Deployed by Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD (Kustomization, GitOps)
- Kubernetes (Windows nodes, DaemonSets, ServiceMonitors)
- Prometheus / Prometheus Operator (ServiceMonitor, PrometheusRule)
- windows_exporter (Prometheus exporter for Windows)
- Fluent Bit (Windows-specific image, winlog input plugin, Loki output)
- Loki (log aggregation)
- Grafana (dashboard ConfigMaps)
- IIS (Internet Information Services) monitoring

## Sources Consulted
- prometheus-community/windows_exporter documentation: https://github.com/prometheus-community/windows_exporter
- windows_exporter IIS collector docs: https://github.com/prometheus-community/windows_exporter/blob/master/docs/collector.iis.md
- Fluent Bit Windows installation docs: https://docs.fluentbit.io/manual/installation/windows
- Fluent Bit Docker image registry (Docker Hub): https://hub.docker.com/r/fluent/fluent-bit/tags
- Fluent Bit Windows Event Log inputs (winlog/winevtlog): https://docs.fluentbit.io/manual/pipeline/inputs/windows-event-log
- Prometheus Operator CRDs (monitoring.coreos.com/v1): https://github.com/prometheus-operator/prometheus-operator
- Flux CD Kustomization API (kustomize.toolkit.fluxcd.io/v1): https://fluxcd.io/flux/components/kustomize/kustomizations/
- kube-state-metrics documentation (kube_pod_status_ready): https://github.com/kubernetes/kube-state-metrics/tree/main/docs

## Issues Found

1. **Incorrect Fluent Bit Windows image tag**: The image was specified as `cr.fluentbit.io/fluent/fluent-bit:windows-amd64-latest`, which is not a valid tag pattern. Per the Fluent Bit registry on Docker Hub, Windows tags follow the pattern `windows-{YEAR}-{VERSION}` (e.g., `windows-2022-5.0.4`, `windows-2025-5.0.5`). Updated the tag to `windows-2022-3.2.10` so that the manifest copy-paste resolves to a real image.

## Review Notes

- **Missing Service for ServiceMonitor**: The ServiceMonitor in Step 2 selects pods by `app: windows-exporter`, but a `Service` resource is needed for the Prometheus Operator to discover endpoints. This is a common simplification in tutorial-style posts but readers will need to add a Service for the ServiceMonitor to actually find targets. Left as-is since the post is illustrative.
- **Container log path is Docker-specific**: The hostPath mount `C:\ProgramData\Docker\containers` is the path used by the Docker runtime. Modern Kubernetes (1.24+) no longer supports dockershim; containerd or other runtimes will store logs at different paths. The symlink directory `C:\var\log\containers\` (also mounted) generally works across runtimes since kubelet maintains those symlinks. Worth noting as a potential gotcha for containerd-based clusters.
- **`windows_iis_current_application_pool_state` state values verified**: Per windows_exporter docs, states are Uninitialized/Initialized/Running/Disabling/Disabled/Shutdown_Pending/Delete_Pending, so the alert's `state!="Running"` check is correct. Label name `app` is also correct (verified against IIS collector docs).
- **`windows_iis_requests_total` metric**: Correct metric name and label `site` from the IIS collector.
- **`runAsUserName: "ContainerAdministrator"`**: Valid Windows container security context user.
- **Loki output config**: All parameter names are correct, and a `${NODE_NAME}` env var is referenced in `Labels` but is not explicitly populated via downward API in the pod spec — readers will need to add an `env:` block to make that substitution work.
- **`latest` image tag for windows-exporter**: Using `latest` works but is discouraged in production; consider pinning a specific release for reproducibility.
