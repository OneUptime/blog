# Validation Summary: How to Implement Distributed Tracing for Workflow Orchestrations

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Workflow (Python SDK, `dapr.ext.workflow`)
- Dapr Configuration (tracing with OpenTelemetry Collector)
- OpenTelemetry Python API (`opentelemetry` package)
- Grafana Tempo TraceQL query language
- Durable Task Framework (underlying workflow engine)

## Sources Consulted
- Dapr Configuration spec source code (`pkg/config/configuration.go`) for tracing YAML field names (`endpointAddress`, `protocol`, `isSecure`)
- Dapr Python SDK source (`dapr/python-sdk`, `ext/dapr-ext-workflow`) for `DaprWorkflowContext`, `WorkflowActivityContext`, and `call_activity` API
- Grafana Tempo TraceQL documentation (https://grafana.com/docs/tempo/latest/traceql/) for intrinsic vs. attribute syntax
- OpenTelemetry Python SDK documentation for `trace.get_tracer()`, `trace.get_current_span()`, `tracer.start_as_current_span()`, and `span.set_attribute()` APIs

## Issues Found

1. **TraceQL `span.name` should be `name` (intrinsic):** In the "Querying Workflow Traces" section, the query `{ span.name = "call-payment-gateway" && duration > 3s }` used `span.name` to refer to the span's operation name. In TraceQL, `name` is an intrinsic field accessed without a scope prefix (or with `span:name` using a colon). Using `span.name` (with a dot) looks for a custom span attribute literally called "name", not the span's operation name. Fixed to `{ name = "call-payment-gateway" && duration > 3s }`.

2. **Missing `workflow.status` attribute on rejection path:** The query example `{ resource.service.name = "order-workflow" && span.workflow.status = "rejected" }` references the span attribute `workflow.status` with value "rejected", but the workflow code only set `workflow.failed_at` on the failure path — it never set `workflow.status` to "rejected". Added `current_span.set_attribute("workflow.status", "rejected")` to the validation failure branch so the query example matches the code.

## Review Notes
- The `DaprClient.start_workflow()` method used in the "Correlating Workflow Spans with Instance IDs" section is functional but has been marked as deprecated in newer versions of the Dapr Python SDK. The recommended replacement is `DaprWorkflowClient.schedule_new_workflow()`. This was not changed because the deprecated API still works correctly and changing it would require restructuring the code example significantly; however, a future update should migrate to the newer API.
- The Dapr tracing configuration omits `isSecure: false`, which defaults to `true`. In local/Docker development environments connecting to a non-TLS OpenTelemetry Collector, this could cause connection failures. Consider adding `isSecure: false` for clarity in a development-focused tutorial.
- Dapr Workflow functions are replayed by the Durable Task Framework. The code calls `trace.get_current_span()` and sets attributes inside the workflow function, which will re-execute on each replay. This is conceptually valid for the tutorial's purposes but readers implementing production workflows should be aware of replay semantics and their interaction with tracing.
