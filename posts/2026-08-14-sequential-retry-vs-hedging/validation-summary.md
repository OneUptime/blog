# Validation Summary: Choose Sequential Retries or Hedged Requests for Tail Latency

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Sequential retries
- Hedged requests
- Tail-latency mitigation
- gRPC Service Config
- gRPC deadlines and cancellation
- Exponential backoff, jitter, and server pushback
- Retry throttling and extra-attempt budgets
- Admission control and load shedding
- gRPC OpenTelemetry metrics

## Sources Consulted
- gRPC Request Hedging guide: https://grpc.io/docs/guides/request-hedging/
- gRPC Retry guide: https://grpc.io/docs/guides/retry/
- gRPC Service Config guide: https://grpc.io/docs/guides/service-config/
- gRPC OpenTelemetry Metrics guide: https://grpc.io/docs/guides/opentelemetry-metrics/
- gRPC Cancellation guide: https://grpc.io/docs/guides/cancellation/
- gRPC core concepts and RPC lifecycle: https://grpc.io/docs/what-is-grpc/core-concepts/
- gRFC A6, Client Retries: https://github.com/grpc/proposal/blob/master/A6-client-retries.md
- Canonical gRPC Service Config schema: https://github.com/grpc/grpc-proto/blob/master/grpc/service_config/service_config.proto
- Protocol Buffers ProtoJSON format: https://protobuf.dev/programming-guides/json/
- Google Research, The Tail at Scale: https://research.google/pubs/the-tail-at-scale/
- Google SRE, Addressing Cascading Failures: https://sre.google/sre-book/addressing-cascading-failures/

## Issues Found
- The post said that the resolver must deliver the gRPC service config. The official Service Config guide also permits applications to supply a service config programmatically, so the sentence now says that the client must receive it either through name resolution or programmatically.
- The retry-throttling discussion said that gRPC pauses retries or hedges as failures consume tokens. gRPC does not hold those extra attempts waiting for token recovery: at or below the threshold, new retry attempts and subsequent hedges are suppressed or canceled. The wording now also clarifies that retry throttling is optional and that only qualifying failures consume tokens.

## Review Notes
The Service Config example is valid JSON and matches the current schema. Its method selector, `maxAttempts`, `hedgingDelay`, and `nonFatalStatusCodes` fields are valid; `"0.050s"` is a valid ProtoJSON Duration and `"UNAVAILABLE"` is a valid gRPC status code. The official guide states that hedging `maxAttempts` values above five are treated as five, while gRFC A6 describes five as the default client-side maximum and allows implementations to expose an override.

Response headers commit a retryable RPC as stated in the post; exceeding a client's retry-buffer limit is another commit condition. Current gRPC OpenTelemetry documentation marks per-attempt instruments as stable and the per-call retry instruments, including `grpc.client.call.hedges`, as experimental. Measurements such as hedge win rate, latency saved, and work completed after cancellation may therefore require derived or custom application and backend telemetry.
