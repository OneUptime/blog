# Validation Summary: How to Send Dapr Logs to Grafana Loki

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (sidecar runtime, JSON log format)
- Grafana Loki (log aggregation)
- Promtail (log collection agent)
- Grafana (dashboards, data sources, derived fields)
- LogQL (Loki query language)
- Kubernetes (pod log collection, Helm deployment)
- Grafana Tempo (referenced for trace correlation)

## Sources Consulted
- Grafana Loki HTTP API documentation (https://grafana.com/docs/loki/latest/reference/loki-http-api/)
- Grafana Loki LogQL documentation (https://grafana.com/docs/loki/latest/query/)
- Promtail pipeline stages documentation (https://grafana.com/docs/loki/latest/send-data/promtail/stages/)
- Grafana loki-stack Helm chart repository (https://github.com/grafana/helm-charts/tree/main/charts/loki-stack)
- Grafana datasource HTTP API documentation (https://grafana.com/docs/grafana/latest/developers/http_api/data_source/)
- Grafana derived fields / data links documentation (https://grafana.com/docs/grafana/latest/datasources/loki/configure-loki-data-source/)
- Dapr logging documentation (https://docs.dapr.io/operations/troubleshooting/logs-troubleshooting/)
- Kubernetes container runtime deprecation notes (https://kubernetes.io/blog/2022/02/17/dockershim-faq/)

## Issues Found

1. **`docker: {}` pipeline stage replaced with `cri: {}`** — The Promtail config used `docker: {}` to parse container logs. Since Kubernetes removed Docker as a container runtime in v1.24+ and virtually all modern clusters use containerd, the correct pipeline stage is `cri: {}`. Changed accordingly.

2. **Service name mismatch with Helm release** — The Helm install command uses release name `loki-stack`, but the Promtail client URL and Grafana curl command referenced `loki.monitoring.svc` and `grafana.monitoring.svc`. With the Helm naming convention, the actual service names would be `loki-stack.monitoring.svc` and `loki-stack-grafana.monitoring.svc`. Fixed all service name references to match the Helm release name.

3. **"Correlating Logs with Metrics" section incorrectly described traces as metrics** — The section title said "Correlating Logs with Metrics" and the text said "link log entries to Prometheus metrics," but the derived field configuration actually links to Grafana Tempo (a tracing backend) via `datasource=Tempo` in the URL. Changed the title to "Correlating Logs with Traces" and the description to reference Grafana Tempo instead of Prometheus metrics.

## Review Notes

- The `grafana/loki-stack` Helm chart is officially deprecated and no longer receives updates. The recommended approach is to install Loki, Grafana, and the log collector separately using their individual Helm charts (`grafana/loki`, `grafana/grafana`).
- Promtail reached End-of-Life on March 2, 2026. Grafana Alloy is the recommended replacement for log collection. The blog post's description mentions Alloy as an alternative but the tutorial only covers Promtail.
- The Grafana dashboard panel JSON uses a string-based `datasource` field (`"datasource": "Loki"`). In Grafana 9+, the preferred format is an object (`{"type": "loki", "uid": "<uid>"}`), though string format still works for backward compatibility.
- The derived field configuration would benefit from a `datasourceUid` field pointing to the Tempo datasource, which is the standard approach for internal links in Grafana, rather than embedding the datasource in the URL query string.
