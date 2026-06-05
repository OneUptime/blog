# Validation Summary: How to Trace Medical Device Data Ingestion Pipelines with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Python tracing
- OpenTelemetry context propagation
- OpenTelemetry semantic conventions
- OTLP/gRPC exporter configuration
- Apache Kafka with confluent-kafka Python client
- MQTT device ingestion
- HL7 FHIR Observation data
- HTTP client telemetry

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python propagation documentation: https://opentelemetry.io/docs/languages/python/propagation/
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry messaging semantic convention registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/messaging/
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/
- OpenTelemetry HTTP attribute registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/http/
- Confluent Kafka Python API documentation: https://docs.confluent.io/platform/current/clients/confluent-kafka-python/html/index.html
- W3C Trace Context recommendation: https://www.w3.org/TR/trace-context/
- HL7 FHIR Observation documentation: https://fhir.hl7.org/fhir/observation-definitions.html
- HL7 ObservationCategory terminology: https://terminology.hl7.org/5.2.0/CodeSystem-v3-ObservationCategory.html

## Issues Found
- The OTLP/gRPC exporter used `endpoint="localhost:4317"`, which relies on an endpoint without a scheme and can default to secure transport. Changed it to `endpoint="http://localhost:4317"` to match a typical local insecure collector endpoint per the OTLP exporter configuration rules.
- The first Python snippet used `trace.Status` and `trace.StatusCode`. Updated the imports to use `Status` and `StatusCode` from `opentelemetry.trace`, matching OpenTelemetry Python documentation.
- The code imported unused OpenTelemetry context helpers and passed an unused `current_span` argument into `publish_to_queue`. Removed the unused imports and argument because trace propagation uses the active context through `inject(headers)`.
- Kafka span attributes used deprecated messaging semantic convention names: `messaging.destination` and `messaging.operation`. Updated them to `messaging.destination.name` and `messaging.operation.type`, with operation values aligned to current messaging semantic conventions.
- The Kafka consumer did not check `msg.error()` before reading headers and values. Added a minimal error check before extracting trace context from the message.
- The clinical routing snippet used deprecated HTTP semantic convention attributes: `http.method`, `http.url`, and `http.status_code`. Updated them to `http.request.method`, `url.full`, and `http.response.status_code`.
- The clinical routing snippet used `requests.post` without importing `requests`. Added the missing import.
- The FHIR routing logic treated `Observation.category` as a single string, but FHIR represents it as a list of `CodeableConcept` values with nested `coding` entries. Updated the example to extract category codes and route on `vital-signs` or `laboratory`.

## Review Notes
The snippets are still illustrative and depend on application-specific functions such as `normalize_to_fhir_observation`. For production systems, HTTP and Kafka client auto-instrumentation may reduce manual span code, and healthcare deployments should avoid putting sensitive patient identifiers or PHI in span attributes.
