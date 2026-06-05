# Validation Summary: How to Track and Report on Data Access Patterns in Telemetry Backends

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry Go Logs API and OTLP log exporter
- OpenTelemetry Collector
- OpenTelemetry Collector Elasticsearch exporter
- OpenTelemetry Collector AWS S3 exporter
- Kubernetes Deployments and Services
- Elasticsearch Python client and Query DSL
- Prometheus, Loki, Tempo, and Grafana access patterns

## Sources Consulted
- OpenTelemetry Logs API specification: https://opentelemetry.io/docs/specs/otel/logs/api/
- OpenTelemetry Go package documentation for `go.opentelemetry.io/otel/log`: https://go.opentelemetry.io/otel/log
- OpenTelemetry Go OTLP log gRPC exporter documentation: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlplog/otlploggrpc
- OpenTelemetry Collector exporter component list: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector Contrib Elasticsearch exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/elasticsearchexporter/README.md
- OpenTelemetry Collector Contrib Elasticsearch exporter config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/elasticsearchexporter/config.go
- OpenTelemetry Collector Contrib AWS S3 exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/awss3exporter/README.md
- OpenTelemetry Collector Contrib AWS S3 exporter config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/awss3exporter/config.go
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Elasticsearch Python client search examples: https://www.elastic.co/docs/reference/elasticsearch/clients/python/examples

## Issues Found
- The Go proxy snippet imported `go.opentelemetry.io/otel` but did not use it, which would fail Go compilation. I removed that import and aliased `go.opentelemetry.io/otel/log` as `otellog` to avoid confusion with the standard library logger.
- The Go snippet was presented as a runnable reverse proxy but did not include a `main` function, did not read the `BACKEND_URL` used in the Kubernetes manifest, and ignored OTLP exporter initialization errors. I added a minimal `main`, proper URL parsing, exporter error handling, and provider shutdown.
- The Kubernetes example set `OTEL_EXPORTER_OTLP_ENDPOINT` to `otel-collector.monitoring.svc:4317`, but the Go OTLP gRPC exporter documentation requires the environment variable endpoint to include a URL scheme. I changed it to `http://otel-collector.monitoring.svc:4317`.
- The AWS S3 exporter config used `s3_partition: "hour"`, which is not a current `awss3exporter` field. I changed it to `s3_partition_format: "year=%Y/month=%m/day=%d/hour=%H"` to match the official exporter schema and preserve hourly partitioning.
- The Elasticsearch report query filtered on `attributes.audit.type`, but the Collector `resource` processor adds `audit.type` as a resource attribute. I changed the filter to `resource.attributes.audit.type`.

## Review Notes
- Python syntax was checked locally with `ast.parse`.
- This workspace does not have `go`, `otelcol`, or `otelcol-contrib` installed, so I could not run `go build` or Collector config validation locally.
- The AWS S3 exporter is currently documented as alpha for logs, metrics, and traces, and the Elasticsearch exporter is beta for logs/traces in the OpenTelemetry Collector contrib distribution.
