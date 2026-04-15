# Validation Summary: How to Configure Concurrency and Rate Limiting in Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr CLI (`dapr run`)
- Dapr Kubernetes annotations
- Dapr HTTP rate limit middleware (`middleware.http.ratelimit`)
- Dapr Configuration resource (`httpPipeline`)
- Prometheus metrics for Dapr
- hey (HTTP load testing tool)

## Sources Consulted
- Dapr documentation — App max concurrency: https://docs.dapr.io/operations/configuration/increase-request-size/
- Dapr documentation — Rate limit middleware: https://docs.dapr.io/reference/components-reference/supported-middleware/middleware-rate-limit/
- Dapr documentation — Configuration overview (httpPipeline): https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr documentation — Service invocation API: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr source code — HTTP monitoring metrics (`pkg/diagnostics/http_monitoring.go`)
- Dapr GitHub issues #496, #699 — app-max-concurrency behavior discussion

## Issues Found

### 1. Incorrect description of `app-max-concurrency` behavior
- **What was wrong:** The post stated Dapr "queues or rejects" requests when the concurrency limit is reached. In reality, Dapr only queues (blocks) requests until a slot becomes available — it does not reject them with an error.
- **What was changed:** Updated to "Dapr queues additional requests until a slot becomes available."
- **Why:** The Dapr source code and GitHub issue discussions confirm that the default behavior is blocking/queuing, not rejection. There was a feature request to optionally return HTTP 429 instead of blocking, but the default and current behavior is to hold requests.

### 2. Incorrect Prometheus metric label name
- **What was wrong:** The post used `status_code=429` as the Prometheus label. The actual label name in Dapr's metrics is `status`, not `status_code`.
- **What was changed:** Changed `status_code="429"` to `status="429"` in both the inline text and the query example.
- **Why:** Dapr's HTTP monitoring code defines the tag key as `status` (see `httpStatusCodeKey = tag.MustNewKey("status")` in the source).

### 3. Non-existent `dapr-metrics` Kubernetes service
- **What was wrong:** The post suggested running `kubectl port-forward svc/dapr-metrics 9090:9090 -n dapr-system`. There is no `dapr-metrics` service in a standard Dapr installation. Metrics are exposed by each Dapr sidecar directly on port 9090.
- **What was changed:** Changed to `kubectl port-forward <your-app-pod> 9090:9090` to correctly reflect that you port-forward to the specific application pod whose sidecar metrics you want to inspect.
- **Why:** The standard Dapr control plane services are `dapr-operator`, `dapr-placement`, `dapr-sidecar-injector`, and `dapr-sentry`. Prometheus scrapes metrics from individual sidecar pods, not from a centralized metrics service.

## Review Notes
- The rate limit middleware returns HTTP 429 when the limit is exceeded, which is correctly described. However, `app-max-concurrency` does not return 429 — it queues. The testing section could be clearer that 429 responses come specifically from the rate limit middleware, not from `app-max-concurrency`. This is a minor clarity issue, not a factual error, so it was left as-is.
- Both `app-max-concurrency` and the rate limit middleware operate within the Dapr sidecar. The post's description that the rate limiter applies "at the sidecar level before requests reach the app" while `app-max-concurrency` "limits in-flight requests to the app process itself" is directionally correct — the middleware pipeline runs first, then concurrency gating applies at the forwarding step.
