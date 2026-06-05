# Validation Summary: How to Generate Service Graph Metrics from Traces in the Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Service Graph connector
- OpenTelemetry Collector Span Metrics connector
- OpenTelemetry Collector processors: batch, filter, transform, resource, resourcedetection, memory_limiter
- Prometheus Remote Write exporter
- PromQL
- Grafana service graph visualization

## Sources Consulted
- OpenTelemetry Collector connector component list: https://opentelemetry.io/docs/collector/components/connector/
- OpenTelemetry Collector Service Graph connector package and README: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/connector/servicegraphconnector
- OpenTelemetry Collector Service Graph connector generated telemetry source: https://raw.githubusercontent.com/open-telemetry/opentelemetry-collector-contrib/main/connector/servicegraphconnector/internal/metadata/generated_telemetry.go
- OpenTelemetry Collector filter processor documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/processor/filterprocessor
- OpenTelemetry Collector attributes processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- OpenTelemetry Collector Prometheus Remote Write exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusremotewriteexporter/README.md
- OpenTelemetry Collector Resource Detection processor documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/processor/resourcedetectionprocessor
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/

## Issues Found
- The post used the deprecated `servicegraph` component type. Updated examples to use the current `service_graph` component type.
- The Span Metrics example used the deprecated `spanmetrics` component type. Updated it to the current `span_metrics` component type.
- The generated metrics section listed unsupported duration and payload-size metric names. Replaced them with the current Service Graph connector metrics: request total, failed request total, client/server duration histograms, unpaired spans, and dropped spans.
- Several examples used unsupported configuration keys such as `cleanup_interval`, `span_attributes`, and per-metric `metrics` toggles. Replaced these with supported Service Graph connector settings such as `store_expiration_loop`, `dimensions`, and `virtual_node_peer_attributes`.
- The filtering examples used conditions that would drop the traffic they claimed to keep, because the filter processor drops telemetry matching its OTTL conditions. Inverted the predicates and added `error_mode: ignore`.
- The post described dimensions as service/resource dimensions. Updated examples and prose to reflect that Service Graph connector `dimensions` are additional span-attribute labels.
- The virtual external service example used the attributes processor to update `service.name`, which is a resource attribute and would not work as written. Replaced it with the connector's `virtual_node_peer_attributes` configuration.
- The multi-cluster example suggested adding `k8s.cluster.name` as a Service Graph dimension. Updated the example to avoid treating resource attributes as connector dimensions and clarified that resource labels need exporter/resource-to-telemetry handling.
- The resourcedetection example used `kubernetes` as a detector name. Updated it to `k8snode`, which is the current detector name in Collector documentation.
- The Prometheus Remote Write example set the reserved `X-Prometheus-Remote-Write-Version` header. Removed it because the exporter documentation says that header cannot be changed.
- Internal telemetry examples used `service.telemetry.metrics.address`, which current Collector documentation says is ignored as of v0.123.0. Removed that field.
- Internal telemetry metric names included an underscore in `service_graph` and listed a non-existent `traces_processed` metric. Replaced them with the current connector telemetry metrics.
- The PromQL latency query used the old duration metric name. Updated it to query `traces_service_graph_request_server_bucket`.

## Review Notes
The Service Graph connector is still marked alpha in the upstream Collector contrib documentation, so configuration and metric names should be rechecked when updating Collector versions.
