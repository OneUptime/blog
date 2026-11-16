# Validation Summary: How to Redact Sensitive LLM Data in Prompt Logs, Tool Spans, and Errors

## Status
validated

## Post Type
Technical guide with a runnable Python data-minimization example.

## Technologies Covered
- Python standard library: JSON serialization, sets, numeric conversions, and assertions.
- OpenTelemetry instrumentation, logs, spans, attributes, and Collector pipelines.
- Sentry Python SDK error-event and performance-data filtering.
- Presidio sensitive-data detection and its limitations.
- LLM prompt and tool telemetry, exception reporting, and privacy testing.

## Sources Consulted
- OpenTelemetry sensitive-data guidance: https://opentelemetry.io/docs/security/handling-sensitive-data/
- OpenTelemetry Collector architecture: https://opentelemetry.io/docs/collector/architecture/
- Python JSON serialization reference: https://docs.python.org/3/library/json.html
- Python built-in functions reference: https://docs.python.org/3/library/functions.html
- Sentry Python filtering documentation: https://docs.sentry.io/platforms/python/configuration/filtering/
- Sentry Python SDK configuration options: https://docs.sentry.io/platforms/python/configuration/options/
- Sentry Python data collection documentation: https://docs.sentry.io/platforms/python/data-management/data-collected/
- Presidio overview and detection limitations: https://data-privacy-stack.github.io/presidio/ (redirects to https://presidio.dataprivacystack.org/).
- Prometheus metric and label naming guidance: https://prometheus.io/docs/practices/naming/

## Issues Found
No technical issues found.

## Review Notes
- Left README.md unchanged. The example and explanations are correct for the stated data-minimization scope.
- Executed the complete Python example on Python 3.15.0. Both sensitive-marker assertions passed; the output contained only the five intended fields, with elapsed_ms equal to 125.8 and input_chars equal to 31.
- Also verified rejection of unsupported operation and outcome labels, rejection of negative measurements, and acceptance of zero measurements.
- The example assumes trusted numeric measurements. If extended to accept arbitrary measurement inputs, explicit type and finite-number validation would improve robustness: Python permits NaN and infinity in json.dumps by default, and int truncates fractional values. This does not affect the demonstrated example or its sensitive-string exclusion.
- Confirmed that OpenTelemetry recommends minimizing collection and reviewing instrumentation output. Collector processing only acts on data in its pipelines, supporting the warning about earlier persistence and independent export paths.
- Confirmed that Sentry before_send modifies or drops error events, while transaction and streamed-span filtering use separate controls. Request data, breadcrumbs, and frame locals need their own review.
- Confirmed Presidio explicitly disclaims complete sensitive-data detection. Its linked documentation redirects successfully to the current project documentation.
- Confirmed the recommendation to keep unbounded correlation identifiers out of metric labels against Prometheus guidance.
- No terminal commands, configuration snippets, or pinned library versions require additional validation. No deprecated API is used in the example.
- The synthetic multi-destination export tests are operational recommendations; no application, Collector, or Sentry deployment is supplied to run those integration tests.
