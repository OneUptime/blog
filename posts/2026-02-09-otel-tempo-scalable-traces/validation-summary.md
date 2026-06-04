# Validation Summary: How to implement OpenTelemetry with Tempo for scalable trace storage

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Grafana Tempo
- OpenTelemetry Collector
- OTLP over gRPC and HTTP
- Docker
- Kubernetes StatefulSets and Services
- Amazon S3-compatible object storage
- Grafana Tempo data source provisioning
- Loki and Prometheus integrations
- TraceQL

## Sources Consulted
- Grafana Tempo configuration documentation: https://grafana.com/docs/tempo/latest/configuration/
- Grafana Tempo Linux deployment documentation: https://grafana.com/docs/tempo/latest/set-up-for-tracing/setup-tempo/deploy/locally/linux/
- Grafana Tempo compression and encoding documentation: https://grafana.com/docs/tempo/latest/configuration/compression/
- Grafana Tempo object storage architecture documentation: https://grafana.com/docs/tempo/latest/reference-tempo-architecture/object-storage/
- Grafana Tempo data source provisioning documentation: https://grafana.com/docs/grafana/latest/datasources/tempo/configure-tempo-data-source/provision/
- Grafana Service Graph documentation: https://grafana.com/docs/grafana/latest/datasources/tempo/service-graph/
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Collector documentation: https://opentelemetry.io/docs/collector/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Docker CLI run reference: https://docs.docker.com/reference/cli/docker/container/run/

## Issues Found
- The Tempo monolithic configuration included `querier.frontend_worker.frontend_address: tempo:9095`. Current Tempo deployment guidance omits this for monolithic mode because Tempo auto-configures internal component communication. I removed the setting so the local Docker example can run as a single Tempo process.
- The Docker command used `${...}` environment placeholders later in the post but did not include Tempo's `-config.expand-env=true` flag. I added the flag so environment variable references in Tempo configuration are expanded at startup.
- The Kubernetes StatefulSet referenced `serviceName: tempo` and the Collector example exports to `tempo:4317`, but the manifest did not define a Kubernetes Service. I added a minimal Service exposing Tempo's HTTP and OTLP gRPC ports.
- The S3 block compression options used older/incorrect field names, `index_downsample_bytes` and `encoding`. Current Tempo documentation uses `v2_index_downsample_bytes` and `v2_encoding`, so I updated those fields.
- The Grafana provisioning example used the older `tracesToLogs` block with `mappedTags` and `mapTagNamesEnabled`. Current Grafana Tempo provisioning documents `tracesToLogsV2` and object-form tag mappings, so I updated the block accordingly.

## Review Notes
- The Kubernetes manifest still assumes a `tempo-config` ConfigMap exists with a `tempo.yaml` key matching the mounted path. That is a reasonable abbreviated tutorial assumption, but a future improvement could show the ConfigMap creation step explicitly.
- The examples use `grafana/tempo:latest`. This is valid Docker syntax, but pinning a Tempo version would make production deployments more reproducible.
- The service graph best practice is correct, but it requires Tempo metrics-generator or Grafana Alloy plus a Prometheus-compatible remote write target before Grafana can display service graph data.
