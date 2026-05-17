# Validation Summary: How to Configure Retry Policies in Service Mesh on Talos

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes
- Istio (VirtualService, EnvoyFilter)
- Linkerd (ServiceProfile)
- Envoy (retry policy, circuit breakers)
- gRPC (retry status codes)

## Sources Consulted
- Istio VirtualService HTTPRetry reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/#HTTPRetry
- Envoy Router filter (retry policy / x-envoy-retry-on): https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/router_filter
- Envoy circuit breaker / RetryBudget proto: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/circuit_breaker.proto
- Linkerd ServiceProfile reference: https://linkerd.io/2-edge/reference/service-profiles/
- Linkerd retries and timeouts feature docs: https://linkerd.io/2/features/retries-and-timeouts/
- Linkerd retry budget design post: https://linkerd.io/2019/02/22/how-we-designed-retries-in-linkerd-2-2/

## Issues Found

1. **Istio "Controlling Retry Backoff" section misrepresented `retryRemoteLocalities`.** The original text said this field lets you "control the base interval" of backoff. That is incorrect — `retryRemoteLocalities` is a boolean that controls whether retries may be redirected to upstream instances in other localities (zones/regions); it has no effect on backoff intervals. Rewrote the surrounding prose to (a) keep the field example but describe what it actually does, and (b) note that the Istio `HTTPRetry` API does not expose backoff tuning and that customizing it requires an `EnvoyFilter`.

2. **Incorrect default backoff cap.** The post stated the default backoff is "capped at the per-try timeout." Envoy's actual default is base 25ms with the max interval at 10x the base (i.e., 250ms by default), independent of per-try timeout. Updated the sentence to reflect the actual default and to point readers to `EnvoyFilter` for tuning.

3. **Invalid Linkerd retry-budget annotation.** The post showed `config.linkerd.io/proxy-retry-budget-ttl` as a Deployment annotation; that annotation does not exist. Linkerd configures retry budgets via the `retryBudget` field on the `ServiceProfile` resource (`retryRatio`, `minRetriesPerSecond`, `ttl`). Replaced the snippet with a correct `ServiceProfile`-based example showing the documented defaults.

## Review Notes
- The `attempts` field in Istio is "number of retries on top of the original," so `attempts: 3` = up to 4 total attempts. The post's math (`0.5 ^ 4 = 6.25%` for 50% failure with `attempts: 3`) is consistent with that semantics, so no change needed.
- Other technical content is accurate: `retryOn` tokens (`5xx`, `reset`, `connect-failure`, `retriable-4xx`, `refused-stream`, `cancelled`, `deadline-exceeded`, `unavailable`), the note that `retriable-4xx` currently covers only HTTP 409, the Envoy `retry_budget` fields (`budget_percent`, `min_retry_concurrency`), Linkerd's default 20% retry ratio, the `linkerd viz routes` command, and the Envoy admin stats endpoint (`localhost:15000/stats`).
- Nothing in the post is Talos-Linux-specific — the configurations are standard Istio/Linkerd manifests that happen to run on a Talos cluster. That matches the framing in the introduction, so no change required.
