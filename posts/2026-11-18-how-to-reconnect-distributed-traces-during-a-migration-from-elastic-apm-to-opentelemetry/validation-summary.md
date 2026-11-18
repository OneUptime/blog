# Validation Summary: How to Reconnect Traces When Migrating from Elastic APM to OpenTelemetry

## Status
validated

## Post Type
Technical troubleshooting and migration guide, including shell environment-variable configuration examples and an acceptance-test procedure.

## Technologies Covered
- OpenTelemetry SDKs, instrumentation, propagators, sampling, OTLP, and Collector pipelines.
- Elastic APM agents, particularly the Java agent and its trace continuation configuration.
- W3C Trace Context: `traceparent`, `tracestate`, trace IDs, parent IDs, and sampling flags.
- HTTP gateways, legacy Elastic propagation, and distributed tracing backends.

## Sources Consulted
- Elastic mixed-instrumentation troubleshooting: https://www.elastic.co/docs/troubleshoot/ingest/opentelemetry/edot-sdks/trace-context-propagation
- Elastic Java core configuration, including continuation strategies and legacy headers: https://www.elastic.co/docs/reference/apm/agents/java/config-core#config-trace-continuation-strategy
- Elastic Java configuration precedence: https://www.elastic.co/docs/reference/apm/agents/java/configuration
- OpenTelemetry context propagation: https://opentelemetry.io/docs/concepts/context-propagation/
- OpenTelemetry general SDK configuration: https://opentelemetry.io/docs/languages/sdk-configuration/general/
- OpenTelemetry tracing SDK and ParentBased sampling: https://opentelemetry.io/docs/specs/otel/trace/sdk/#parentbased
- OpenTelemetry tracing API and SpanContext: https://opentelemetry.io/docs/specs/otel/trace/api/#spancontext
- OpenTelemetry Collector architecture and export pipelines: https://opentelemetry.io/docs/collector/architecture/
- W3C Trace Context processing model: https://www.w3.org/TR/trace-context/#processing-model-for-working-with-trace-context

## Issues Found
No technical issues found.

## Review Notes
- Both Bash snippets pass `bash -n`. The documented variable names and values are correct: `ELASTIC_APM_TRACE_CONTINUATION_STRATEGY=continue` and `OTEL_PROPAGATORS=tracecontext,baggage`. Neither example uses a deprecated setting in the consulted references.
- Confirmed Java continuation behavior, restart links, and the `es` entry test. Central configuration takes precedence over environment variables; the separate Java configuration overview explicitly lists the precedence order.
- Confirmed that propagation requires compatible instrumentation and active context. Environment-variable support varies by SDK, and programmatic initialization may require explicit propagator setup, consistent with the post's caveat.
- The migration warning accurately reflects Elastic's support statement. A supported API bridge is a manual-instrumentation compatibility mechanism; it does not independently fix propagation or justify running competing SDKs.
- Legacy-header requirements depend on the specific language agent and version. The post appropriately avoids applying a single version threshold to every agent. Java restart links are displayed in Elastic trace views starting with Elastic Observability 8.2.
- Sampling and export routing are separate from parentage. ParentBased sampling normally drops spans with unsampled remote parents, but custom sampling can differ. The post correctly makes its recording claim conditional on the receiver following the incoming decision.
- The acceptance checks correctly describe a continued trace with an instrumented client/server boundary. An intentional restart should instead produce a new trace ID and, for the described Java policy with valid incoming context, a link. A request without incoming context should begin a new trace.
- Resource naming and Collector routing do not recover missing causal information from unrelated trace IDs alone. This conclusion follows from the documented span-context model and Collector pipeline responsibilities.
- All four technical links in the post resolved to the intended official resources. The author profile link also resolved successfully.
- This was a documentation and shell-syntax review. No running Elastic/OTel services or backend were provided, so the migration acceptance test was not executed. The technical content of README.md was left unchanged.
- Format validation shortened the title to meet the 80-character limit and synchronized it with Blogs.json and this review heading.
