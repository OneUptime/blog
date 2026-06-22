# Validation Summary: How to Correlate Logs and Metrics with Loki

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana Loki
- Grafana Promtail
- Grafana Alloy
- Grafana dashboards, Explore, annotations, and data links
- Prometheus
- LogQL
- PromQL
- Docker Compose
- Python Flask
- prometheus_client for Python
- Node.js Express
- prom-client for Node.js
- Pino structured logging

## Sources Consulted
- Grafana Loki configuration examples: https://grafana.com/docs/loki/latest/configure/examples/configuration-examples/
- Grafana Loki storage configuration and TSDB schema docs: https://grafana.com/docs/loki/latest/configure/storage/
- Grafana Loki 2.8 release notes: https://grafana.com/docs/loki/latest/release-notes/v2-8/
- Grafana Loki upgrade notes for TSDB/v13 and service labels: https://grafana.com/docs/loki/latest/setup/upgrade/
- Grafana Loki LogQL metric queries: https://grafana.com/docs/loki/latest/query/metric_queries/
- Grafana Loki LogQL query examples: https://grafana.com/docs/loki/latest/query/query_examples/
- Grafana Promtail documentation and EOL notice: https://grafana.com/docs/loki/latest/send-data/promtail/
- Grafana Promtail JSON pipeline stage: https://grafana.com/docs/loki/latest/send-data/promtail/stages/json/
- Grafana Promtail labels pipeline stage: https://grafana.com/docs/loki/latest/send-data/promtail/stages/labels/
- Grafana provisioning documentation: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus histogram best practices: https://prometheus.io/docs/practices/histograms/
- Express error handling documentation: https://expressjs.com/en/guide/error-handling/
- Express middleware documentation: https://expressjs.com/en/guide/using-middleware/
- prom-client documentation: https://github.com/siimon/prom-client

## Issues Found
- The prerequisites allowed Loki 2.4 or later, but the sample Loki configuration uses the TSDB index with schema `v13`, which requires a newer Loki version. Updated the prerequisite to Loki 2.8 or later for the shown TSDB `v13` configuration.
- The post used Promtail without noting its current lifecycle state. Added a note that Promtail reached end-of-life on March 2, 2026, and that new deployments should use Grafana Alloy with equivalent discovery, parsing, and labeling rules.
- The Kubernetes Promtail pipeline parsed JSON after the `cri` stage without specifying `source: content`, and it did not promote `service` and `instance` to Loki labels while later LogQL examples selected streams using `{service="..."}`. Updated the JSON stage to parse the CRI `content`, added `service` and `instance` extraction and label promotion, and set the final output line to `content`.
- The Docker Promtail pipeline used `source: attrs` but still attempted to extract `["attrs"]["container_name"]` and `["attrs"]["service"]`. Changed those JMESPath expressions to `container_name` and `service`, which are evaluated relative to the selected `attrs` source.
- The Express error-handling middleware was placed before the route definitions, so it would not catch errors from routes defined later in the middleware stack. Moved the error handler after the routes.
- The dashboard annotation example was fenced as YAML while the content was JSON. Changed the fence to `json` and removed the invalid JSON comment.
- The troubleshooting LogQL example used a range selector on a bare log query: `{service="api-server"} | json [$__range]`. Replaced it with a valid metric query using `count_over_time(...[$__range])`.

## Review Notes
- The Docker Compose example still uses Promtail because the post is written around Promtail configuration. This is technically valid for existing installations, but Grafana's current guidance is to migrate to Grafana Alloy for supported future deployments.
- The examples assume that application logs include low-cardinality `service` and `instance` fields and that those values match the metric labels. High-cardinality fields such as request IDs should remain structured log fields rather than Loki labels.
