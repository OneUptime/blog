# Validation Summary: Handle gRPC Retry Pushback Without Fighting Client Backoff

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- gRPC client-side retries and transparent retries
- `grpc-retry-pushback-ms` response metadata
- Exponential backoff and retry attempt limits
- gRPC Service Config and JSON retry policies
- RPC deadlines and retry throttling
- gRPC OpenTelemetry retry metrics
- Service-mesh and proxy retry coordination

## Sources Consulted
- gRPC retry guide: https://grpc.io/docs/guides/retry/
- gRPC client retry design, gRFC A6: https://github.com/grpc/proposal/blob/master/A6-client-retries.md
- gRPC Service Config guide: https://grpc.io/docs/guides/service-config/
- Official Service Config schema: https://github.com/grpc/grpc-proto/blob/master/grpc/service_config/service_config.proto
- gRPC deadlines guide: https://grpc.io/docs/guides/deadlines/
- gRPC status codes guide: https://grpc.io/docs/guides/status-codes/
- gRPC OpenTelemetry metrics guide: https://grpc.io/docs/guides/opentelemetry-metrics/
- gRFC A96, OpenTelemetry metrics for retries: https://github.com/grpc/proposal/blob/master/A96-retry-otel-stats.md
- `grpc-go` retry and pushback implementation: https://github.com/grpc/grpc-go/blob/master/stream.go
- `grpc-java` retry and pushback implementation: https://github.com/grpc/grpc-java/blob/master/core/src/main/java/io/grpc/internal/RetriableStream.java
- `grpc-java` retry and pushback tests: https://github.com/grpc/grpc-java/blob/master/core/src/test/java/io/grpc/internal/RetriableStreamTest.java
- Envoy router retry documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/router_filter.html
- Istio traffic-management documentation: https://istio.io/latest/docs/concepts/traffic-management/

## Issues Found
- The pushback value grammar was underspecified as merely a signed decimal integer. Updated it to A6's exact ASCII-encoded signed 32-bit format with no unnecessary leading zeros.
- Retry eligibility was presented as a chronological processing order, even though negative or invalid pushback can affect retry-throttling accounting when no new attempt is sent. Recast the list as non-ordered constraints for sending another policy attempt.
- The deadline checks implied that clients perform an unspecified "enough time" pre-check. Changed the condition to an unexpired overall deadline and clarified that a deadline expiring during the pushback wait prevents another attempt without extending the call.
- The status-code gate was presented as portable across implementations. Added the current `grpc-go`/`grpc-java` precedence difference and their acceptance of some integer spellings outside A6's grammar, so readers know to send conforming metadata and integration-test the deployed client.
- Service Config delivery was described as resolver-only. Corrected it to cover both resolver-supplied configs and programmatically configured client defaults.
- Retry throttling was described as decrementing tokens for every failed RPC. Corrected it to qualifying retryable or hedging non-fatal failures and no-retry pushback, and stated the exact suppression threshold of `token_count <= maxTokens / 2`.
- The backoff summary incorrectly said normal backoff applies when no valid pushback is present. Invalid pushback stops retries, so this now says backoff applies only when no pushback metadata is present.
- The OpenTelemetry retry-delay metric was described as cumulative retry delay. Corrected it to the instrument's defined measurement: total time with no active attempt during the client call.
- The integration-test guidance called for exact wall-clock timing and left several cases without statuses that isolate the behavior under test. Added a defined timing tolerance, made the non-retryable test explicitly non-negative, and paired negative, malformed, and post-header failures with `UNAVAILABLE` where appropriate.

## Review Notes
The Service Config JSON is syntactically valid and matches the official schema. `maxAttempts: 4` includes the original attempt; the backoff durations, multiplier, method selector, and nonempty `UNAVAILABLE` status list are valid.

Transparent retries do not count toward configured `maxAttempts`. The post consistently discusses policy attempts, so no additional correction was required.

The experimental `grpc.client.call.retry_delay` instrument measures all time with no active attempt and can include internal retry overhead; it does not isolate server-pushback delay. Negative or invalid pushback stops, throttling suppression, deadline-during-pushback outcomes, and committed state may require implementation-specific hooks or custom instrumentation.

All four links in the post's Official Documentation section resolved successfully during validation. Language and release support still varies, so the integration-test recommendation remains important.
