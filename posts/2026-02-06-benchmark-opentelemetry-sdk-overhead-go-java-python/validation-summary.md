# Validation Summary: How to Benchmark OpenTelemetry SDK Overhead in Go, Java, and Python

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry SDK and API
- Go benchmarking with `go test`
- Java benchmarking with JMH
- Python benchmarking with `pytest-benchmark`
- OpenTelemetry Collector configuration
- OTLP trace exporters

## Sources Consulted
- OpenTelemetry Go sampling documentation: https://opentelemetry.io/docs/languages/go/sampling/
- OpenTelemetry Go `tracetest` package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/trace/tracetest
- OpenTelemetry Java SDK and exporter documentation: https://opentelemetry.io/docs/languages/java/sdk/
- OpenTelemetry Python exporter documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector processor list: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- JMH project documentation: https://github.com/openjdk/jmh
- pytest-benchmark usage documentation: https://pytest-benchmark.readthedocs.io/en/latest/usage.html

## Issues Found
- The Go example imported the same SDK trace package twice and included an unused import, which would prevent compilation. Removed the duplicate/unused imports.
- The Go example described a no-op exporter but created an OTLP gRPC exporter. Replaced it with `tracetest.NewNoopExporter()` so the code matches the text and does not require a collector for that benchmark.
- The Go benchmark reused the span context across loop iterations, which could accidentally parent later spans to an ended span. Added a stable base context for each iteration.
- The Go benchmark discarded the simulated work result, allowing compiler optimization to distort the benchmark. Returned the computed value and assigned it to a package-level result variable.
- The Java dependency snippet imported `OtlpGrpcSpanExporter` without including the required `opentelemetry-exporter-otlp` dependency. Added the exporter dependency and updated OpenTelemetry dependencies to the current documented version.
- The Java benchmark discarded the simulated work result. Added JMH `Blackhole` usage to keep benchmark work from being optimized away.
- The Java nested span example did not make the parent span current, so the child span was not actually nested under the parent. Added `makeCurrent()` with an OpenTelemetry `Scope`.
- The Java JMH build instructions implied dependencies alone were enough to produce `target/benchmarks.jar`. Clarified that the dependencies belong in a JMH benchmark project or a build configured to package that jar.
- The Python install command omitted the package needed for `opentelemetry.exporter.otlp.proto.grpc.trace_exporter.OTLPSpanExporter`. Added `opentelemetry-exporter-otlp-proto-grpc`.
- The Python fixture called `trace.set_tracer_provider()` for each benchmark, which can only be set globally once in normal usage. Moved provider setup to module scope and left the fixture to return the tracer.
- The Go benchmark output explanation described the first column as operations per second. Corrected it to benchmark iteration count.
- The overhead calculation said the instrumented operation was 2.65x longer. Corrected the interpretation to about 3.66x as long, or 2.66x more time than baseline.
- The takeaways presented example overhead ranges as general facts. Reworded them as patterns illustrated by the example output.

## Review Notes
Local validation was limited because `go`, `javac`, and `pytest` were not installed on PATH in this workspace. The review was completed against official documentation and static code/API checks.
