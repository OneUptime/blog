# Validation Summary: How to Validate Semantic Convention Compliance in Your Telemetry

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry semantic conventions
- OpenTelemetry Python SDK
- OpenTelemetry Collector
- OpenTelemetry Collector transform processor and OTTL
- Python unit testing
- Telemetry validation pipelines

## Sources Consulted
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry HTTP semantic convention stabilization notes: https://opentelemetry.io/blog/2023/http-conventions-declared-stable/
- OpenTelemetry semantic conventions overview: https://opentelemetry.io/docs/concepts/semantic-conventions/
- OpenTelemetry Python SDK trace export documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.export.html
- OpenTelemetry Python exporter documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Collector processor documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector OTTL functions: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/pkg/ottl/ottlfuncs
- OpenTelemetry Collector attributes processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- OpenTelemetry database semantic conventions: https://opentelemetry.io/docs/specs/semconv/database/database-spans/

## Issues Found
- Fixed the Python in-memory exporter import. The post used `opentelemetry.sdk.trace.export.in_memory`, but current OpenTelemetry Python examples and package layout use `opentelemetry.sdk.trace.export.in_memory_span_exporter`.
- Fixed the unit test tracer setup. The original code attempted to add `trace.get_tracer_provider()` as a span processor and recreated the global tracer provider in each test setup. The corrected snippet creates a `TracerProvider`, attaches a `SimpleSpanProcessor`, and installs the provider once in `setUpClass`.
- Updated HTTP method validation to reflect current semantic convention behavior. The post only allowed a subset of methods and asserted uppercase. The corrected examples include the known methods from the current HTTP semantic conventions, including `CONNECT`, `TRACE`, `QUERY`, and `_OTHER`.
- Corrected the HTTP server schema so `url.scheme` is required. Current HTTP server span conventions mark `http.request.method`, `url.path`, and `url.scheme` as required.
- Updated the schema validator to honor `span_name_pattern`. The original CI example would validate every span against the HTTP schema, including non-HTTP spans, causing false positives.
- Reworked the Collector snippet. The original text claimed the filter processor could detect and log missing attributes and that an attributes processor action would tag only non-compliant spans, but that configuration would not do that. The corrected snippet uses the transform processor with OTTL `where` clauses to tag missing attributes and normalize common issues.

## Review Notes
The Collector example remains illustrative and processor-only rather than a full runnable Collector configuration with receivers, exporters, and pipelines. The remediation script uses regex replacement for simple migration campaigns; it is syntactically valid, but real migrations should still be reviewed because semantic convention changes such as `http.target` splitting into `url.path` and `url.query` may require context-aware changes.
