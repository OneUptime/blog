# Validation Summary: How to Monitor High-Frequency Trading System Latency at Microsecond Granularity

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry C++ API and SDK
- OpenTelemetry span processors and span exporters
- C++ `clock_gettime`
- Linux `CLOCK_MONOTONIC_RAW`
- Shared memory export pattern for low-latency telemetry
- High-frequency trading latency monitoring

## Sources Consulted
- OpenTelemetry Trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry Trace SDK specification: https://opentelemetry.io/docs/specs/otel/trace/sdk/
- OpenTelemetry C++ `SpanProcessor` API reference: https://opentelemetry-cpp.readthedocs.io/en/v1.4.1/otel_docs/classopentelemetry_1_1sdk_1_1trace_1_1SpanProcessor.html
- OpenTelemetry C++ `SpanExporter` API reference: https://opentelemetry-cpp.readthedocs.io/en/latest/otel_docs/classopentelemetry_1_1sdk_1_1trace_1_1SpanExporter.html
- OpenTelemetry C++ `Recordable` API reference: https://opentelemetry-cpp.readthedocs.io/en/latest/otel_docs/classopentelemetry_1_1sdk_1_1trace_1_1Recordable.html
- OpenTelemetry C++ `SpanData` API reference: https://opentelemetry-cpp.readthedocs.io/en/latest/otel_docs/classopentelemetry_1_1sdk_1_1trace_1_1SpanData.html
- OpenTelemetry C++ `Span` API reference: https://opentelemetry-cpp.readthedocs.io/en/stable/otel_docs/classopentelemetry_1_1trace_1_1Span.html
- Linux `clock_gettime(2)` manual page: https://man7.org/linux/man-pages/man2/clock_gettime.2.html

## Issues Found
- The post incorrectly said the default OpenTelemetry SDK uses millisecond timestamps internally. Updated this to say OpenTelemetry can represent timestamps with nanosecond precision, while typical SDK instrumentation, batching, exporting, and backend dashboards are not designed for deterministic HFT hot-path measurement.
- The high-resolution timer returned a field named `epoch_micros` even though `CLOCK_MONOTONIC_RAW` is monotonic time, not Unix epoch time. Renamed it to `monotonic_micros` and updated usages.
- The span processor example used the wrong `OnEnd` signature for OpenTelemetry C++ and omitted required `SpanProcessor` methods. Updated it to use `std::unique_ptr<Recordable> &&`, add `MakeRecordable`, `ForceFlush`, and `Shutdown`, and read ended span data through `SpanData`.
- The span processor and exporter examples called getters such as `GetName`, `GetDuration`, `GetTraceId`, and `GetAttribute` directly on `Recordable`, but the documented readable representation is `SpanData`. Updated the examples to create and cast to `SpanData`, then use documented `SpanData` getters.
- The exporter example omitted the required `MakeRecordable` and `Shutdown` implementations and used an unqualified `ExportResult`. Updated it to return `opentelemetry::sdk::common::ExportResult` and implement the required methods.
- The order-flow example attempted to call `GetAttribute` on a public API span, which OpenTelemetry C++ `Span` does not expose. Updated it to keep the market-data start timestamp in a local variable and set the measured duration as an attribute.
- The overhead section made an unsupported fixed claim of 50-100 ns per span. Replaced it with a benchmark-oriented statement that keeps the intended guidance without asserting an unverified number.
- The threshold-instrumentation wording implied you can decide whether to create a span after knowing the elapsed duration. Updated it to describe measuring first, then creating a span or event only when the threshold is crossed.

## Review Notes
The examples remain illustrative and still depend on application-specific types such as `SpanRecord`, `MicrosecondRecord`, and `write_to_shm`. Those placeholders are reasonable for a blog post, but a production implementation should define buffer overflow behavior, memory ordering, shutdown semantics, shared-memory synchronization, and benchmark results for the target trading environment.
