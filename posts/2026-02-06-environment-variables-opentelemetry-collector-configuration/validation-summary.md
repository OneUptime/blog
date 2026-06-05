# Validation Summary: How to Use Environment Variables in OpenTelemetry Collector Configuration

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector configuration providers and environment variable substitution
- OpenTelemetry Collector contrib receivers, processors, and exporters
- Docker Compose
- Kubernetes Deployments, ConfigMaps, Secrets, and Downward API
- AWS Secrets Manager
- HashiCorp Vault
- Grafana Loki OTLP ingestion

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry configuration data model, environment variable substitution: https://opentelemetry.io/docs/specs/otel/configuration/data-model/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector contrib Kafka receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/kafkareceiver/README.md
- OpenTelemetry Collector contrib Elasticsearch exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/elasticsearchexporter/README.md
- OpenTelemetry Collector contrib Datadog exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/datadogexporter/README.md
- OpenTelemetry Collector probabilistic sampler processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/probabilisticsamplerprocessor/README.md
- OpenTelemetry Collector debug exporter package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/exporter/debugexporter
- Grafana Loki OTLP ingestion documentation: https://grafana.com/docs/loki/latest/send-data/otel/
- Grafana Loki HTTP API documentation: https://grafana.com/docs/loki/latest/api/

## Issues Found
- The Elasticsearch exporter example mixed `auth.authenticator: basicauth` with shortcut `user` and `password` fields, without defining or enabling a `basicauth` extension. I removed the `auth.authenticator` lines so the example uses the documented shortcut authentication fields consistently.
- The internal telemetry example used `service.telemetry.metrics.address`, which is ignored in Collector v0.123.0 and later. I replaced it with the current `service.telemetry.metrics.readers` pull/Prometheus configuration using `host` and `port`.
- The debug exporter comment said it was enabled only in development, but the shown pipeline always included the exporter. I changed the comment to describe it as a local inspection exporter.
- The "nested environment variable expansion" wording was inaccurate. OpenTelemetry substitution supports multiple substitutions in a scalar, but substituted values are not recursively expanded. I changed the wording to "combining multiple environment variable substitutions."
- The Loki exporter example used the removed/deprecated Loki exporter and the legacy `/loki/api/v1/push` path. I changed it to an `otlphttp/loki` exporter using Loki's native OTLP endpoint path.
- The validation/debugging section claimed the Collector provides helpful errors for missing required variables. Undefined variables without defaults resolve to empty values, so I changed the text to recommend validating required variables before startup.
- The debug command piped output through `grep "environment variable"`, which is not a reliable Collector diagnostic. I changed it to run the Collector directly with debug logging.

## Review Notes
The post is technically relevant and valid after the fixes. The examples remain illustrative rather than a single complete production configuration; users still need to ensure their chosen Collector distribution includes the contrib components referenced.
