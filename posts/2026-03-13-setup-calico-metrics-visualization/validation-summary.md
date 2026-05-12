# Validation Summary: How to Set Up Calico Metrics Visualization Step by Step

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (Felix, Typha, kube-controllers, IPAM)
- Kubernetes
- Prometheus (PromQL)
- Grafana (dashboards, HTTP API, dashboard provisioning via ConfigMap)
- Mermaid diagrams

## Sources Consulted
- Felix Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- kube-controllers Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/kube-controllers/prometheus
- Calico: Felix Grafana dashboard (ID 12175): https://grafana.com/grafana/dashboards/12175-calico-felix/
- Grafana Dashboard HTTP API: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/dashboard/
- Grafana sidecar / dashboard ConfigMap provisioning (kiwigrid/k8s-sidecar): https://github.com/kiwigrid/k8s-sidecar

## Issues Found
1. **`felix_int_dataplane_apply_time_seconds` used as a histogram.** The metric is exposed by Felix as a Prometheus *summary* (with `{quantile="..."}` labels), not a histogram, so it has no `_bucket` series and `histogram_quantile(rate(..._bucket[5m]))` returns nothing. Replaced the query with `felix_int_dataplane_apply_time_seconds{quantile="0.99"}` and added a one-line note explaining why.
2. **`felix_exec_time_micros` used as a histogram with an invented label.** Same root cause: it is a summary, not a histogram, and it does not carry an `action="add-rule"` label. Replaced the query with `felix_exec_time_micros{quantile="0.99"} / 1000000` and corrected the comment (it measures fork/exec time, not "resync duration").
3. **Grafana `/api/dashboards/import` endpoint.** This endpoint is undocumented (a Grafana UI internal); the supported endpoint for importing/creating dashboards is `POST /api/dashboards/db`, and it expects the full dashboard JSON (not `{"id": 12175}`). Rewrote the `curl` example to fetch the dashboard JSON from `grafana.com/api/dashboards/12175/revisions/latest/download`, wrap it in the expected envelope with `jq`, and POST it to `/api/dashboards/db`.
4. **`calico_node_version` metric does not exist.** Felix, Typha, and kube-controllers do not expose a `calico_node_version` series, so the annotation rule could not fire. Replaced it with a query over `kube_pod_container_info{container="calico-node"}` from kube-state-metrics, whose `image` label changes on Calico upgrades, and updated the surrounding comment to explain the indirection.

## Review Notes
- The `ipam_allocations_per_node` and `ipam_blocks_per_node` metrics still exist on calico-kube-controllers (port 9094) and the IP-pool-utilization formula (`alloc / (blocks * 64) * 100`) is correct for the default IPv4 `/26` block size, but the Calico project now prefers the non-per-node series (`ipam_allocations_in_use`, `ipam_blocks`, `ipam_ippool_size`, ...). A future revision could switch to `sum(ipam_allocations_in_use) / sum(ipam_ippool_size) * 100`, which is block-size-agnostic and works for IPv6 pools too.
- `felix_ipsets_total` is correct, but readers may also want `felix_ipsets_calico` (Calico-managed IP sets only) for noise-free dashboards.
- Grafana 13+ is gradually moving public APIs from `/api/...` to `/apis/...`; `/api/dashboards/db` is still the documented endpoint today but worth re-checking on a future Grafana major upgrade.
- The Mermaid diagram uses `\n` for line breaks inside node labels; this renders on github.com but some Mermaid renderers prefer `<br/>`. Left as-is since the rest of the blog uses the same convention.
