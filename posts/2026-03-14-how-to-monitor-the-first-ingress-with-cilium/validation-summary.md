# Validation Summary: Monitoring Cilium Ingress Traffic and Health

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- Cilium Ingress Controller
- Kubernetes
- Helm
- Envoy proxy metrics
- Prometheus and PrometheusRule
- Hubble
- Grafana

## Sources Consulted
- Cilium Monitoring & Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium Kubernetes Ingress Support documentation: https://docs.cilium.io/en/stable/network/servicemesh/ingress/
- Cilium Hubble setup documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli.html
- Envoy HTTP connection manager statistics reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_conn_man/stats

## Issues Found
- The Cilium values snippet enabled `envoy.prometheus.serviceMonitor.enabled` but did not enable Cilium agent metrics with `prometheus.enabled=true`, which Cilium documents as the Helm value for exposing Cilium agent metrics, including Envoy. Added `prometheus.enabled: true`.
- The Hubble metrics snippet enabled exemplars for `httpV2` but did not enable OpenMetrics. Added `hubble.metrics.enableOpenMetrics: true`, which Cilium documents as required for exemplar support, and added `hubble.metrics.serviceMonitor.enabled: true` for Prometheus Operator scraping.
- The PromQL examples mixed label sets directly. Updated request, latency, error, and connection examples to use `sum(...)` or `sum by (le) (...)` where needed.
- The high error rate alert divided a 5xx series that retained `envoy_response_code_class` by a total request series without that label, which would not match correctly in PromQL. Aggregated both sides before division.
- The high latency alert compared Envoy `downstream_rq_time` histogram values to `5`, but Envoy documents this histogram in milliseconds. Changed the threshold to `5000` for the stated 5 second alert.
- The verification command port-forwarded Envoy metrics on port `9090`. Cilium documents Envoy metrics on port `9964`, and the post enables the standalone Envoy DaemonSet with `envoy.enabled: true`. Updated the verification command to port-forward `svc/cilium-envoy` on `9964`.
- The verification command used `cilium status | grep -i ingress`, which is not a reliable documented way to list Ingress resources. Replaced it with `kubectl get ingress -A -o wide`.

## Review Notes
- The Hubble `--to-service` examples are syntactically consistent with Hubble's service filter, but the actual service name can differ depending on Cilium Ingress load balancer mode and resource names.
- Envoy metric labels and stat prefixes can vary by generated Envoy configuration. The PromQL examples are valid starting points, but dashboards may need grouping labels adjusted for a specific cluster.
