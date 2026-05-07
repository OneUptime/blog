# Validation Summary: How to Use LLMs to Debug Production Issues from OpenTelemetry Traces

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTelemetry Collector
- OTLP JSON
- OpenTelemetry tail sampling
- Python
- OpenAI Python SDK
- OpenAI Chat Completions API
- Watchdog
- OneUptime
- MCP (Model Context Protocol)

## Sources Consulted
- OpenTelemetry Collector configuration docs: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Protocol File Exporter spec: https://opentelemetry.io/docs/specs/otel/protocol/file-exporter/
- OpenTelemetry file exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/fileexporter/README.md
- OpenTelemetry tail sampling processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OTLP spec: https://opentelemetry.io/docs/specs/otlp/
- OTLP trace proto definitions: https://raw.githubusercontent.com/open-telemetry/opentelemetry-proto/main/opentelemetry/proto/trace/v1/trace.proto
- OpenAI Python SDK README: https://github.com/openai/openai-python
- OpenAI GPT-4o model docs: https://developers.openai.com/api/docs/models/gpt-4o
- Watchdog quickstart docs: https://python-watchdog.readthedocs.io/en/stable/quickstart.html
- OneUptime OpenTelemetry docs: https://oneuptime.com/docs/telemetry/open-telemetry
- OneUptime MCP server docs: https://oneuptime.com/docs/ai/mcp-server
- OneUptime API reference docs: https://oneuptime.com/docs/api-reference/api-reference

## Issues Found
- The collector config defined `tail_sampling` but did not attach it to the traces pipeline. I updated the example so `tail_sampling` is actually used in `service.pipelines.traces.processors`.
- The file exporter example used a `.json` path even though the OTLP file exporter writes JSON Lines for OTLP JSON file output. I changed the path to `traces.jsonl` and enabled `append: true` so the watcher example matches the file format being consumed.
- The Step 2 formatter treated a collector export payload as if it were already a single trace. OTLP JSON file records are `TracesData` batches and can contain spans from multiple traces, so I updated the formatter to extract one `traceId` from a batch before formatting it.
- The formatter returned raw numeric OTLP enum values for span kind and status, but the example output showed human-readable values like `ERROR`. I added explicit enum decoding so the code matches the documented output.
- The formatter comment said spans were sorted by start time, but the original code sorted by duration. I corrected the implementation to sort chronologically by span start time.
- The watchdog automation example re-read the whole file on each modification and did not keep the process alive after `observer.start()`. I added file offset tracking, partial-line handling for JSONL appends, and the standard blocking loop with `observer.stop()` and `observer.join()`.
- The prompt asked the model to estimate how many users were impacted from a single trace, which is not supported by the trace data shown and conflicted with the instruction not to speculate. I narrowed that prompt section to trace-supported blast-radius analysis.
- The OpenAI sentence said `gpt-4o` could be swapped for “any model.” I narrowed that to “another chat-compatible model” because endpoint compatibility varies by model.
- The OneUptime section said the backend “supports OTLP export,” but the official docs document OTLP ingestion into OneUptime. I corrected that wording and made the “data stays on your infrastructure” claim conditional on self-hosting.

## Review Notes
- The OpenAI Python SDK example remains technically valid. The official SDK now emphasizes the Responses API for new projects, but Chat Completions is still supported and the example uses a supported model and client pattern.
- OpenTelemetry tail sampling requires trace affinity: all spans for a given trace must reach the same collector instance for reliable tail-sampling decisions.
- The OTLP file exporter spec does not guarantee record ordering, so grouping by `traceId` and explicitly ordering spans for presentation is important when preparing traces for LLM analysis.
- If readers run the official `otel/opentelemetry-collector-contrib` container, the file exporter path must point at a writable mounted volume because the default container filesystem is not writable by default.
