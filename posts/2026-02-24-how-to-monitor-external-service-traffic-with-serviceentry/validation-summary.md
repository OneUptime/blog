# Validation Summary: How to Monitor External Service Traffic with ServiceEntry

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio ServiceEntry
- Istio telemetry and standard metrics
- Prometheus and PromQL
- Grafana dashboards
- Kiali service graph
- Envoy/Istio access logging
- Distributed tracing with Istio

## Sources Consulted
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio external services/egress control task: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-control/
- Istio Envoy access logs task: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio Telemetry API task: https://istio.io/latest/docs/tasks/observability/telemetry/
- Istio distributed tracing overview: https://istio.io/latest/docs/tasks/observability/distributed-tracing/overview/
- Kiali graph FAQ: https://kiali.io/docs/faq/graph/
- Kiali topology documentation: https://kiali.io/docs/features/topology/

## Issues Found
- The post described TLS origination as Envoy terminating and re-originating TLS. I changed this to say Envoy originates TLS for the upstream connection after receiving an HTTP request, which matches Istio's egress TLS origination behavior.
- Metric selector examples were marked as `bash` even though they are PromQL-style metric selectors. I changed those code fences to `promql`.
- The Grafana examples filtered external ServiceEntry traffic with `destination_service_namespace="unknown"`. In current Istio, registered external services are associated with the ServiceEntry namespace, while `unknown` is more appropriate for missing destination information or passthrough cases. I changed the examples to use a replaceable ServiceEntry namespace and exclude Kubernetes service FQDNs.
- The latency panel title promised P50, P95, and P99 but the query only computed P95. I changed the title to P95.
- The Kiali section made an overly specific shape/icon claim for external services. I changed it to the documented ServiceEntry node wording and used the current "Display Service Nodes" option name.
- The access-log `jq` command filtered `upstream_host` for `stripe`, but the sample `upstream_host` is an IP address and would not match. I changed the filter to use the request authority.

## Review Notes
The access logging snippet uses mesh config, which is still documented, but Istio currently recommends the Telemetry API for access logging configuration when possible. The PromQL examples assume Istio standard metrics are enabled and scraped by Prometheus.
