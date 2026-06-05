# Validation Summary: How to Build a Living Architecture Diagram from OpenTelemetry Service Graph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Service Graph Connector
- Prometheus and PromQL
- Grafana Tempo and Node Graph visualization
- Python
- Kubernetes CronJob

## Sources Consulted
- OpenTelemetry Collector Contrib Service Graph Connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/servicegraphconnector/README.md
- OpenTelemetry Collector Contrib Service Graph Connector configuration source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/servicegraphconnector/config.go
- Grafana Node Graph documentation: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/visualizations/node-graph/
- Grafana Tempo service graph metrics query documentation: https://grafana.com/docs/tempo/latest/metrics-from-traces/service_graphs/metrics-queries/
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Kubernetes CronJob API documentation: https://kubernetes.io/docs/reference/kubernetes-api/batch/cron-job-v1/

## Issues Found
- The post used the deprecated `servicegraph` connector type. Updated the Collector configuration and explanatory text to use `service_graph`, which is the current component name in the OpenTelemetry Collector Contrib documentation.
- The post listed and queried a non-current latency metric, `traces_service_graph_request_duration_seconds`. Replaced it with the documented service graph latency histograms, `traces_service_graph_request_server_seconds` and `traces_service_graph_request_client_seconds`, and updated the PromQL latency query to use `traces_service_graph_request_server_seconds_bucket`.
- The Grafana Node Graph example used a plain Prometheus panel query, but the Node Graph visualization requires node/edge-shaped data and the documented service graph path is to configure a Tempo data source with a Prometheus service map backend. Replaced the panel JSON with Grafana datasource provisioning that links Tempo service maps to Prometheus.
- The Python script ignored the `PROMETHEUS_URL` and `OUTPUT_PATH` environment variables supplied by the Kubernetes CronJob example. Updated the script to read those environment variables and write the generated graph to `OUTPUT_PATH` when provided.

## Review Notes
The Service Graph Connector is currently documented as alpha in OpenTelemetry Collector Contrib. The post is technically valid after the corrections, but future reviews should re-check connector stability, metric names, and Grafana service graph configuration because this area has changed across Collector and Grafana releases.
