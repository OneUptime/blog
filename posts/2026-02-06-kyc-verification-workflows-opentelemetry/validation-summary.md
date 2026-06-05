# Validation Summary: How to Instrument KYC Verification Workflows

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry
- OpenTelemetry Python API
- Python tracing instrumentation
- Python metrics instrumentation
- KYC verification workflow observability

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry metrics concepts: https://opentelemetry.io/docs/concepts/signals/metrics/
- OpenTelemetry handling sensitive data guidance: https://opentelemetry.io/docs/security/handling-sensitive-data/

## Issues Found
- Removed direct `kyc.customer_id` span attributes from the document verification and orchestration examples. OpenTelemetry supports span attributes, but its security guidance recommends avoiding personal information unless absolutely necessary and protecting sensitive telemetry data.
- Removed `kyc.address.postal_normalized` from the address verification span. A normalized address is personal information and should not be emitted as a telemetry attribute in a general-purpose KYC observability example.
- Fixed the address verification result aggregation from `any(r.valid or r.match for r in results)` to `getattr` checks. The original code could raise `AttributeError` when iterating over mixed postal and bureau result objects that do not expose the same attributes.
- Softened the compliance reporting language. Metrics and traces can support compliance reporting and supplement an audit trail, but they are not automatically a complete regulatory audit trail unless retained, protected, and governed according to applicable compliance requirements.

## Review Notes
The OpenTelemetry Python tracing and metrics APIs used in the examples are current and match the official documentation. The examples remain illustrative and depend on application-specific services and result classes such as `ocr_service`, `fraud_detection`, `postal_service`, and `DocumentVerificationResult`.
