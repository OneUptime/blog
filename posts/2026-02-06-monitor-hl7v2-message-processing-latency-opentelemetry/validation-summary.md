# Validation Summary: How to Monitor HL7 v2 Message Processing Latency with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Python API and SDK
- OpenTelemetry OTLP gRPC exporters
- OpenTelemetry Collector configuration
- OpenTelemetry Collector groupbyattrs processor
- Python hl7 library
- HL7 v2 ADT, ORM, and ORU messages
- HL7 v2 MSH, PV1, OBR, and OBX segments

## Sources Consulted
- OpenTelemetry Python manual instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry Collector processors documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector groupbyattrs processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/v0.153.0/processor/groupbyattrsprocessor
- OpenTelemetry Collector OTLP gRPC exporter documentation: https://pkg.go.dev/go.opentelemetry.io/collector/exporter/otlpexporter
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- python-hl7 documentation: https://python-hl7.readthedocs.io/en/latest/
- python-hl7 accessor documentation: https://python-hl7.readthedocs.io/en/latest/accessors.html
- python-hl7 API documentation: https://python-hl7.readthedocs.io/en/latest/api.html
- Caristix HL7 v2 MSH.9 field reference: https://hl7-definition.caristix.com/v2/HL7v2.7/Fields/MSH.9
- Caristix HL7 v2 PV1.3 field reference: https://hl7-definition.caristix.com/v2/HL7v2.3/Fields/PV1.3
- Caristix HL7 v2 OBR.4 field reference: https://hl7-definition.caristix.com/v2/HL7v2.5/Fields/OBR.4
- Caristix HL7 v2 OBR.25 field reference: https://hl7-definition.caristix.com/v2/HL7v2.4/Fields/OBR.25

## Issues Found
- The post described HL7 v2 messages simply as pipe-delimited text. I clarified that HL7 v2 messages are typically pipe-delimited and also use encoding characters defined in the MSH segment.
- The OpenTelemetry Python status-setting example used `trace.Status` and `trace.StatusCode`. I changed it to import `Status` and `StatusCode` from `opentelemetry.trace`, matching the official OpenTelemetry Python documentation, and added `span.record_exception(e)` for exception details.
- The processing latency measurement used `time.time()`, which can move if the system clock changes. I changed it to `time.perf_counter()` for elapsed-duration measurement.
- The ADT example stated that assigned ward/room/bed location is "not PHI." I replaced that with a privacy-policy caution, because location granularity can be sensitive depending on context and policy.
- The Collector configuration used the contrib `groupbyattrs` processor without noting its distribution requirement. I added a sentence that it is available in the OpenTelemetry Collector contrib and Kubernetes distributions.
- The Collector OTLP exporter pointed at a host:port endpoint without `tls.insecure: true`. The Collector OTLP gRPC exporter requires TLS by default for scheme-less endpoints, so I added `tls: insecure: true` for the plaintext example endpoint.

## Review Notes
The code is illustrative and references application-specific functions such as `process_orm_message`, `handle_admit`, and `route_result_to_ehr` that are not defined in the post. That is acceptable for a focused instrumentation example, but a future full runnable sample should include stubs or a complete integration-engine adapter.
