# Validation Summary: Choose One Retry Owner Across SDK, Mesh, and Application

## Status
validated

## Post Type
Technical architecture and reliability guide

## Technologies Covered
- Application- and SDK-level retry policies
- Service meshes and proxy retries
- Istio `VirtualService`, `HTTPRetry`, and `MeshConfig`
- Envoy retry behavior, telemetry, and attempt headers
- gRPC configured and transparent retries
- gRPC service config, retry throttling, deadlines, cancellation, and OpenTelemetry metrics
- HTTP idempotency, conditional requests, redirects, and `Retry-After`
- AWS SDK retry behavior
- Retry observability, budgets, and fault injection

## Sources Consulted
- [Istio traffic management and application interaction](https://istio.io/latest/docs/concepts/traffic-management/#working-with-your-applications)
- [Istio Virtual Service and HTTPRetry reference](https://istio.io/latest/docs/reference/config/networking/virtual-service/#HTTPRetry)
- [Istio MeshConfig `defaultHttpRetryPolicy` and proxy headers](https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/#MeshConfig)
- [Istio Envoy statistics configuration](https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/)
- [Envoy router retry and attempt-count documentation](https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/router_filter.html)
- [gRPC retry guide](https://grpc.io/docs/guides/retry/)
- [gRPC A6 client retry design](https://github.com/grpc/proposal/blob/master/A6-client-retries.md)
- [gRPC OpenTelemetry metrics guide](https://grpc.io/docs/guides/opentelemetry-metrics/)
- [gRPC deadlines guide](https://grpc.io/docs/guides/deadlines/)
- [gRPC cancellation guide](https://grpc.io/docs/guides/cancellation/)
- [AWS SDK retry behavior](https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html)
- [RFC 9110: HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html)
- [Google SRE: Addressing Cascading Failures](https://sre.google/sre-book/addressing-cascading-failures/)
- [AWS Builders' Library: Timeouts, retries and backoff with jitter](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/)
- [OpenTelemetry HTTP span conventions for retries and redirects](https://opentelemetry.io/docs/specs/semconv/http/http-spans/#http-request-retries-and-redirects)
- [Prometheus metric and label naming guidance](https://prometheus.io/docs/practices/naming/)

## Issues Found
1. **gRPC per-attempt metrics were presented without their instrumentation requirement.** The post said that gRPC provides per-attempt metrics. Updated the sentence to state that gRPC's OpenTelemetry integration exposes those metrics when enabled, because they are an instrumentation capability rather than metrics that appear unconditionally.
2. **Retry throttling was conflated with the per-method gRPC retry policy.** The `retryPolicy` object controls total configured attempts, retryable status codes, and exponential backoff, while `retryThrottling` is separate service configuration scoped by server name. Updated the explanation to distinguish the two.
3. **The configured gRPC attempt cap did not account for transparent retries.** gRPC's `maxAttempts` includes the original configured attempt, but transparent retries do not count toward that limit. Added a budgeting caveat explaining that up to one additional on-wire RPC attempt may need to be accounted for separately when enforcing an exact attempt cap, or retry support must be disabled at channel creation if transparent recovery is unacceptable.

## Review Notes
- The Istio YAML is syntactically valid and uses the current stable `networking.istio.io/v1` API. `attempts: 2` permits at most one initial request plus two retries, and the route and per-try timeouts may reduce the number actually sent.
- Current Istio documentation applies a mesh-wide default retry policy when a route omits `retries`; `MeshConfig.defaultHttpRetryPolicy` can override or disable it. This is version-sensitive, so the post correctly tells readers to inspect their deployed version and generated Envoy configuration.
- The short host name `inventory` is valid and resolves relative to the `VirtualService` namespace, although Istio recommends fully qualified service names to avoid namespace ambiguity.
- gRPC sets no deadline by default, and automatic downstream deadline or cancellation propagation varies by implementation. The post presents propagation as an invariant to enforce rather than an automatic guarantee, so no correction was necessary.
- If the rollout tests use Istio's own `VirtualService` fault injection, Istio does not enable retries or timeouts on that same client-side route while fault injection is active. A different injection point or test mechanism is needed to exercise the configured retry policy.
- As of the validation date, AWS's linked retry guide describes a 2026 behavior transition that still requires `AWS_NEW_RETRIES_2026=true` until the planned rollout completes. The post makes no claim about a specific AWS default, so no change was required.
- All external links in the post resolved successfully during validation.
