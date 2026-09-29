# Validation Summary: Why Remote Parents Have `isRecording=false`: Sampling and Child Spans

## Status

validated

## Post Type

Technical guide with a Python demonstration and troubleshooting advice.

## Technologies Covered

- OpenTelemetry tracing API and SDK
- Python `opentelemetry-api` and `opentelemetry-sdk`
- W3C Trace Context propagation
- Parent-based sampling and distributed tracing
- Span processors, exporters, and OpenTelemetry Collector troubleshooting

## Sources Consulted

- [OpenTelemetry Tracing API specification](https://opentelemetry.io/docs/specs/otel/trace/api/): context validity, remote contexts, non-recording wrappers, span lifecycle, and behavior without an SDK.
- [OpenTelemetry Tracing SDK specification](https://opentelemetry.io/docs/specs/otel/trace/sdk/): span creation, sampling decisions, parent-based sampling, processors, and exporters.
- [OpenTelemetry Python sampling documentation](https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.sampling.html): public sampler APIs.
- [OpenTelemetry Python sampling implementation](https://opentelemetry-python.readthedocs.io/en/latest/_modules/opentelemetry/sdk/trace/sampling.html): default parent branches and root selection.
- [Official Python Trace Context propagator source](https://github.com/open-telemetry/opentelemetry-python/blob/main/opentelemetry-api/src/opentelemetry/trace/propagation/tracecontext.py): header validation, preservation of supplied context on failure, and creation of remote non-recording wrappers.
- [OpenTelemetry Propagators API specification](https://opentelemetry.io/docs/specs/otel/context/api-propagators/): extraction behavior.
- [OpenTelemetry Collector troubleshooting](https://opentelemetry.io/docs/collector/troubleshooting/): missing telemetry, processing, and export failures.

## Issues Found

- The post stated that a malformed carrier or lost context necessarily makes the next operation a root. Failed extraction preserves the supplied context, which can already contain a valid parent. Qualified the root-span claim with “if no valid parent remains” and explained preservation of the supplied context. The example already supplies an empty `Context()` and requires no change.

## Review Notes

- Reviewed the Python example's syntax, imports, API calls, and control flow against the official documentation and implementation. No deprecated APIs were identified in the example.
- The source-derived expected output is `01 False True True True` followed by `00 False False False False`. The default sampled remote-parent branch uses `ALWAYS_ON`, independently of the explicitly disabled root branch.
- Confirmed that valid remote wrappers remain non-recording; SDK children retain the trace ID and receive new span IDs; recording state should be inspected before ending the child. Recording without sampling is a separate SDK decision.
- The provider is instantiated directly and does not replace the global provider. No processor or exporter is registered, so the example demonstrates recording and sampling without backend delivery.
- The post's three technical documentation links resolve to the intended official resources. There are no terminal commands, standalone configuration snippets, or explicit library-version claims to correct.
- Runtime validation was attempted, but the default Python environment lacked the SDK and isolated environment initialization did not complete promptly. The example was therefore validated by documentation and implementation review, not a successful execution. The output above is expected output, not captured runtime output.
- Backend ingestion and retention cannot be established from a sampled flag; the post appropriately treats these as separate operational checks. No backend-specific configuration is provided or tested.
