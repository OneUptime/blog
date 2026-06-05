# Validation Summary: How to Configure the OpenTelemetry Collector to Scrape etcd Prometheus Metrics

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Prometheus receiver
- OpenTelemetry Collector filter processor
- etcd Prometheus metrics
- Kubernetes DaemonSet scheduling
- Kubernetes host networking and hostPath volumes
- kubeadm etcd certificates
- k3s embedded etcd certificates
- Prometheus scrape configuration

## Sources Consulted
- OpenTelemetry Collector contrib releases: https://github.com/open-telemetry/opentelemetry-collector-releases/releases/tag/v0.153.0
- OpenTelemetry Collector Prometheus receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/v0.153.0/receiver/prometheusreceiver
- OpenTelemetry Collector filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.153.0/processor/filterprocessor/README.md
- OpenTelemetry Collector internal telemetry docs: https://opentelemetry.io/docs/collector/internal-telemetry/
- Prometheus configuration reference for `tls_config`: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- etcd monitoring docs: https://etcd.io/docs/v3.7/op-guide/monitoring/
- etcd metrics docs: https://etcd.io/docs/v3.6/metrics/
- Kubernetes kubeadm etcd healthcheck client certificate reference: https://kubernetes.io/docs/reference/setup-tools/kubeadm/generated/kubeadm_init/kubeadm_init_phase_certs_etcd-healthcheck-client/
- Kubernetes `kubectl port-forward` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- k3s advanced configuration docs for embedded etcd certificates: https://docs.k3s.io/advanced
- k3s server option reference for `--etcd-expose-metrics`: https://docs.k3s.io/cli/server

## Issues Found
- The Collector image was pinned to `otel/opentelemetry-collector-contrib:0.96.0`, which is outdated for a 2026 guide. Updated it to `0.153.0`, the current official contrib release available during review.
- The filter processor example used the older `metrics.include.match_type` / `metric_names` style. Updated it to the current `metric_conditions` syntax documented for Collector `0.146.0` and later, preserving the same behavior by dropping metrics whose names do not match the intended etcd/process/gRPC prefixes.
- The post described the static scrape setup as requiring Kubernetes RBAC permissions and included a ClusterRole/ClusterRoleBinding. Static Prometheus targets with host-mounted certificates do not require Kubernetes API permissions, so the section now uses only a dedicated ServiceAccount and explains why no RBAC rules are needed.
- Updated wording in the description and introduction from RBAC setup/permissions to scheduling setup, matching the corrected deployment model.

## Review Notes
The Collector configuration was validated with `otel/opentelemetry-collector-contrib:0.153.0 validate --config=/etc/otel/config.yaml`. Temporary dummy certificate files were mounted for validation because the real kubeadm etcd certificate paths are not present in this local environment. Kubernetes manifests were reviewed for API shape and scheduling semantics, but not applied to a live cluster.
