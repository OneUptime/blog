# Validation Summary: How to Monitor Istio Data Plane Health

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Envoy
- Kubernetes
- Prometheus
- PromQL
- Grafana
- kube-state-metrics

## Sources Consulted
- Istio documentation: Debugging Envoy and Istiod - https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Istio documentation: istioctl command reference - https://istio.io/latest/docs/reference/commands/istioctl/
- Istio documentation: Prometheus integration - https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio documentation: Istio Standard Metrics - https://istio.io/latest/docs/reference/config/metrics/
- Istio documentation: Envoy Statistics - https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Istio documentation: pilot-discovery metrics - https://istio.io/latest/docs/reference/commands/pilot-discovery/
- Envoy documentation: Listener statistics - https://www.envoyproxy.io/docs/envoy/latest/configuration/listeners/stats

## Issues Found
- The post treated `NOT SENT` from `istioctl proxy-status` as a broken proxy state. Istio documents `NOT SENT` as usually meaning Istiod had nothing to send for that xDS resource type, so the explanation was corrected.
- The Prometheus scrape example implied that sidecar metrics should simply be scraped from port `15090` by rewriting the address. Istio currently documents merged workload metrics on `:15020/stats/prometheus` by default and Envoy-only metrics on ports named `*-envoy-prom`, so the scrape example was replaced with the documented Envoy stats discovery pattern.
- The active connections query used `envoy_server_total_connections`, which is not an active-connection gauge. It was changed to use Envoy listener active connection stats, and a note was added that the stat may require `proxyStatsMatcher` configuration.
- The proxy convergence section used `envoy_server_hot_restart_epoch`, which tracks Envoy hot restart epoch rather than configuration convergence. It was changed to use `pilot_proxy_convergence_time_bucket`.
- The Grafana example was shaped like a dashboard YAML object but was not a valid Grafana dashboard/provisioning document. It was changed to the PromQL query that should be used in a Grafana gauge panel.
- The automated readiness script selected only pods with `istio.io/rev`, which can miss injected pods depending on injection mode. It was changed to scan all pods and filter for the `istio-proxy` container in the JSON.
- The Prometheus alert grouped Istio request metrics by `namespace`, but Istio standard metrics use `destination_workload_namespace`. The query and annotation were corrected.

## Review Notes
The guide is technically relevant and salvageable. Future improvements could include a complete Kubernetes `CronJob` manifest and a real Grafana dashboard JSON model, but those are completeness improvements rather than blockers for technical validation.
