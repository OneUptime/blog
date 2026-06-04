# How to use Envoy retry policies for resilient communication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Envoy, Resilience, Retries

Description: Learn how to configure Envoy retry policies to handle transient failures and improve service reliability through intelligent retry strategies.

---

Retry policies make microservices more resilient by automatically retrying failed requests. However, naive retry strategies can amplify problems through retry storms. Envoy provides sophisticated retry policies with conditions, backoff strategies, and budget controls to retry effectively without overloading struggling services.

## Basic Retry Configuration

```yaml
routes:
- match:
    prefix: "/api"
  route:
    cluster: api_service
    retry_policy:
      retry_on: "5xx,reset,connect-failure,refused-stream"
      num_retries: 3
```

This retries requests up to 3 times for 5xx errors, connection resets, connection failures, and refused streams.

## Retry Conditions

Envoy supports various retry conditions:

```yaml
retry_policy:
  retry_on: "5xx,gateway-error,reset,connect-failure,refused-stream,retriable-4xx,retriable-status-codes"
  retriable_status_codes: [503, 429]
  num_retries: 3
```

Common conditions:
- 5xx: Any 5xx response
- gateway-error: 502, 503, 504
- reset: Connection reset
- connect-failure: Connection refused/timeout
- retriable-4xx: 409 only
- refused-stream: HTTP/2 REFUSED_STREAM

## Per-Try Timeout

Set a timeout for each retry attempt:

```yaml
retry_policy:
  retry_on: "5xx,reset"
  num_retries: 3
  per_try_timeout: 2s
```

Each attempt, including the initial attempt, gets 2 seconds. With 3 retries, there can be up to 4 attempts, subject to the route's overall timeout and any retry backoff.

## Retry Budgets

Prevent retry storms with retry budgets:

```yaml
clusters:
- name: api_service
  circuit_breakers:
    thresholds:
    - retry_budget:
        budget_percent:
          value: 25.0
        min_retry_concurrency: 10

routes:
- match:
    prefix: "/api"
  route:
    cluster: api_service
    retry_policy:
      retry_on: "5xx"
      num_retries: 3
```

The cluster-level retry budget limits concurrent retries as a percentage of active and pending requests, with a minimum retry concurrency.

## Retry Host Selection

Control which hosts receive retry attempts:

```yaml
retry_policy:
  retry_on: "5xx"
  num_retries: 3
  retry_host_predicate:
  - name: envoy.retry_host_predicates.previous_hosts
  - name: envoy.retry_host_predicates.omit_canary_hosts
  host_selection_retry_max_attempts: 5
```

This avoids retrying to the same host and skips canary hosts during retries.

## Exponential Backoff

Add delays between retries:

```yaml
retry_policy:
  retry_on: "5xx"
  num_retries: 3
  retry_back_off:
    base_interval: 0.1s
    max_interval: 10s
```

Envoy uses fully jittered exponential backoff. With a 100ms base interval, the first retry is delayed by a random value below 100ms, later retries use a wider exponential range, and delays are capped at 10s.

## Hedged Requests

Send concurrent requests to multiple backends:

```yaml
routes:
- match:
    prefix: "/api"
  route:
    cluster: api_service
    retry_policy:
      retry_on: "5xx"
      num_retries: 3
      per_try_timeout: 2s
    hedge_policy:
      hedge_on_per_try_timeout: true
```

After the per-try timeout, Envoy sends a hedged retry without canceling the original request, leaving multiple upstream requests in flight.

## Retry Priority

Spread retries across upstream priorities:

```yaml
retry_policy:
  retry_on: "5xx"
  num_retries: 3
  retry_priority:
    name: envoy.retry_priorities.previous_priorities
    typed_config:
      "@type": type.googleapis.com/envoy.extensions.retry.priority.previous_priorities.v3.PreviousPrioritiesConfig
      update_frequency: 2
```

This retry priority plugin excludes previously attempted priorities as retries progress, helping distribute retry load across healthy priorities.

## Rate Limited Retries

Respect rate limit responses:

```yaml
retry_policy:
  retry_on: "retriable-status-codes"
  retriable_status_codes: [429]
  num_retries: 3
  per_try_timeout: 10s
  rate_limited_retry_back_off:
    reset_headers:
    - name: Retry-After
      format: SECONDS
    - name: X-RateLimit-Reset
      format: UNIX_TIMESTAMP
    max_interval: 60s
```

Retry 429 (Too Many Requests) and use rate-limit reset headers when present, falling back to exponential backoff otherwise.

## Method-Specific Retries

Only retry safe HTTP methods:

```yaml
routes:
- match:
    prefix: "/api"
    headers:
    - name: ":method"
      string_match:
        exact: "GET"
  route:
    cluster: api_service
    retry_policy:
      retry_on: "5xx"
      num_retries: 3

- match:
    prefix: "/api"
  route:
    cluster: api_service
```

Only GET requests are retried. POST, PUT, DELETE are not.

## Monitoring Retries

Track retry metrics:

```promql
# Retry attempts

envoy_cluster_upstream_rq_retry

# Retry success
envoy_cluster_upstream_rq_retry_success

# Retry overflow (circuit breaker tripped)
envoy_cluster_upstream_rq_retry_overflow
```

## Conclusion

Envoy retry policies provide intelligent failure handling through configurable conditions, timeouts, and backoff strategies. Configure retry budgets to prevent retry storms, use host selection predicates to avoid problematic backends, and add exponential backoff to give services time to recover. Monitor retry metrics to understand retry behavior and adjust policies based on observed patterns.
