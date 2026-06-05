# Validation Summary: How to Instrument Temporal.io Workflows with OpenTelemetry

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Temporal Go SDK
- Temporal Python SDK
- OpenTelemetry tracing
- OTLP trace export
- Distributed tracing for workflows, activities, child workflows, and signals

## Sources Consulted
- Temporal Go SDK OpenTelemetry package documentation: https://pkg.go.dev/go.temporal.io/sdk/contrib/opentelemetry
- Temporal Go SDK tracing interceptor source: https://github.com/temporalio/sdk-go/blob/main/interceptor/tracing_interceptor.go
- Temporal Go SDK workflow package documentation: https://pkg.go.dev/go.temporal.io/sdk/workflow
- Temporal Go SDK workflow source for workflow.Info fields: https://github.com/temporalio/sdk-go/blob/main/internal/workflow.go
- Temporal Python SDK README, OpenTelemetry tracing section: https://github.com/temporalio/sdk-python#opentelemetry-tracing
- Temporal Python OpenTelemetry sample: https://github.com/temporalio/samples-python/tree/main/open_telemetry
- OpenTelemetry Go semantic conventions package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/semconv/v1.24.0

## Issues Found
- The Go workflow snippet used `temporal.RetryPolicy` without importing `go.temporal.io/sdk/temporal`. Added the missing import.
- The Go workflow snippet referenced `activities.ValidateOrder`, `activities.ProcessPayment`, and related methods without defining the `activities` receiver. Added `var activities *OrderActivities`, which matches the common Temporal Go SDK pattern for typed activity references from workflow code.
- The Go activity snippet referenced `sql.DB` and `trace.WithAttributes` without importing `database/sql` and `go.opentelemetry.io/otel/trace`. Added the missing imports.
- The workflow section implied arbitrary custom spans could be added inside workflow code. Tightened the wording to reflect Temporal workflow determinism requirements and recommend custom child spans in activities, while using the interceptor-provided workflow span only for deterministic attributes.
- The Temporal-specific attribute snippet used `span` without showing how to obtain it in workflow code. Updated it to use `opentelemetry.SpanFromWorkflowContext(ctx)` and cache `workflow.GetInfo(ctx)` before setting attributes.

## Review Notes
The overall approach is correct: Temporal's Go and Python SDKs provide OpenTelemetry tracing via interceptors, and the Go tracing interceptor creates spans such as `StartWorkflow`, `RunWorkflow`, `StartActivity`, `RunActivity`, `StartChildWorkflow`, and signal/update handling spans while propagating context through Temporal headers. The Go OpenTelemetry contrib package is versioned below v1, so future SDK releases may adjust APIs; the reviewed APIs are current as of 2026-06-05.
