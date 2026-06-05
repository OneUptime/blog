# Validation Summary: How to Trace Delayed Job Workers with OpenTelemetry in Ruby

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Ruby
- Delayed Job
- Delayed Job Active Record backend
- OpenTelemetry Ruby SDK
- OpenTelemetry OTLP exporter
- OpenTelemetry Ruby auto-instrumentation
- Rails
- Net::HTTP

## Sources Consulted
- OpenTelemetry Ruby instrumentation documentation: https://opentelemetry.io/docs/languages/ruby/instrumentation/
- OpenTelemetry SDK Ruby configurator API documentation: https://www.rubydoc.info/gems/opentelemetry-sdk/OpenTelemetry/SDK/Configurator
- OpenTelemetry Ruby Tracer API source: https://github.com/open-telemetry/opentelemetry-ruby/blob/main/api/lib/opentelemetry/trace/tracer.rb
- OpenTelemetry Ruby Context API source: https://github.com/open-telemetry/opentelemetry-ruby/blob/main/api/lib/opentelemetry/context.rb
- OpenTelemetry Ruby SpanContext, TraceFlags, and Tracestate API source: https://github.com/open-telemetry/opentelemetry-ruby/tree/main/api/lib/opentelemetry/trace
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- Delayed Job README and official repository: https://github.com/collectiveidea/delayed_job
- Delayed Job lifecycle API documentation: https://www.rubydoc.info/gems/delayed_job/Delayed/Lifecycle
- Delayed Job backend and worker source: https://github.com/collectiveidea/delayed_job/tree/master/lib/delayed

## Issues Found
- The plugin attempted to assign `trace_context` directly to the `Delayed::Job` database record. Delayed Job serializes the payload object into the `handler` column, so the trace context must be stored on `job.payload_object`. Updated the code to set `payload.trace_context` and reassign `job.payload_object = payload` so the changed payload is serialized before save.
- The examples passed `with_parent:` to `tracer.in_span`, but current OpenTelemetry Ruby exposes explicit parent context on `start_span`; `in_span` does not accept `with_parent:`. Updated the examples to activate the extracted context with `OpenTelemetry::Context.with_current(parent_context)` before calling `tracer.in_span`.
- The permanent failure callback tried to annotate `OpenTelemetry::Trace.current_span`, but Delayed Job's `failure` lifecycle event runs after `invoke_job` has unwound, so the execution span is no longer current. Updated the example to create a `delayed_job.failure` span under the extracted parent context.
- The retry example used `Delayed::Worker.max_attempts` directly. Delayed Job supports per-job `max_attempts`, so the example now uses `job.max_attempts || Delayed::Worker.max_attempts`.
- The OTLP endpoint example used a traces path with the generic `OTEL_EXPORTER_OTLP_ENDPOINT` name. Updated it to `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` so the signal-specific endpoint is used as-is according to the OTLP exporter specification.
- The post used `c.use_all` without including the OpenTelemetry all-instrumentation bundle. Added `opentelemetry-instrumentation-all` to the Gemfile example.

## Review Notes
The Ruby examples were reviewed statically against official documentation and source because this workspace does not have `ruby` or `bundle` installed. The tracing attribute names are usable custom attributes, though future maintenance could align them more closely with the latest OpenTelemetry messaging semantic conventions.
