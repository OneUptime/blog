# Validation Summary: How to Monitor Cilium Gateway API Support

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes Gateway API
- Hubble
- Prometheus
- Grafana
- kube-state-metrics CustomResourceState metrics

## Sources Consulted
- Cilium Monitoring & Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Gateway API Support documentation: https://docs.cilium.io/en/stable/network/servicemesh/gateway-api/gateway-api/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Hubble CLI observe flags reference issue: https://github.com/cilium/hubble/issues/1280
- Kubernetes Gateway API Troubleshooting and Status documentation: https://gateway-api.sigs.k8s.io/concepts/troubleshooting/
- Kubernetes Gateway API Implementer's Guide: https://gateway-api.sigs.k8s.io/guides/implementers/
- kube-state-metrics project documentation: https://github.com/kubernetes/kube-state-metrics
- Gateway API State Metrics CustomResourceState documentation: https://github.com/Kuadrant/gateway-api-state-metrics
- Gateway API State Metrics metric definitions: https://raw.githubusercontent.com/Kuadrant/gateway-api-state-metrics/main/METRICS.md
- Gateway API State Metrics CustomResourceState config: https://raw.githubusercontent.com/Kuadrant/gateway-api-state-metrics/main/config/default/custom-resource-state.yaml

## Issues Found
- The key metrics table described `cilium_forward_count_total` as forwarded packets per endpoint, but Cilium documents this metric with a `direction` label, not endpoint labels. Changed the description to "Forwarded packets by direction."
- The key metrics table listed `cilium_http_requests_total`, but Hubble HTTP request metrics are exposed as `hubble_http_requests_total` when Hubble HTTP metrics are enabled. Updated the metric name and description.
- The Hubble example used `--type trace` for watching ingress flows. This filters trace event types rather than HTTP gateway traffic. Updated it to `hubble observe --protocol http --follow`.
- The post described the dropped-flow command as monitoring HTTP error rates. The command filters dropped HTTP flows, not HTTP response error rates. Updated the wording to "Monitor dropped HTTP flows."
- The PromQL dashboard query used `cilium_forward_count_total{destination_namespace="<ns>"}` and grouped by `destination_workload`, but those labels are not documented for Cilium's forward count metric. Changed the query to use `hubble_http_requests_total`, which supports destination context labels when Hubble metrics are configured with workload and namespace context.
- The alert used `kube_gateway_status_conditions{type="Programmed",status="False"}`, which is not the metric name used by the commonly published kube-state-metrics CustomResourceState configuration for Gateway API. Updated it to `gatewayapi_gateway_status{type="Programmed"} == 0`.

## Review Notes
The Gateway API status metric name depends on how kube-state-metrics CustomResourceState is configured. The updated alert matches the Kuadrant Gateway API State Metrics configuration, which prefixes metrics with `gatewayapi_`. Hubble destination workload and namespace labels also depend on Hubble metrics context options being enabled in the Cilium configuration.
