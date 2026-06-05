# Validation Summary: How to Build a Test Harness for Custom OpenTelemetry Collector Processors

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector processors
- Go
- Go testing
- OpenTelemetry Collector pdata trace APIs
- OpenTelemetry Collector consumertest utilities

## Sources Consulted
- OpenTelemetry Collector processor package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/processor
- OpenTelemetry Collector consumer package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/consumer
- OpenTelemetry Collector component package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/component
- OpenTelemetry Collector consumertest package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/consumer/consumertest
- OpenTelemetry Collector ptrace package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/pdata/ptrace
- OpenTelemetry Collector receiver-building guide for pdata construction examples: https://opentelemetry.io/docs/collector/building/receiver/
- Go race detector documentation: https://go.dev/doc/articles/race_detector

## Issues Found
- The post said `ConsumeTraces` returns the trace data to the next consumer. The current Collector consumer API returns only an error from `ConsumeTraces`; the trace data is passed onward by calling the next consumer. Updated the explanation.
- The sample processor referenced `consumer.Traces` and `consumer.Capabilities` without importing `go.opentelemetry.io/collector/consumer`, while importing `processor` without using it. Added the missing import and an interface assertion using `processor.Traces`.
- The sample processor was described as implementing a Collector trace processor, but it did not implement the `component.Component` lifecycle methods required by `processor.Traces`. Added no-op `Start` and `Shutdown` methods.
- The prose said the processor adds the attribute to all spans, but the code writes a resource attribute on each `ResourceSpans` resource. Updated the wording to match the code.
- The test snippets used `fmt.Errorf`, `pcommon.TraceID`, and `pcommon.SpanID` functionality without showing the required imports or helper implementations. Added `fmt` and `pcommon` imports and concrete `generateTraceID` and `generateSpanID` helpers.
- The description promised trace and metric data, but the article only covers traces. Updated it to say trace data.

## Review Notes
The examples were reviewed against current official Collector package documentation. I could not run `go test` in this workspace because the `go` binary is not installed, so verification was limited to documentation-backed static review.
