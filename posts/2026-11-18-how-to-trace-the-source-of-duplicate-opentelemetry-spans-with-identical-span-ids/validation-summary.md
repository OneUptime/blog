# Validation Summary: How to Trace the Source of Duplicate OpenTelemetry Spans with Identical Span IDs

## Status
validated

## Post Type
Technical troubleshooting guide with an executable reproduction.

## Technologies Covered
- OpenTelemetry tracing API and SDK span processors
- OpenTelemetry Collector 0.143.0, OTLP receiver, debug exporter, pipelines, and internal telemetry
- OTLP/HTTP JSON encoding, acknowledgements, and retries
- Python standard library: json, secrets, time, and urllib.request
- Trace identity and backend ingestion/query diagnostics

## Sources Consulted
- OpenTelemetry tracing API, SpanContext and identifier representations: https://opentelemetry.io/docs/specs/otel/trace/api/#spancontext
- OpenTelemetry tracing SDK, span processors and exporters: https://opentelemetry.io/docs/specs/otel/trace/sdk/#span-processor
- OTLP specification, JSON encoding, HTTP requests, partial success, and duplicate data: https://opentelemetry.io/docs/specs/otlp/
- Collector pipeline architecture: https://opentelemetry.io/docs/collector/architecture/
- Collector configuration and CLI flags: https://opentelemetry.io/docs/collector/configuration/
- Collector internal telemetry: https://opentelemetry.io/docs/collector/internal-telemetry/
- Debug exporter documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/debugexporter/README.md
- Version-pinned debug exporter documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/v0.143.0/exporter/debugexporter/README.md
- Version-pinned OTLP receiver configuration: https://raw.githubusercontent.com/open-telemetry/opentelemetry-collector/v0.143.0/receiver/otlpreceiver/config.go
- Receiver metric definitions: https://raw.githubusercontent.com/open-telemetry/opentelemetry-collector/v0.143.0/receiver/receiverhelper/metadata.yaml
- Exporter metric definitions: https://raw.githubusercontent.com/open-telemetry/opentelemetry-collector/v0.143.0/exporter/exporterhelper/metadata.yaml
- Official trace protobuf schema: https://raw.githubusercontent.com/open-telemetry/opentelemetry-proto/main/opentelemetry/proto/trace/v1/trace.proto
- Python urllib.request: https://docs.python.org/3/library/urllib.request.html
- Python secrets: https://docs.python.org/3/library/secrets.html
- Python time.time_ns: https://docs.python.org/3/library/time.html#time.time_ns
- Python JSON serialization: https://docs.python.org/3/library/json.html
- Official Collector binary used for runtime verification: https://github.com/open-telemetry/opentelemetry-collector-releases/releases/download/v0.143.0/otelcol_0.143.0_darwin_arm64.tar.gz
- Author profile link: https://github.com/nawazdhandala

## Issues Found
No technical issues found.

## Review Notes
- README.md required no changes. The post is technically relevant and contains working configuration, a valid CLI command, and executable Python code.
- Extracted the configuration and Python fixture directly from README.md. Python compilation succeeded. Both the original configuration and the configuration with the second pipeline passed the Collector 0.143.0 validate command.
- Ran the official Darwin ARM64 Collector 0.143.0 binary with each configuration. The unchanged fixture returned HTTP 200 in both runs. The first run logged the generated trace ID and span ID once; the second run logged its new pair twice. This confirms the shared-exporter fan-out behavior described in the post. Both Collector processes were stopped after verification.
- Confirmed the fixture uses hexadecimal identifiers, numeric span kind, decimal-string nanosecond timestamps, the /v1/traces endpoint, and application/json content type. The standard-library APIs are supported; time.time_ns requires Python 3.7 or later.
- Confirmed debug exporter verbosity and sampling settings against the pinned release. sampling_thereafter: 1 disables sampling, and detailed output is explicitly not a stable parsing interface.
- Confirmed that multiple SDK processors can export one completed span, lost acknowledgements can cause duplicate delivery, and populated partial-success responses must not be retried. The runtime response contained an empty partialSuccess object, which is distinct from a populated partial-success response.
- Collector metric definitions support the distinction between counts of processing/delivery activity and unique span identities. Metric availability and names can vary by deployed release.
- Backend joins, overlapping stores, and compaction are presented as investigation possibilities, not guaranteed behavior of a named backend. Backend-specific deduplication semantics appropriately remain subject to that backend's contract.
- The cited documentation and author links resolved to the expected resources. Version 0.143.0 is a reproducible baseline, not a claim to be the latest version; deployment-specific reproduction remains appropriate.
