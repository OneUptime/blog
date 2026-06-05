# Validation Summary: How to Build Service Dependency Graphs from OpenTelemetry Traces

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Service Graph Connector
- OpenTelemetry traces and span kinds
- Prometheus / PromQL
- Grafana Tempo service graph visualization
- Grafana data source provisioning

## Sources Consulted
- OpenTelemetry Collector connectors documentation: https://opentelemetry.io/docs/collector/components/connector/
- OpenTelemetry Collector Contrib Service Graph Connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/servicegraphconnector/README.md
- Grafana Service Graph and Service Graph view documentation: https://grafana.com/docs/grafana/latest/datasources/tempo/service-graph/
- Grafana Tempo service graphs documentation: https://grafana.com/docs/tempo/latest/metrics-from-traces/service_graphs/
- Grafana Tempo data source provisioning documentation: https://grafana.com/docs/grafana/latest/datasources/tempo/configure-tempo-data-source/provision/

## Issues Found
- The generated metrics section showed `traces_service_graph_request_total` with a `failed` label. The current Service Graph Connector emits failed requests as a separate `traces_service_graph_request_failed_total` counter, so the example was updated.
- The debugging metric was described as `traces_service_graph_request_failed_total` with `server="unknown"`. The connector exposes unmatched span data as `traces_service_graph_unpaired_spans_total`, so the metric example and troubleshooting text were corrected.
- The error-rate PromQL query filtered `traces_service_graph_request_total{failed="true"}`. It was changed to use `traces_service_graph_request_failed_total` divided by `traces_service_graph_request_total`.
- The initial Collector configuration comment incorrectly described `latency_histogram_buckets` as the span matching wait time. It now describes the field as request duration histogram buckets; the store TTL remains the matching wait setting.
- The comments around `cache_loop` and `store_expiration_loop` incorrectly implied they identify service resource attributes. They now describe cache cleanup and store expiration intervals.
- The Grafana UI instruction referred to a "Service Graph" tab. Current Grafana documentation describes selecting the "Service Graph" query type in Tempo Explore, so the wording was updated.
- The virtual node example said `db.name="orders"` would appear as `postgresql`. Because virtual node attributes are selected by configured priority, the example now shows `orders` for `db.name="orders"`.

## Review Notes
The Service Graph Connector is listed as an alpha OpenTelemetry Collector Contrib connector. The examples are accurate for the current documented connector behavior, but production deployments should pin and test a specific Collector Contrib version because alpha components can change.
