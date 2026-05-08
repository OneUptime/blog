# Validation Summary: Troubleshooting Prometheus and Grafana for Cilium Observability

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Hubble
- Kubernetes
- Prometheus
- Prometheus Operator ServiceMonitor
- Grafana
- CiliumNetworkPolicy

## Sources Consulted
- Cilium Monitoring & Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Layer 7 Protocol Visibility documentation: https://docs.cilium.io/en/stable/observability/visibility/
- Cilium Kubernetes policy constructs documentation: https://docs.cilium.io/en/stable/security/policy/kubernetes/
- Cilium Running Prometheus & Grafana documentation: https://docs.cilium.io/en/stable/observability/grafana/
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Grafana Data source HTTP API documentation: https://grafana.com/docs/grafana-cloud/developer-resources/api-reference/http-api/api-legacy/data_source/
- Grafana dashboard pages for Cilium Agent, Operator, and Hubble dashboards: https://grafana.com/grafana/dashboards/16611, https://grafana.com/grafana/dashboards/16612, https://grafana.com/grafana/dashboards/16613

## Issues Found
- The CiliumNetworkPolicy example allowed Prometheus by label only, but the policy is created in `kube-system` while Prometheus is typically in `monitoring`. Added `k8s:io.kubernetes.pod.namespace: monitoring` so the `fromEndpoints` selector can match Prometheus pods across namespaces.
- The specific metric check used `cilium_policy_verdict`, which is not a current Cilium metric. Replaced it with `cilium_policy_l7_total`, matching the Prometheus query used in the same section.
- The `cilium config` command omitted the `cilium-agent` container while other DaemonSet exec commands target that container explicitly. Added `-c cilium-agent` for correctness in multi-container Cilium pods.
- Grafana datasource proxy and health examples used numeric datasource IDs. Grafana documents UID-based datasource proxy and health endpoints as the non-deprecated form, so the examples now resolve the Prometheus datasource UID and use UID endpoints.
- The Grafana dashboard IDs listed `16612` as Hubble Metrics. Grafana identifies `16612` as Cilium Operator Metrics and `16613` as Hubble Metrics, so the dashboard list was corrected.
- The troubleshooting text referenced `--metrics-scrape-timeout`, which is not a Prometheus flag. Replaced it with `scrape_timeout` in the relevant Prometheus `scrape_config`, with the documented constraint that it must not exceed the scrape interval.
- The Hubble HTTP metrics note referenced a bare `proxy-visibility` annotation. Updated the guidance to use an L7 Cilium network policy or another supported L7 visibility configuration, matching current Cilium documentation.

## Review Notes
The commands assume common service names, namespaces, labels, credentials, and dashboard choices. Those are reasonable examples but may need adjustment for clusters installed with custom Helm values or managed monitoring stacks.
