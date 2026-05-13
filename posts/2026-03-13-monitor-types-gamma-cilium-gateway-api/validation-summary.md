# Validation Summary: How to Monitor Types of GAMMA Configuration in the Cilium Gateway API

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Cilium (CNI)
- Cilium Hubble (observability)
- Gateway API for Mesh Management and Administration (GAMMA)
- Kubernetes Gateway API
- Prometheus (metrics + alerting)
- Grafana (dashboards)
- PromQL

## Sources Consulted
- Cilium Monitoring & Metrics docs: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Hubble setup docs: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Hubble CLI observe docs: https://docs.cilium.io/en/stable/observability/hubble/hubble-cli/
- Cilium source — flow metric handler: https://github.com/cilium/cilium/blob/main/pkg/hubble/metrics/flow/handler.go
- Cilium source — hubble metrics context: https://github.com/cilium/cilium/blob/main/pkg/hubble/metrics/api/context.go
- Cilium source — hubble observe flag definitions: https://github.com/cilium/cilium/blob/main/hubble/cmd/observe/flows_filter.go
- Cilium issue #12656 (confirms `hubble_flows_processed_total` spelling): https://github.com/cilium/cilium/issues/12656
- Kubernetes Gateway API GAMMA initiative: https://gateway-api.sigs.k8s.io/mesh/

## Issues Found
1. **Wrong Prometheus metric in the namespace-routing query.** The post used `cilium_forward_count_total{destination_workload=~"api-.*"}` and grouped by `source_namespace, destination_workload`. The Cilium agent metric `cilium_forward_count_total` only carries a `direction` label — it does not expose namespace or workload labels, so the query as written would always return no series. Changed it to `hubble_flows_processed_total`, which is the Hubble flow metric that can expose `source_namespace` and `destination_workload` when Hubble is configured with a matching `labelsContext`. Added a one-line note explaining the required Hubble metric configuration so the query actually works.
2. **Same metric error in the alert rule.** The `ConsumerRouteBypassDetected` alert filtered `cilium_forward_count_total{source_namespace=..., destination_workload=...}`, which would never match for the same reason. Replaced with `hubble_flows_processed_total` so the alert can fire under the documented Hubble configuration.

## Review Notes
- `hubble observe` flags used (`--namespace`, `--protocol http`, `--follow`, `--to-service`) are all valid in Cilium 1.14+ and were verified against the Hubble CLI source.
- The `labelsContext` option that exposes `source_namespace` / `destination_workload` as distinct label keys is supported by Hubble metrics; the alternative `sourceContext=workload`/`destinationContext=workload` approach instead emits generic `source`/`destination` label keys with the workload encoded in the value, so it would not match this query's selectors.
- The post uses the GAMMA terminology (producer-controlled / consumer-controlled routes) consistently with the upstream Gateway API GAMMA initiative.
- The mermaid architecture diagram, prerequisites, and dashboard panel descriptions are conceptually accurate; no changes needed.
