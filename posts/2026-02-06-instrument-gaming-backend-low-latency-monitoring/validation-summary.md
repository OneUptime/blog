# Validation Summary: How to Instrument a Gaming Backend for Low-Latency Monitoring

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Go SDK
- OpenTelemetry metrics and tracing
- OpenTelemetry Collector
- Tail sampling processor
- OTLP gRPC exporters
- Prometheus alerting and PromQL
- Go
- YAML

## Sources Consulted
- OpenTelemetry Go documentation: https://opentelemetry.io/docs/languages/go/
- OpenTelemetry Go metric API reference: https://pkg.go.dev/go.opentelemetry.io/otel/metric
- OpenTelemetry Go trace SDK reference: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/trace
- OpenTelemetry Go semantic conventions reference: https://pkg.go.dev/go.opentelemetry.io/otel/semconv/v1.28.0
- OpenTelemetry Collector tail sampling processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/tailsamplingprocessor
- OpenTelemetry Prometheus exporter specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/prometheus/
- OpenTelemetry Prometheus/OpenMetrics compatibility specification: https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/

## Issues Found
- The SDK setup used the older `semconv.DeploymentEnvironment` helper from `semconv/v1.24.0`. Updated the snippet to `semconv/v1.28.0` and `semconv.DeploymentEnvironmentName("production")`, which matches current generated semantic convention helpers.
- The SDK sampling comment and explanation claimed 10% head sampling could still keep 100% of errors. Clarified that SDK-dropped traces cannot be recovered by Collector tail sampling, and that the batch span processor drops spans by default when the queue fills instead of blocking.
- The game loop called an `Int64UpDownCounter` a gauge. Updated the comment to describe the actual instrument type.
- The matchmaking snippet indexed `rankedCandidates[0]` without checking for an empty result, which could panic. Added an empty-candidate guard and imported `fmt` in that snippet.
- The inventory alert referenced `inventory_transaction_failures_total`, but the inventory snippet did not emit that metric. Added an OpenTelemetry counter and incremented it on transaction failures.
- The session metrics snippet created metric instruments as local variables and recreated the RTT histogram in `RecordPlayerRTT`, losing the configured bucket boundaries. Moved the instruments to package scope and reused `playerRTT`.
- The Collector tail sampling config used `otel.library.name`, which is no longer the right selector for service-level sampling. Updated it to use the `service.name` resource attribute.
- The PromQL examples for millisecond histograms omitted the default Prometheus unit suffix added by OpenTelemetry translation. Updated them to `game_player_rtt_milliseconds_bucket` and `matchmaking_duration_milliseconds_bucket`.

## Review Notes
The examples still use domain placeholders such as `processTick`, `Player`, `Transaction`, and `serverRegion`, so they are illustrative snippets rather than standalone compilable programs. A local Go toolchain was not available in this environment, so API validation was performed against official OpenTelemetry documentation and package references rather than by compiling temporary snippets.
