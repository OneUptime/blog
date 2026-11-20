# Validation Summary: OTLP Partial-Success Responses: Detect Rejected Spans, Metrics, and Logs

## Status
validated

## Post Type
Technical troubleshooting guide with Python diagnostics and a curl command.

## Technologies Covered
- OpenTelemetry and OTLP over HTTP
- OpenTelemetry Collector OTLP HTTP exporter
- Protocol Buffers binary encoding and ProtoJSON
- Python standard-library JSON parsing
- curl and HTTP response capture
- Trace, metric, and log rejection monitoring

## Sources Consulted
- [OTLP specification](https://opentelemetry.io/docs/specs/otlp/) — HTTP response encoding, partial acceptance, warning-only responses, and retry restrictions.
- [Trace service schema](https://github.com/open-telemetry/opentelemetry-proto/blob/main/opentelemetry/proto/collector/trace/v1/trace_service.proto) — trace response type and rejection count.
- [Metrics service schema](https://github.com/open-telemetry/opentelemetry-proto/blob/main/opentelemetry/proto/collector/metrics/v1/metrics_service.proto) — metric data point rejection count.
- [Logs service schema](https://github.com/open-telemetry/opentelemetry-proto/blob/main/opentelemetry/proto/collector/logs/v1/logs_service.proto) — log record rejection count.
- [ProtoJSON format](https://protobuf.dev/programming-guides/json/) — int64 serialization, accepted numeric forms, and defaults.
- [Collector OTLP HTTP exporter source](https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlphttpexporter/otlp.go) — signal-specific partial-success handlers and warning logging.
- [Collector internal telemetry](https://opentelemetry.io/docs/collector/internal-telemetry/) — receiver and exporter queue diagnostics.
- [curl manual](https://curl.se/docs/manpage.html) — request data, headers, output files, and silent/error flags.
- [Python json documentation](https://docs.python.org/3/library/json.html) — decoding and JSON-to-Python types.
- [Python built-in types](https://docs.python.org/3/library/stdtypes.html) — integer, boolean, dictionary, and string operations.
- [Author GitHub profile](https://github.com/nawazdhandala) — author link destination.

## Issues Found
No technical issues found.

## Review Notes
- README.md was left unchanged. The post contains substantive technical implementation details and qualifies for technical validation.
- Confirmed HTTP 200 partial-success semantics, the three signal-specific counts, warning-only responses, and the prohibition on replaying a request with populated partial success. The schemas define an empty partial-success message as both a zero rejection count and an empty error message; an empty error message alone does not imply full acceptance.
- Confirmed the Collector handlers log warnings with dropped_spans, dropped_data_points, or dropped_log_records when the count is nonzero or a diagnostic message is present, then return nil. This is a source review of upstream main, not a runtime test of a pinned Collector release. The post correctly recommends verifying the deployed version.
- Executed the exact Python example successfully and passed 50 additional checks covering all signals, string and integer counts, defaults, warning-only messages, int64 limits, malformed structures, invalid types, and negative counts.
- The helper is appropriately scoped to diagnostics rather than a complete ProtoJSON decoder. It handles ordinary decimal string counts and Python integer values, but rejects some forms a conforming ProtoJSON parser can accept, such as exponent notation and null fields. Its warning flag indicates a nonempty diagnostic message; callers must inspect rejected separately for rejection without a message.
- Checked shell syntax and exercised the curl command against a temporary local HTTP mock, changing only the destination. Verified POST, Content-Type, request-file contents, header capture, and response-body capture. The mock used an empty envelope solely to test transport mechanics and returned a fixed response; this does not demonstrate actual telemetry acceptance or rejection by a backend.
- Technical links point to the intended official resources. The author link redirects to the expected GitHub profile. telemetry.example.com is an illustrative endpoint requiring replacement, and the post explicitly requires a valid synthetic request and suitable authentication.
- No deprecated APIs or version-specific errors were identified. Upstream main links are mutable; deployed exporter behavior and internal metric names should continue to be checked as the post advises.
