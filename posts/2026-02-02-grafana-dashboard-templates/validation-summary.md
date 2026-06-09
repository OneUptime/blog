# Validation Summary: How to Create Grafana Dashboard Templates

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- Grafana (dashboard JSON model, templating, variables, provisioning, HTTP API)
- Prometheus / PromQL (`label_values`, `rate`, `histogram_quantile`)
- kube-state-metrics (`kube_pod_info`) and cAdvisor (`container_cpu_usage_seconds_total`, `container_memory_working_set_bytes`) metrics
- Grafana Helm chart sidecar (kiwigrid sidecar) for dashboard/data source auto-loading
- Kubernetes ConfigMaps
- YAML provisioning for dashboards and data sources
- Python (`requests`, `json`, `re`) and Bash (`jq`) tooling

## Sources Consulted
- Grafana dashboard JSON model reference: https://grafana.com/docs/grafana/latest/dashboards/build-dashboards/view-dashboard-json-model/
- Grafana variable types and syntax: https://grafana.com/docs/grafana/latest/dashboards/variables/ and https://grafana.com/docs/grafana/latest/dashboards/variables/variable-syntax/
- Grafana provisioning docs: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana HTTP API (dashboards): https://grafana.com/docs/grafana/latest/developers/http_api/dashboard/
- Grafana transformations (filterByValue): https://grafana.com/docs/grafana/latest/panels-visualizations/query-transform-data/transform-data/
- Grafana Helm chart sidecar values: https://github.com/grafana/helm-charts/tree/main/charts/grafana
- Prometheus query basics for `label_values` template function
- kube-state-metrics metric reference: https://github.com/kubernetes/kube-state-metrics/tree/main/docs

## Issues Found

1. **"Using __data Input" section was misleading.** The text claimed `__data` "lets panels reference other panels' data," which is incorrect — `__data` is a Grafana global variable used in data links to access row data within a single panel, and the code example did not actually use `__data` at all. The example showed a `filterByValue` transformation. **Fix:** Renamed the section to "Filtering Data with Transformations" and rewrote the explanation to accurately describe what the example does. Also added the required `type` ("include") and `match` ("any") fields to the `filterByValue` options block, which are required by the Grafana transformation schema.

2. **Troubleshooting row about variable syntax was incorrect.** The post said: "Use `$variable` not `${variable}` in queries." Both syntaxes are valid in Grafana, and `${variable}` is in fact required when the variable name needs explicit delimiting (e.g., followed by alphanumeric characters) or when using format options like `${var:json}`. **Fix:** Replaced the misleading advice with accurate guidance about ensuring child queries reference the parent variable and that refresh is set appropriately.

## Review Notes

- `schemaVersion: 38` corresponds to Grafana ~10.2/10.3. Grafana 11.x uses higher schema versions, but the lower number is still accepted and the dashboard model fields used (`fiscalYearStartMonth`, `liveNow`, `editable`, `graphTooltip`) are all valid.
- Variable `refresh: 1` (on dashboard load) and `refresh: 2` (on time range change) values match the Grafana JSON model.
- Variable `sort: 1` (alphabetical ascending) is correct.
- The legacy `/api/dashboards/import` endpoint with `inputs` is the historical way to import dashboards with `__inputs` placeholders. Some Grafana documentation now points users toward `/api/dashboards/db`, but `/api/dashboards/import` still works in current Grafana versions for template-style imports. No change needed, but readers running newer Grafana releases may want to migrate to `/api/dashboards/db` in the future.
- The Grafana Helm chart sidecar block (`sidecar.dashboards.*`, `sidecar.datasources.*`) matches the current chart's `values.yaml` schema, including `provider.foldersFromFilesStructure`.
- The Prometheus metrics referenced (`kube_pod_info`, `container_cpu_usage_seconds_total`, `container_memory_working_set_bytes`, `http_request_duration_seconds_bucket`) are standard and correct.
- The provisioning YAML structure (apiVersion 1, providers/datasources lists, fields like `allowUiUpdates`, `updateIntervalSeconds`, `jsonData.httpMethod`) matches Grafana's provisioning docs.
- All `label_values()` invocations use the supported syntax for the Prometheus data source variable query.
