# Validation Summary: How to Deploy Ambassador Edge Stack with Rate Limiting and Circuit Breaking

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ambassador Edge Stack
- Envoy Proxy
- Envoy Rate Limit Service
- Kubernetes
- Helm
- Redis
- Prometheus
- Grafana

## Sources Consulted
- Ambassador Edge Stack basic rate limiting documentation: https://www.getambassador.io/docs/edge-stack/latest/topics/using/rate-limits
- Ambassador Edge Stack rate limit service documentation: https://www.getambassador.io/docs/edge-stack/latest/topics/running/services/rate-limit-service
- Ambassador Edge Stack circuit breakers documentation: https://www.getambassador.io/docs/edge-stack/latest/topics/using/circuit-breakers
- Ambassador Edge Stack retries documentation: https://www.getambassador.io/docs/edge-stack/latest/topics/using/retries
- Ambassador Edge Stack timeouts documentation: https://www.getambassador.io/docs/edge-stack/latest/topics/using/timeouts
- Ambassador Edge Stack 3.9.0 CRD manifest: https://app.getambassador.io/yaml/edge-stack/3.9.0/aes-crds.yaml
- Envoy outlier detection documentation: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/outlier
- Envoy outlier detection API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/outlier_detection.proto
- Envoy circuit breaker statistics documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats
- Envoy Rate Limit Service repository: https://github.com/envoyproxy/ratelimit
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run

## Issues Found
- The Helm install command used the old `enableAES` value. Updated it to pass `licenseKey.value=$LICENSE_KEY`, which current Ambassador Edge Stack Helm documentation requires when a license secret has not already been applied.
- The Envoy Rate Limit Service deployment omitted `RUNTIME_APPDIRECTORY=config`, so the mounted ConfigMap path would not match the documented runtime configuration layout. Added the missing environment variable.
- The `RateLimitService` did not set a domain even though the external rate limit service config used `domain: ambassador`. Added `domain: ambassador` so Ambassador sends descriptors to the matching domain.
- The per-user rate-limit label used an invalid `user_id: header` label specifier. Replaced it with the supported `request_headers` specifier using `header_name: X-User-ID` and `key: user_id`.
- The circuit-breaking section referred to a non-existent `CircuitBreaker` resource. Reworded it to describe the supported `circuit_breakers` attribute on `Module` and `Mapping`.
- The `outlier_detection` examples used YAML objects, but Ambassador Edge Stack 3.9.0 declares `Mapping.spec.outlier_detection` as a string field. Converted those examples to block-scalar strings containing Envoy outlier detection configuration.
- The outlier detection comments described a circuit opening after failures. Updated the text to describe endpoint ejection, which matches Envoy outlier detection behavior.
- The load balancer lookup only handled `.ip`, which fails on cloud providers that return a hostname. Updated the JSONPath to include either IP or hostname.
- The nginx failure test only converted 404 responses to 500 and could still return 200 for the mapped path. Replaced it with an nginx server config that returns 500 for all requests.
- The PromQL examples used `rate()` on Envoy gauge metrics for circuit breaker state and active outlier ejections. Changed those examples to `max_over_time()` queries.

## Review Notes
The post remains version-sensitive because it pins Ambassador Edge Stack CRDs to 3.9.0 while current public documentation and chart metadata are newer. The corrected snippets match the pinned CRD schema where checked, but future updates should consider refreshing the whole installation section to a single current Edge Stack release.
