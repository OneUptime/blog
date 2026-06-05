# Validation Summary: How to Build HIPAA-Compliant OpenTelemetry Pipelines That Redact PHI from

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector attributes processor
- OpenTelemetry Collector transform processor and OTTL
- OpenTelemetry Python SDK tracing
- OTLP gRPC exporter
- gRPC TLS credentials
- HIPAA PHI redaction concepts

## Sources Consulted
- HHS HIPAA Privacy Rule summary and safe harbor identifiers: https://www.hhs.gov/hipaa/for-professionals/privacy/laws-regulations/index.html
- OpenTelemetry Collector processor component list: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector attributes processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- OpenTelemetry Collector transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry OTTL replace_pattern function documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl/ottlfuncs
- OpenTelemetry Python SDK trace documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.html
- OpenTelemetry Python OTLP exporter documentation: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html
- gRPC Python API documentation for ssl_channel_credentials: https://grpc.github.io/grpc/python/grpc.html

## Issues Found
- The attributes processor extracted `patient_id` from `http.url` but did not remove or rewrite the original URL. The official attributes processor documentation states that `extract` does not alter the source key, so the sample still leaked PHI-bearing URL paths. Added a later `delete` action for `http.url` after hashing `patient_id`.
- The transform processor example used an older context-style form and referenced `body` directly. Updated it to the current documented OTTL form using `log.body`, added `error_mode: ignore`, and guarded each regex replacement with `IsString(log.body)`.
- The custom Python `SpanProcessor` did not actually redact anything; `on_start` and `on_end` were no-ops. Updated it to redact initial attributes while spans are mutable, wrap `set_attribute` so later attributes are redacted, and implement `shutdown` and `force_flush`.
- The Python email regular expressions used `[A-Z|a-z]`, which includes a literal pipe character. Changed them to `[A-Za-z]`.
- The TLS exporter example called `ssl_channel_credentials` without importing or qualifying it. Added `import grpc` and changed the call to `grpc.ssl_channel_credentials(...)`, matching gRPC Python documentation and the OpenTelemetry OTLP gRPC exporter's `credentials` parameter.

## Review Notes
The title appears truncated because it ends with "from", but this is editorial rather than technical. The post remains a high-level guide and should still be treated as a starting point; real HIPAA compliance requires organization-specific legal, security, logging, retention, access-control, and risk-analysis controls beyond these code snippets.
