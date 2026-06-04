# Validation Summary: How to Run Grafana Tempo in Docker for Trace Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- Grafana Tempo
- Grafana data source provisioning
- OpenTelemetry Python SDK
- OpenTelemetry JavaScript SDK
- Zipkin trace ingestion API
- TraceQL
- Prometheus
- Loki

## Sources Consulted
- Grafana Tempo quick start for Docker Compose: https://grafana.com/docs/tempo/latest/docker-example/
- Grafana Tempo configuration reference: https://grafana.com/docs/tempo/latest/configuration/
- Grafana Tempo HTTP API documentation: https://grafana.com/docs/tempo/latest/api_docs/
- Grafana Tempo TraceQL documentation: https://grafana.com/docs/tempo/latest/traceql/
- Grafana TraceQL query builder documentation: https://grafana.com/docs/grafana/latest/datasources/tempo/query-editor/traceql-search/
- Grafana Tempo data source provisioning documentation: https://grafana.com/docs/grafana/latest/datasources/tempo/configure-tempo-data-source/provision/
- OpenTelemetry JavaScript SDK TypeDoc for NodeTracerProvider and TracerConfig: https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_sdk-node.node.NodeTracerProvider.html
- OpenTelemetry JavaScript resources API: https://open-telemetry.github.io/opentelemetry-js/functions/_opentelemetry_resources.resourceFromAttributes.html
- OpenTelemetry JavaScript semantic conventions migration guidance: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_semantic-conventions.html
- Local Docker verification with `grafana/tempo:2.10.1 -config.verify=true`

## Issues Found
- The post used `grafana/tempo:latest`, while the local `latest` image resolves to Tempo v3.0.0 and rejects the Tempo 2.x-style `ingester` and `compactor` configuration. Pinned examples to `grafana/tempo:2.10.1`, matching the verified configuration and current Grafana Tempo 2.10 documentation.
- The standalone `docker run` command referenced `/etc/tempo/tempo.yaml` without mounting a configuration file. Updated it to mount `./tempo.yaml` at `/etc/tempo.yaml` and use the same config path as the Compose example.
- The Docker Compose introduction claimed the stack included an OpenTelemetry Collector, but no collector service was present. Updated the wording to Tempo and Grafana.
- The Compose example configured Jaeger receivers but did not publish the Jaeger ports. Added `14268` and `14250` port mappings.
- The Tempo configuration included an invalid `overrides.defaults` block for Tempo 2.10.1 and a `querier.search` block that was unnecessary for TraceQL search. Removed those blocks and verified the remaining YAML with Tempo's config verifier.
- The Grafana Tempo data source `traceQuery` time shifts were reversed. Corrected them to `spanStartTimeShift: '-1h'` and `spanEndTimeShift: '1h'`, matching Grafana's provisioning example.
- The Node.js OpenTelemetry snippet used deprecated/removed APIs: `new Resource(...)`, `SemanticResourceAttributes`, and `provider.addSpanProcessor(...)`. Updated it to use `resourceFromAttributes`, `ATTR_SERVICE_NAME`, and the `spanProcessors` provider config.
- The TraceQL slow trace example used `{duration>1s}`, which filters span duration rather than trace duration. Updated it to `{trace:duration>1s}`.
- The HTTP status TraceQL example used the older `http.status_code` attribute. Updated it to `http.response.status_code`, matching current OpenTelemetry HTTP semantic conventions used in Grafana's TraceQL examples.

## Review Notes
The Grafana data source example references Loki and Prometheus data source UIDs for correlations. Those links are valid provisioning fields, but the first Compose example does not provision Loki or Prometheus data sources, so trace-to-logs and service graph links require the later full-stack setup or additional datasource provisioning.
