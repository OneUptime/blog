# Validation Summary: How to Use Grafana for Cilium Observability

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- Hubble
- Grafana
- Prometheus and PromQL
- Kubernetes
- Helm
- Grafana HTTP API

## Sources Consulted
- Cilium documentation: Running Prometheus & Grafana - https://docs.cilium.io/en/stable/observability/grafana/
- Cilium documentation: Monitoring & Metrics - https://docs.cilium.io/en/stable/observability/metrics/
- Cilium official dashboard JSON files - https://github.com/cilium/cilium/tree/v1.19.3/install/kubernetes/cilium/files
- Grafana documentation: Dashboard HTTP API - https://grafana.com/docs/grafana/latest/http_api/dashboard/
- Grafana documentation: Data source HTTP API - https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/api-legacy/data_source/
- Grafana documentation: Import dashboards - https://grafana.com/docs/grafana/latest/dashboards/export-import/

## Issues Found
- The Grafana Helm install was described as installing Cilium dashboards, but it only configured Grafana and a Prometheus datasource. Updated the wording and added `--create-namespace` plus a stable Prometheus datasource UID.
- The dashboard import examples used a `dashboardId` payload against `/api/dashboards/import`, which is not the supported shape for importing dashboard JSON through the documented dashboard API. Replaced this with imports from Cilium's official dashboard JSON files using `/api/dashboards/db`.
- The prerequisites did not mention that Cilium, Hubble, and Cilium Operator metrics are independently disabled/enabled. Added the relevant Cilium Helm values.
- Several PromQL examples used incorrect or non-default Cilium/Hubble metric labels. Updated `cilium_policy_l7_total` grouping to `proxy_type`, changed HTTP error rate to use `hubble_http_responses_total`, changed DNS grouping to `qtypes`, replaced the nonexistent TCP connect duration query with `hubble_tcp_flags_total`, and changed flow grouping to the default `verdict` label.
- The custom dashboard used nonexistent labels such as `type="denied"` and `endpoint` on `cilium_policy_l7_total`. Replaced those panels with Hubble flow verdict/drop queries using documented labels.
- The alert example for policy denials used an invalid `cilium_policy_l7_total{type="denied"}` selector. Replaced it with a dropped-flow alert using `hubble_flows_processed_total{verdict="DROPPED"}`.
- Verification commands used numeric datasource ID endpoints. Updated them to UID-based datasource health and proxy endpoints.

## Review Notes
- Some Hubble queries group by `destination_workload`; this is technically valid only when Hubble `labelsContext` includes that label, so the post now calls out that requirement.
- Grafana's legacy `/api` endpoints still work, but Grafana documentation notes they are being deprecated in favor of the newer `/apis` structure starting in Grafana 13.
