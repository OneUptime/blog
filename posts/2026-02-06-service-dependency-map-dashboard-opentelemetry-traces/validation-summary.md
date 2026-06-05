# Validation Summary: How to Create a Real-Time Service Dependency Map Dashboard from OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry traces and semantic conventions
- OpenTelemetry Collector `servicegraph` connector
- Grafana Node Graph panel
- Grafana Tempo metrics-generator and service graphs
- Prometheus and PromQL
- Python OpenTelemetry tracing API

## Sources Consulted
- OpenTelemetry Collector contrib `servicegraphconnector` documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/connector/servicegraphconnector
- OpenTelemetry Collector connectors documentation: https://opentelemetry.io/docs/collector/components/connector/
- Grafana Node Graph panel documentation: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/visualizations/node-graph/
- Grafana Tempo service graphs documentation: https://grafana.com/docs/tempo/latest/metrics-from-traces/service_graphs/
- Grafana Tempo configuration reference: https://grafana.com/docs/tempo/latest/configuration/
- Grafana Tempo data source provisioning documentation: https://grafana.com/docs/grafana/latest/datasources/tempo/configure-tempo-data-source/provision/
- Grafana Service Graph and Service Graph view documentation: https://grafana.com/docs/grafana/latest/datasources/tempo/service-graph/
- Prometheus PromQL function documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- OpenTelemetry Trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry database semantic conventions: https://opentelemetry.io/docs/specs/semconv/database/database-spans/

## Issues Found
- The service graph metric label description omitted `connection_type`. Updated the text to mention that service graph metrics include `client`, `server`, and `connection_type` labels.
- The Node Graph Prometheus queries did not return the required Node Graph field names. Updated the node query to create an `id` label and the edge query to create `id`, `source`, and `target` labels using PromQL `label_replace` and `label_join`.
- The panel JSON used an incorrect `configFromData` transformation for field mapping. Replaced the target expressions with queries that return the Node Graph-required fields directly.
- The Tempo section incorrectly implied that Tempo service graphs do not need Prometheus metrics. Updated it to clarify that Tempo generates service graph metrics and remote-writes them to a Prometheus-compatible backend, which Grafana then reads through the linked Prometheus data source.
- The Tempo metrics-generator example configured processors but did not enable them for the tenant. Added `overrides.defaults.metrics_generator.processors: [service-graphs, span-metrics]`.
- The Tempo service graph `peer_attributes` example prioritized `service.name`, which is not the right attribute for naming uninstrumented downstream dependencies. Updated it to use peer and database attributes such as `peer.service`, `server.address`, `db.namespace`, and database system attributes.
- The external dependency example used older database semantic convention attributes. Updated the Python span attributes to use `peer.service`, `db.system.name`, and `db.namespace`.

## Review Notes
The OpenTelemetry Collector `servicegraph` connector and Tempo service graphs both require complete trace/span pairing for best results. In scaled collector or Tempo deployments, spans from the same trace should be routed consistently so client/server pairs can be matched.
