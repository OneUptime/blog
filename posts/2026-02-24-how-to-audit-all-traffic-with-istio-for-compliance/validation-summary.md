# Validation Summary: How to Audit All Traffic with Istio for Compliance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Envoy access logs
- Istio Telemetry API
- OpenTelemetry Collector
- Fluent Bit
- Prometheus alerting
- Elasticsearch queries
- Amazon S3 Object Lock
- Kubernetes

## Sources Consulted
- Istio Envoy Access Logs documentation: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio OpenTelemetry access log provider documentation: https://istio.io/latest/docs/tasks/observability/logs/otel-provider/
- Istio MeshConfig extension provider reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio Standard Metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Envoy substitution formatter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/advanced/substitution_formatter
- Fluent Bit S3 output documentation: https://docs.fluentbit.io/manual/pipeline/outputs/s3
- AWS CLI put-object-lock-configuration command reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-object-lock-configuration.html

## Issues Found
- The opening audit examples implied Istio access logs can show the actual data transferred. Istio/Envoy access logs record metadata such as byte counts, not payload contents, so this was changed to "how much data was transferred."
- The custom Envoy access log format used `%DOWNSTREAM_PEER_NAMESPACE%`, which is not a supported Envoy substitution formatter command. Removed that field from the JSON example.
- The custom access log format only logged downstream TLS details while the example described connection security. Added upstream TLS version and cipher fields using supported Envoy operators.
- The Telemetry API section referred to using different log levels, but Istio access logging Telemetry resources enable, disable, filter, or select providers; they do not define access log levels. Reworded this to describe additional Telemetry resources for sensitive workloads.
- The OpenTelemetry access log provider example used `opentelemetry`, which configures an OpenTelemetry tracing provider, not an access log provider. Changed it to `envoyOtelAls`, which is the Istio MeshConfig provider for OpenTelemetry access logs.
- The Elasticsearch query for unencrypted connections checked for a missing `tls_version` field. Envoy JSON logs render unset values as `"-"` for string operators, so the query now checks keyword fields for `"-"` in downstream or upstream TLS fields.
- The Elasticsearch query for matching `*admin-tool*` used a `match` query with wildcard syntax. Changed it to a `wildcard` query against the keyword field.

## Review Notes
The guide is technically relevant and broadly accurate after the corrections. Future improvements could include adding a namespace manifest or prerequisite note for the Fluent Bit `logging` namespace and recommending pinned Fluent Bit image versions instead of `latest` for production compliance deployments.
