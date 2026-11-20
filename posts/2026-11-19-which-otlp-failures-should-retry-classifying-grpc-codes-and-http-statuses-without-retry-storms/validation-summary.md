# Validation Summary: Avoid OTLP Retry Storms: Classify gRPC Codes and HTTP Statuses

## Status
validated

## Post Type
Technical guide with an OpenTelemetry Collector YAML configuration example and a failure-testing checklist.

## Technologies Covered
- OpenTelemetry Protocol (OTLP) over HTTP and gRPC
- OpenTelemetry Collector OTLP HTTP exporter
- Exporter helper retries, timeouts, queues, and persistent storage
- HTTP Retry-After and gRPC RetryInfo backpressure
- YAML configuration

## Sources Consulted
- [OTLP specification](https://opentelemetry.io/docs/specs/otlp/) — transport retry classifications, partial success, throttling, connection failures, and acknowledgement scope.
- [Collector exporter helper documentation](https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/exporterhelper/README.md) — retry settings, queue sizing, consumers, timeouts, and persistent queue behavior.
- [OTLP HTTP exporter documentation](https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlphttpexporter/README.md) — component name, deprecated alias, endpoint paths, and HTTP timeout.
- [OTLP HTTP exporter metadata](https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlphttpexporter/metadata.yaml) — current otlp_http type and deprecated otlphttp alias.
- [OTLP HTTP exporter configuration](https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlphttpexporter/config.go) — configuration fields and endpoint validation.
- [OTLP HTTP implementation](https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlphttpexporter/otlp.go) — permanent errors, retryable statuses, Retry-After parsing, and partial-success handling.
- [Collector retry sender implementation](https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/exporterhelper/internal/retry_sender.go) — backoff randomization, throttling-delay cap, permanent-error termination, and elapsed-time checks.
- [Author GitHub profile](https://github.com/nawazdhandala) — verified the author link resolves to the intended profile.

## Issues Found
- The backpressure guidance implied that the example Collector configuration would honor any server-requested delay in full. Current upstream retry_sender.go caps the throttle delay at max_interval before combining it with exponential backoff. Added a version-specific caveat and clarified that delay guidance applies to retryable failures. With the example's 20-second max_interval, a longer server delay can be shortened.
- The retry-budget introduction could be read as a strict overall delivery deadline. The helper checks whether the next retry can start within max_elapsed_time; it does not interrupt an in-flight attempt at that limit. Clarified that queue waiting is excluded and an attempt can finish after the retry budget expires.

## Review Notes
- Confirmed the HTTP retry set and all gRPC classifications, including conditional RESOURCE_EXHAUSTED handling. The partial-success guidance is correct.
- Reviewed YAML indentation, scalar types, duration values, field names, and endpoint semantics against upstream documentation and configuration source. The snippet is an exporter fragment and correctly instructs readers to attach it to an existing pipeline; it is not a standalone Collector configuration. The example endpoint requires replacement.
- Confirmed request-based queue sizing is the default, item and byte sizing are available upstream, consumer count controls dequeue concurrency, and persistent queues require a storage extension. The 1,000 / 20 = 50 second capacity estimate is correct under the stated no-drain assumption.
- The proposed HTTP failure matrix agrees with the implementation. A partial-rejection test must return a valid OTLP response body and matching content type. No live Collector or controlled-backend test was run; validation was based on official documentation, source inspection, and static configuration review.
- Upstream main is mutable and can differ from installed distributions. The post appropriately advises checking the deployed release. Current upstream retains otlphttp as a deprecated alias; the example uses the current name.
- All original external links were checked and point to the intended resources. There are no terminal commands or application code samples to execute.
