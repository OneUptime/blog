# Validation Summary: How to Monitor ACH and Wire Transfer Processing Latency Across Banking

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Python tracing
- OpenTelemetry Python metrics
- ACH batch processing and NACHA files
- Wire transfer middleware
- Fedwire Funds Service
- SWIFT MT103 and ISO 20022 payment messaging

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/metrics.html
- Nacha ACH File Overview: https://achdevguide.nacha.org/ach-file-overview
- Nacha Same Day ACH processing window information: https://www.nacha.org/rules/expanding-same-day-ach
- Federal Reserve Board Fedwire Funds Service overview: https://www.federalreserve.gov/paymentsystems/fedfunds_about.htm
- Federal Reserve Financial Services Fedwire Funds Service page: https://www.frbservices.org/financial-services/wires
- Federal Reserve Financial Services Fedwire ISO 20022 implementation information: https://www.frbservices.org/resources/financial-services/wires/iso-20022-implementation-center/

## Issues Found
- Removed an incorrect and unused `TraceContextTextMapPropagator` import. The post did not use manual context propagation, and the import path shown was not the current documented path for OpenTelemetry Python examples.
- Added missing `import time` statements to snippets that call `time.monotonic()`, so the examples are syntactically complete.
- Added missing `metrics` import and `meter` initialization to the ACH snippet, because it creates metric instruments.
- Recorded the previously unused `ach_batch_latency` histogram after batch submission, matching the metric's stated purpose.
- Changed queue depth reporting to use a gauge-style `record()` call with an absolute current depth instead of adding sampled depth deltas. This better matches OpenTelemetry's metric model for current, non-additive queue depth measurements.

## Review Notes
The examples remain illustrative and assume application-specific objects such as `swift_formatter`, `compliance_engine`, `send_queue`, `ach_queue`, and `queue_manager` exist. Attribute names are domain-specific rather than OpenTelemetry semantic conventions, which is acceptable because OpenTelemetry does not define standard semantic attributes for these ACH and wire processing stages.
