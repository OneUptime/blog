# Validation Summary: Service Graph post

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry service graph connector
- OpenTelemetry traces and metrics
- Prometheus remote write
- Grafana Tempo service graph visualization

## Sources Consulted
- OpenTelemetry Collector service graph connector documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/connector/servicegraphconnector
- OpenTelemetry Collector connector documentation: https://opentelemetry.io/docs/collector/components/connector/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- Grafana node graph documentation: https://grafana.com/docs/grafana/latest/panels-visualizations/visualizations/node-graph/
- Prometheus command-line flags documentation: https://prometheus.io/docs/prometheus/latest/command-line/prometheus/
- Prometheus remote write receiver API documentation: https://prometheus.io/docs/prometheus/3.0/querying/api/#remote-write-receiver

## Issues Found
- The post used the deprecated connector component name `servicegraph`. Updated configuration snippets to use `service_graph`, which is the current component type documented by OpenTelemetry Collector Contrib.
- The `dimensions` examples incorrectly listed built-in labels such as `client`, `server`, and `connection_type`. Updated them to use additional span/resource attributes, because those built-in labels are already provided by the connector.
- The metrics example included incorrect histogram names such as `traces_service_graph_request_duration_seconds`, `traces_service_graph_request_server_seconds`, and `traces_service_graph_request_client_seconds`. Updated the metric examples to the documented connector metrics: `traces_service_graph_request_server` and `traces_service_graph_request_client`, with the built-in labels.
- The example used `connection_type="virtual_node"`, but documented `connection_type` values are `unset`, `messaging_system`, and `database`. Updated the example to use `unset`.
- The latency bucket comment incorrectly described the buckets as the time to wait for spans to arrive. Updated the comment to clarify that they are request latency histogram buckets.
- The Grafana node graph dashboard example did not provide the required node graph edge data shape. Replaced it with the supported Grafana Tempo data source `serviceMap` configuration that links Tempo service graphs to the Prometheus metrics backend.
- Added a note that Prometheus must have its remote write receiver enabled when using the `/api/v1/write` endpoint directly.

## Review Notes
The service graph connector is still documented as alpha in OpenTelemetry Collector Contrib, so future versions may change behavior or configuration. Service graph pairing also works best when all spans for a trace reach the same collector instance; a load-balancing exporter is recommended for multi-instance collector deployments.
