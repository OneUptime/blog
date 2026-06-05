# Validation Summary: How to Trace Cross-Border Payment (SWIFT/SEPA) Message Flows with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Python tracing API
- OpenTelemetry Python metrics API
- OTLP gRPC exporters
- Swift MT103 and Swift gpi payment tracking
- SEPA Credit Transfer and SEPA Instant Credit Transfer

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python SDK trace export documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.export.html
- OpenTelemetry Python OTLP exporter documentation: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html
- OpenTelemetry trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- Swift UETR documentation: https://www.swift.com/payments/what-unique-end-end-transaction-reference-uetr
- Swift gpi product documentation: https://www.swift.com/products/swift-gpi
- European Payments Council SEPA Instant Credit Transfer rulebook page: https://www.europeanpaymentscouncil.eu/what-we-do/epc-payment-schemes/sepa-instant-credit-transfer/sepa-instant-credit-transfer-rulebook
- European Payments Council SEPA Credit Transfer rulebook, maximum execution time: https://www.europeanpaymentscouncil.eu/sites/default/files/kb/file/2025-09/EPC125-05%202025%20SCT%20Rulebook%20version%201.1.pdf
- European Central Bank instant payments explainer: https://www.ecb.europa.eu/paym/integration/retail/instant_payments/html/index.en.html
- ISO 20022 external code sets page: https://www.iso20022.org/catalogue-messages/additional-content-messages/external-code-sets

## Issues Found
- The tracing setup imported and used `BatchSpanExporter`, which is not the OpenTelemetry Python SDK batching API. Changed it to `BatchSpanProcessor`, matching the official SDK documentation.
- The validation error example used a less idiomatic status call. Updated it to import `Status` and `StatusCode` and call `span.set_status(Status(StatusCode.ERROR, "Validation failed"))`, matching the official Python instrumentation example.
- The introduction described Swift and SEPA as clearing systems. Updated the wording because Swift is a financial messaging network, while SEPA payments use schemes and clearing and settlement mechanisms.
- The status update section said updates should be linked to the payment trace, but the code only recorded metrics. Added retrieval of the stored span context and creation of a linked `payment.gpi.status_update` span.
- The SEPA section described the SLA as "same-day or instant". Updated it to "one banking business day for SCT, or instant" based on the EPC SCT rulebook.
- The SEPA Instant code used `time.monotonic()` without importing `time`. Added the missing import.

## Review Notes
The examples remain illustrative and depend on application-specific helper functions such as `generate_uetr`, `persist_trace_context`, `retrieve_trace_context`, and payment network integration functions. The OpenTelemetry API usage and the payment-system timing claims have been checked against current official documentation.
