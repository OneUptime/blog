# Validation Summary: How to Create a Container Metrics Dashboard in Grafana via Portainer - Dashboard

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- Grafana
- Prometheus
- PromQL
- cAdvisor
- Docker

## Sources Consulted
- Grafana create dashboard docs: https://grafana.com/docs/grafana/latest/dashboards/build-dashboards/create-dashboard/
- Grafana Prometheus template variables docs: https://grafana.com/docs/grafana/latest/datasources/prometheus/template-variables/
- Grafana standard options docs: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/configure-standard-options/
- Grafana time series visualization docs: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/visualizations/time-series/
- Grafana provisioning docs: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana dashboard HTTP API docs: https://grafana.com/docs/grafana/latest/http_api/dashboard/
- Grafana HTTP API authentication docs: https://grafana.com/docs/grafana/latest/developers/http_api/auth/
- Prometheus querying basics: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus query functions: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus operators: https://prometheus.io/docs/prometheus/latest/querying/operators/
- cAdvisor Prometheus metrics reference: https://github.com/google/cadvisor/blob/master/docs/storage/prometheus.md
- cAdvisor Prometheus collector source: https://raw.githubusercontent.com/google/cadvisor/master/metrics/prometheus.go

## Issues Found
- The CPU panel query used `container_cpu_usage_seconds_total` without aggregating away cAdvisor's extra `cpu` label, which would produce per-CPU series rather than one series per container. I changed the query to `sum by (name) (rate(...)) * 100`.
- The "better" CPU query filtered on the Kubernetes-oriented `container` label, which is not one of cAdvisor's default Docker labels. I replaced it with a query that uses cAdvisor's documented default `name` and `image` labels.
- The memory limit query used `container_memory_limit_bytes`, which is not a current cAdvisor Prometheus metric. I corrected it to `container_spec_memory_limit_bytes`, matching the documented metric name.
- The memory percentage query could divide by containers without an actual memory limit. I updated the denominator to `(container_spec_memory_limit_bytes{...} > 0)` so only containers with a real limit are included.
- The network receive/transmit queries did not aggregate away cAdvisor's extra `interface` label, so they would emit one series per interface instead of one series per container. I changed both queries to `sum by (name) (rate(...))`.
- The post described `container_last_seen` output as if it were a status/restart view. cAdvisor documents it as a last-seen timestamp, so I rewrote the intro and Step 6 wording to match what the metric actually represents.
- The table panel applied Grafana's Date & Time unit directly to `container_last_seen`, but Grafana expects Date & Time field values in Unix milliseconds while cAdvisor emits seconds. I multiplied the query result by `1000` before formatting it as Date & Time.
- The stat panel title said "Running Containers" even though the query counted `container_last_seen` series. I renamed it to "Containers Seen" to match the query semantics.
- The dashboard export command saved the full dashboard JSON including `id`, which is not appropriate for portable GitOps/provisioning JSON. I updated the export command to remove `id` with `jq '.dashboard | del(.id)'`.

## Review Notes
- The Grafana HTTP examples in Step 8 remain valid, but Grafana 13 documents the legacy `/api` endpoints as deprecated in favor of the newer `/apis/...` structure. The post is still correct as written after the fixes, but a future refresh could update the API examples to the new API family.
