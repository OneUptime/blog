# Validation Summary: Child Span After Its Parent Ends: When to Use a New Trace and Span Link

## Status

validated

## Post Type

Technical troubleshooting guide with a runnable Python example.

## Technologies Covered

- OpenTelemetry tracing API and Python SDK
- Python context management and span context propagation
- Distributed tracing, parent-child relationships, and span links
- Messaging instrumentation semantic conventions
- OpenTelemetry Collector tail sampling

## Sources Consulted

- [OpenTelemetry Tracing API specification](https://opentelemetry.io/docs/specs/otel/trace/api/), especially Span Creation, Determining the Parent Span from a Context, End, and Link.
- [OpenTelemetry Python SDK trace reference](https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.html), covering TracerProvider, span inspection properties, and start_as_current_span.
- [OpenTelemetry Python trace API reference](https://opentelemetry-python.readthedocs.io/en/latest/api/trace.html), covering Link, SpanContext, and set_span_in_context.
- [OpenTelemetry Python context API reference](https://opentelemetry-python.readthedocs.io/en/latest/api/context.html), covering Context, attach, and detach.
- [Messaging span semantic conventions](https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/), especially consumer links and the single-message parent-context option.
- [Collector tail sampling processor documentation](https://raw.githubusercontent.com/open-telemetry/opentelemetry-collector-contrib/main/processor/tailsamplingprocessor/README.md), especially decision buffering and late-arriving spans.
- [Jaeger clock-skew adjustment documentation](https://www.jaegertracing.io/docs/1.52/cli/), supporting the cross-host timestamp diagnostic caveat; no Jaeger CLI instructions are proposed in the post.
- [Author's GitHub profile](https://github.com/nawazdhandala), checked to confirm the author link resolves to the intended profile.

## Issues Found

No technical issues found.

## Review Notes

- Executed the Python code extracted directly from README.md in an isolated virtual environment using Python 3.9.6 and opentelemetry-api/opentelemetry-sdk 1.41.1. All original assertions passed. Supplemental checks confirmed that the child starts after the origin ends, the link also preserves the origin trace ID, and the current context is restored after the context managers exit.
- Confirmed that ending a span does not prevent later parenting through its context. Explicit empty contexts produce roots, and links preserve causal references without assigning a parent. Span timestamps describe the measured operation; visual nesting is not a reason to alter them.
- The example correctly identifies parent and links as SDK inspection properties. Its assertions assume recording spans and retained links under default SDK settings; externally configured sampling or span limits can change those conditions. No deprecated APIs were identified.
- The code demonstrates sequential execution after the origin ends, without simulating a real queue or a five-second delay. This matches its stated purpose of checking structural differences without a backend.
- Messaging conventions support links for batch consumption and allow parent relationships for single-message processing. These conventions remain subject to development, so following the installed instrumentation's documented behavior is appropriate.
- Tail-sampling lateness does not necessarily mean a span is dropped: retained or cached decisions can apply to late spans, while eviction can lead to a new decision. The post correctly avoids claiming unconditional loss or a universal collection window.
- Choosing a new trace for independently owned work is architectural guidance rather than a specification requirement. UI link presentation and displayed trace duration depend on the backend; no backend UI or exporter integration was exercised.
- All four technical links in the post resolved to the intended official resources. The author link also resolved. There are no terminal commands, configuration snippets, or explicit version promises to correct. README.md was left unchanged.
