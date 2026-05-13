# Validation Summary: How to Configure Cilium API Rate Limiting

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- kubectl
- Prometheus

## Sources Consulted
- Cilium Helm Reference for `apiRateLimit` and `k8sClientRateLimit`: https://docs.cilium.io/en/latest/helm-reference/
- Cilium API Rate Limiting documentation: https://docs.cilium.io/en/v1.11/configuration/api-rate-limiting/
- Cilium agent command reference for `--api-rate-limit`, `--k8s-client-qps`, and `--k8s-client-burst`: https://docs.cilium.io/en/latest/cmdref/cilium-agent/
- Cilium metrics documentation for API limiter metrics: https://docs.cilium.io/en/latest/observability/metrics/
- Cilium L2 announcements documentation showing `k8sClientRateLimit` Helm values and `k8s-client-qps` / `k8s-client-burst` ConfigMap keys: https://docs.cilium.io/en/stable/network/l2-announcements/
- Cilium source test coverage for `api-rate-limit` JSON string parsing: https://github.com/cilium/cilium/blob/main/daemon/restapi/api_limits_test.go

## Issues Found
- The post conflated Kubernetes API server client rate limiting with the Cilium agent API limiter. Updated the introduction and conclusion to distinguish `k8sClientRateLimit` from `api-rate-limit`.
- The prerequisites listed Cilium 1.10+, but the cited Cilium API rate limiting documentation is for Cilium 1.11. Updated the prerequisite to Cilium 1.11+.
- The ConfigMap keys `k8s-api-qps` and `k8s-api-burst` were incorrect. Replaced them with the documented `k8s-client-qps` and `k8s-client-burst` keys.
- The Helm examples used non-existent `apiRateLimit.k8s-agent.qps` and `apiRateLimit.k8s-agent.burst` values. Replaced them with the documented `k8sClientRateLimit.qps` and `k8sClientRateLimit.burst` values.
- The Helm examples included unrelated `k8s.requireIPv4PodCIDR=true` settings. Removed them because they are not required for rate limiting and are not the documented rate-limit values.
- The per-operation `api-rate-limit` ConfigMap used invalid operation names such as `endpoint-update` and `nodes-get`, and used object values where Cilium expects parameter strings. Replaced the example with documented endpoint operation names and the accepted JSON string map format.
- The monitoring example used `cilium_api_limiter_wait_duration_seconds_count`, but Cilium documents `cilium_api_limiter_wait_duration_seconds` with a `value` label rather than a `_count` series. Replaced it with `cilium_api_limiter_wait_duration_seconds{value="mean"}`.
- The log grep pattern was too generic for the relevant throttling messages. Updated it to look for client-side throttling and rate limiter messages.

## Review Notes
The post now covers two related but distinct controls: Kubernetes API client rate limiting for API server load, and Cilium agent API rate limiting for endpoint API operations. Future improvements could add a note that tuning values should be workload-specific rather than based only on node count.
