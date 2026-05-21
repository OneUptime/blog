# Validation Summary: How to Set Up Audit Logging in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio Telemetry API
- IstioOperator and MeshConfig
- Envoy access logs and access log format operators
- Kubernetes ConfigMaps and container log collection
- Fluent Bit S3 output
- Amazon S3 Object Lock and lifecycle configuration
- OpenTelemetry Collector access log export
- Elasticsearch queries
- Prometheus alerting rules
- PCI DSS, HIPAA, SOC 2, and GDPR retention considerations

## Sources Consulted
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio access log task: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio Telemetry API access log task: https://istio.io/latest/docs/tasks/observability/logs/telemetry-api/
- Istio OpenTelemetry access log provider task: https://istio.io/latest/docs/tasks/observability/logs/otel-provider/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Envoy access log and substitution formatter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/access_log/usage.html and https://www.envoyproxy.io/docs/envoy/latest/configuration/advanced/substitution_formatter
- AWS CLI put-object-lock-configuration reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-object-lock-configuration.html
- AWS CLI put-bucket-lifecycle-configuration reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-lifecycle-configuration.html
- HHS HIPAA audit protocol: https://www.hhs.gov/hipaa/for-professionals/compliance-enforcement/audit/protocol/index.html
- PCI Security Standards Council PCI DSS materials: https://www.pcisecuritystandards.org/

## Issues Found
- The Telemetry examples used `apiVersion: telemetry.istio.io/v1alpha1`. Updated them to `telemetry.istio.io/v1`, which is the current stable Istio Telemetry API version.
- The custom access log format used `%DOWNSTREAM_PEER_NAMESPACE%`, which is not an Envoy substitution formatter operator. Removed that field and adjusted the accompanying description.
- The custom access log format labeled `%DOWNSTREAM_PEER_ISSUER%` as `connection_mtls` and described it as whether mTLS was used. Renamed it to `downstream_peer_issuer` and updated the description because the operator logs the peer certificate issuer, not a boolean mTLS status.
- The Fluent Bit S3 key format started with `/istio-audit/...`, while the lifecycle rule matched the prefix `istio-audit/`. Removed the leading slash so the lifecycle rule matches uploaded objects.
- The OpenTelemetry access log provider used `opentelemetry:` under `extensionProviders`. Updated it to `envoyOtelAls:`, which is the Istio MeshConfig field for Envoy access logs sent to an OpenTelemetry collector.
- The Prometheus alert used a `request_method` label on `istio_requests_total`, but that is not a default Istio standard metric label. Replaced it with the default `reporter="destination"` label while keeping the namespace-scoped bulk-access intent.

## Review Notes
The guide is technically relevant and mostly accurate after the corrections. The compliance retention bullets are high-level guidance; exact retention requirements still depend on the organization's scope, jurisdiction, and auditor interpretation.
