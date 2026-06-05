# Validation Summary: How to Monitor Real-Time Bidding Systems with OpenTelemetry

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Go SDK
- OpenTelemetry tracing
- OpenTelemetry metrics
- OTLP/gRPC exporters
- OpenTelemetry Collector
- Real-time bidding system monitoring
- Go
- YAML

## Sources Consulted
- OpenTelemetry Go documentation: https://opentelemetry.io/docs/languages/go/
- OpenTelemetry Go trace SDK API reference: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/trace
- OpenTelemetry Go metric API reference: https://pkg.go.dev/go.opentelemetry.io/otel/metric
- OpenTelemetry Go metric SDK API reference: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/metric
- OpenTelemetry Go OTLP trace gRPC exporter reference: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc
- OpenTelemetry Go OTLP metric gRPC exporter reference: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector OTLP exporter reference: https://pkg.go.dev/go.opentelemetry.io/collector/exporter/otlpexporter
- OpenTelemetry Collector attributes processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md

## Issues Found
- The tracing setup used `sdktrace.WithBatchTimeout(5_000)` while describing it as a 5 second batch window. `WithBatchTimeout` takes a `time.Duration`, so the original value was not 5 seconds. I added the `time` import and changed the value to `5 * time.Second`.
- The post recorded metrics but only initialized a tracer provider. I changed the setup snippet to initialize an OTLP metric gRPC exporter, an SDK `MeterProvider` with a `PeriodicReader`, and call `otel.SetMeterProvider(mp)` so the metric instruments in the later examples export data.
- The Collector OTLP exporter pointed to `oneuptime-collector:4317` without TLS settings. The Collector OTLP exporter requires TLS by default when no insecure setting is provided, so I added `tls.insecure: true` for the internal plaintext gRPC endpoint shown in the example.
- The statement that the configuration keeps overhead under 1 millisecond was too absolute without a benchmark. I changed it to the technically defensible claim that the settings keep overhead low.

## Review Notes
The Go toolchain is not installed in this workspace, so I could not compile the snippets locally. The code changes were checked against the current official OpenTelemetry Go API documentation instead. The campaign-level metric attributes are useful for dashboards but can create high-cardinality metric series in large RTB deployments; production systems should validate that cardinality against backend limits and cost targets.
