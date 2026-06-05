# Validation Summary: How to Monitor Open Banking API Gateway Performance with OpenTelemetry

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Python tracing API
- OpenTelemetry Python metrics API
- Open Banking / PSD2 dedicated interfaces
- API gateway observability
- Account Information Services (AIS)
- Payment Initiation Services (PIS)
- Strong Customer Authentication (SCA)
- eIDAS / TPP certificate validation concepts

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry metrics concepts and language support: https://opentelemetry.io/docs/concepts/signals/metrics/
- OpenTelemetry trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- Commission Delegated Regulation (EU) 2018/389 / PSD2 RTS, Article 32 availability and performance parity: https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32018R0389
- Open Banking Standard Operational Guidelines, Key Indicators for Availability & Performance: https://standards.openbanking.org.uk/operational-guidelines/availability-and-performance/key-indicators-for-availability-and-performance/v3-1-2/
- Open Banking Standard Operational Guidelines, Availability benchmark and downtime calculation: https://standards.openbanking.org.uk/operational-guidelines/availability-and-performance/key-indicators-for-availability-and-performance-availability/latest/
- Open Banking Standard Operational Guidelines, Performance benchmark for AIS/PIS response times: https://standards.openbanking.org.uk/operational-guidelines/availability-and-performance/key-indicators-for-availability-and-performance-performance/latest/
- Open Banking Standard Account Information Services guidance: https://standards.openbanking.org.uk/customer-experience-guidelines/account-information-services/latest/

## Issues Found
- The post stated that EBA technical standards specify concrete uptime and response time targets and that Open Banking APIs need to respond in under 500ms with 99.5% availability. PSD2 RTS Article 32 requires parity with customer-facing interfaces; the 99.5% quarterly uptime and 750ms average TTLB figures are Open Banking Limited recommended benchmarks in the UK Open Banking Standard. Updated the wording to distinguish regulatory parity/KPI requirements from OBL recommended benchmarks.
- The metric named `openbanking.request.count` was described as total API requests, but the snippets increment it only after successful AIS/PIS handling. Renamed the metric to `openbanking.request.successes` and changed the description to "Successful API requests" so the code and explanation match.
- The AIS example used a `within_sla` attribute with a 500ms threshold. Updated it to `within_benchmark` with a 750ms threshold to align with the OBL recommended benchmark cited in the revised regulatory section.
- The dashboard section suggested calculating uptime from request counts and errors. Availability reporting in the Open Banking guidelines is based on downtime/availability calculations, not simply request error rate. Updated the dashboard guidance to calculate uptime from synthetic availability checks and downtime windows, while leaving request successes/errors for error-rate reporting.
- Removed unused imports (`Resource` and `wraps`) from the first code snippet to keep the example clean and directly runnable in context.

## Review Notes
The OpenTelemetry Python APIs used in the examples (`trace.get_tracer`, `metrics.get_meter`, `create_histogram`, `create_counter`, `start_as_current_span`, `set_attribute`, `set_status`, `Counter.add`, and `Histogram.record`) match current official documentation. The snippets are illustrative and assume application-specific objects such as `certificate_validator`, `consent_store`, and `payment_service` exist. Per-TPP metric attributes are useful for operational analysis but may create high-cardinality metric series in some backends; production implementations should evaluate cardinality limits and privacy policies before using TPP identifiers as metric attributes.
