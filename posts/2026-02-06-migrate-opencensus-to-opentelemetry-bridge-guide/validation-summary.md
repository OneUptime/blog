# Validation Summary: How to Migrate from OpenCensus to OpenTelemetry (Official Bridge Guide)

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- OpenTelemetry
- OpenCensus
- OpenTelemetry Go SDK
- OpenTelemetry Go OpenCensus bridge
- OpenTelemetry Python SDK
- OpenTelemetry Python OpenCensus shim
- OTLP trace and metric exporters

## Sources Consulted
- OpenTelemetry Go OpenCensus bridge package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/bridge/opencensus
- OpenTelemetry OpenCensus compatibility specification: https://opentelemetry.io/docs/specs/otel/compatibility/opencensus/
- OpenTelemetry Python OpenCensus shim documentation: https://opentelemetry-python.readthedocs.io/en/latest/shim/opencensus_shim/opencensus_shim.html
- OpenTelemetry Python OpenCensus shim example: https://opentelemetry-python.readthedocs.io/en/latest/examples/opencensus-shim/README.html
- OpenTelemetry Sunsetting OpenCensus migration page: https://opentelemetry.io/pl/docs/migration/opencensus/

## Issues Found
- The post said OpenCensus had been in maintenance mode since 2019 and would not receive security patches. The official OpenTelemetry sunsetting notice says most OpenCensus repositories were to be archived after July 31, 2023, with no new features or security patches after that. Updated the wording to match the official timeline.
- The Go trace bridge example used non-current APIs: `opencensus.NewTracer(...)` and assignment to `octrace.DefaultTracer`. The current bridge API documents `opencensus.InstallTraceBridge(...)` with `opencensus.WithTracerProvider(...)`. Updated the code and explanatory text accordingly.
- The Go trace bridge snippet omitted required imports for `context`, `log`, and `otel`. Added those imports so the snippet is syntactically coherent.
- The Go SDK initialization snippet imported `log` without using it. Removed the unused import.
- The Go metrics bridge example used a non-existent `opencensus.InstallNewPipeline(...)` API. Replaced it with the documented `opencensus.NewMetricProducer()` attached to an OpenTelemetry metric reader with `sdkmetric.WithProducer(...)`.
- The metrics explanation described OpenCensus measures becoming OpenTelemetry instruments such as Counter and Gauge. The documented bridge produces OpenTelemetry metric data through a `MetricProducer`. Updated the wording to describe exported sums, histograms, and gauges.
- The Python install command omitted the `opencensus` package even though the example imports `opencensus.trace`. Added `opencensus` to the install command.
- The Python section claimed `install_shim()` routes all OpenCensus calls through OpenTelemetry. The official Python shim documentation and example are trace-focused, so the wording was narrowed to OpenCensus trace calls and spans.

## Review Notes
The Go examples were checked against current official package documentation, but the local environment does not have the Go toolchain installed, so I could not compile them locally. The OpenTelemetry Python OpenCensus shim package remains beta-versioned on PyPI, so production migrations should pin compatible OpenTelemetry Python package versions and test with the target Python version.
