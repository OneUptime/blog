# Validation Summary: How to Send Dapr Traces to AWS X-Ray

## Status
validated

## Post Type
Tutorial / Integration Guide

## Technologies Covered
- Dapr (Configuration CRD, OpenTelemetry tracing)
- AWS X-Ray (tracing, sampling rules, service maps)
- OpenTelemetry Collector (contrib distribution, awsxray exporter)
- OpenTelemetry Python SDK (TracerProvider, span attributes)
- AWS EKS (IRSA, service accounts)
- Kubernetes (Deployments, Services, ConfigMaps)
- Python / Flask
- AWS CLI (xray commands)

## Sources Consulted
- Dapr Configuration specification: https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr OpenTelemetry Collector tracing setup: https://docs.dapr.io/operations/observability/tracing/otel-collector/
- OpenTelemetry Collector contrib awsxray exporter source: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/awsxrayexporter
- OpenTelemetry Collector logging/debug exporter deprecation notes
- OpenTelemetry Python SDK documentation: https://opentelemetry-python.readthedocs.io/en/latest/
- AWS X-Ray API reference (PutTraceSegments)
- AWS IAM managed policy ARN format reference
- AWS CLI xray command reference

## Issues Found

1. **Architecture diagram: incorrect protocol and port** — The diagram stated "AWS X-Ray OTLP (port 2000)" for the connection between the OTel Collector and AWS X-Ray. The `awsxray` exporter makes direct HTTPS API calls to the X-Ray service (via `PutTraceSegments`), not UDP on port 2000 (which is the X-Ray daemon protocol). Changed to "X-Ray API (HTTPS)".

2. **Dapr config `endpointAddress` had `http://` prefix** — For gRPC protocol, Dapr's `endpointAddress` field should be just `host:port` without a scheme prefix. The `http://` prefix is only used for HTTP-based endpoints like Zipkin. Changed `"http://otel-collector:4317"` to `"otel-collector:4317"`.

3. **Dapr config used `metric` (singular) instead of `metrics` (plural)** — The correct field name in the Dapr Configuration CRD is `spec.metrics.enabled`, not `spec.metric.enabled`. Using the singular form causes the field to be silently ignored. Changed `metric` to `metrics`.

4. **Python code missing `Resource` import** — The code used `Resource.create({...})` but never imported `Resource`. This would cause a `NameError` at runtime. Added `from opentelemetry.sdk.resources import Resource`.

5. **Python code had unused `extract` import** — `from opentelemetry.propagate import extract` was imported but never used; the code calls `TraceContextTextMapPropagator().extract()` directly instead. Removed the unused import.

6. **OTel Collector `logging` exporter with `loglevel` deprecated** — For collector v0.92.0 (the version specified in the deployment), the `logging` exporter was deprecated in favor of the `debug` exporter, and the `loglevel` field was deprecated in favor of `verbosity`. Changed to `debug` exporter with `verbosity: basic`.

## Review Notes
- The `awscloudwatchlogs` exporter is defined in the collector config but not referenced in any pipeline. The collector will start successfully but the exporter will be unused. The comment marks it as "Optional" which is acceptable, but readers should know they need to add it to a pipeline to actually use it.
- The `date -d '10 minutes ago'` syntax in the verification commands is GNU date (Linux-only). On macOS, the equivalent would be `date -v-10M`. Since the target environment is EKS (Linux), this is acceptable.
- The `aws.region` resource processor attribute is labeled as "Required for X-Ray" but is not strictly required by the awsxray exporter (which uses its own `region` config field). It is useful metadata but the comment overstates its necessity.
- X-Ray span attribute-to-annotation mapping requires configuring `indexed_attributes` on the awsxray exporter or setting `index_all_attributes: true` for custom attributes to appear as searchable annotations. The post does not mention this configuration, so custom span attributes set in the Python code may appear as metadata rather than searchable annotations by default.
