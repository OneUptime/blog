# How to Use Envoy Request Hedging for Latency Optimization

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Envoy, Performance, Latency, Load Balancing, Reliability

Description: Learn how to implement Envoy request hedging to reduce tail latency by issuing duplicate requests to multiple backends and using the first successful response.

---

Request hedging is a powerful technique for reducing tail latency in distributed systems. Instead of waiting for a slow backend instance to respond, Envoy can issue duplicate requests to multiple instances after a configurable delay. The first successful response wins, and the others are cancelled. This approach trades a modest increase in backend load for significant improvements in p99 and p999 latency.

Hedging differs from retries in an important way: retries wait for a request to fail before trying again, while hedging proactively sends duplicate requests before the first one completes. This preemptive approach helps when you have high variance in response times, often caused by garbage collection pauses, CPU contention, or network hiccups that make some requests much slower than average.

## Understanding Request Hedging

When Envoy hedges a request, it follows this pattern:

1. Send the initial request to a backend instance
2. Wait for a configured hedging delay (hedge_on_per_try_timeout)
3. If no response arrives within the delay, send a duplicate request to a different instance
4. Use whichever response arrives first
5. Cancel the remaining in-flight request

The key is setting the hedging delay appropriately. Too short, and you waste backend resources with unnecessary duplicate requests. Too long, and hedging provides no benefit. The sweet spot is typically around the 95th percentile of your normal response time.

## Basic Hedging Configuration

Let's configure Envoy to hedge requests to a backend service. The configuration lives in the route configuration:

```yaml
# envoy-hedging-config.yaml
static_resources:
  listeners:
  - name: listener_0
    address:
      socket_address:
        address: 0.0.0.0
        port_value: 8080
    filter_chains:
    - filters:
      - name: envoy.filters.network.http_connection_manager
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
          stat_prefix: ingress_http
          codec_type: AUTO
          route_config:
            name: local_route
            virtual_hosts:
            - name: backend
              domains: ["*"]
              routes:
              - match:
                  prefix: "/api"
                route:
                  cluster: backend_service
                  # Hedging configuration
                  hedge_policy:
                    # Hedge on per-try timeout
                    hedge_on_per_try_timeout: true
                    # Initial hedge delay
                    initial_requests: 1
                    additional_request_chance:
                      numerator: 30
                      denominator: 100  # 30% chance to hedge
                  # Per-try timeout that triggers hedging
                  timeout: 3s
                  retry_policy:
                    retry_on: "5xx,reset,connect-failure,refused-stream"
                    per_try_timeout: 1s
                    num_retries: 2
          http_filters:
          - name: envoy.filters.http.router
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router

  clusters:
  - name: backend_service
    type: STRICT_DNS
    lb_policy: ROUND_ROBIN
    load_assignment:
      cluster_name: backend_service
      endpoints:
      - lb_endpoints:
        - endpoint:
            address:
              socket_address:
                address: backend-1
                port_value: 8000
        - endpoint:
            address:
              socket_address:
                address: backend-2
                port_value: 8000
        - endpoint:
            address:
              socket_address:
                address: backend-3
                port_value: 8000
    # Connection settings
    connect_timeout: 0.5s
    common_http_protocol_options:
      idle_timeout: 30s
    http2_protocol_options:
      max_concurrent_streams: 100

admin:
  address:
    socket_address:
      address: 0.0.0.0
      port_value: 9901
```

In this configuration:
- `hedge_on_per_try_timeout: true` enables hedging when per-try timeout is about to expire
- `initial_requests: 1` means we start with one request
- `additional_request_chance` controls how aggressively we hedge (30% chance)
- `per_try_timeout: 1s` is the delay before issuing a hedged request

## Advanced Hedging Strategies

Let's explore more sophisticated hedging configurations. You can combine hedging with different retry policies and timeout strategies:

```yaml
routes:
- match:
    prefix: "/api/critical"
  route:
    cluster: critical_service
    # Aggressive hedging for critical endpoints
    hedge_policy:
      hedge_on_per_try_timeout: true
      initial_requests: 2  # Start with 2 parallel requests
      additional_request_chance:
        numerator: 100
        denominator: 100  # Always hedge (100% chance)
    timeout: 2s
    retry_policy:
      retry_on: "5xx,reset,connect-failure"
      per_try_timeout: 500ms
      num_retries: 3

- match:
    prefix: "/api/batch"
  route:
    cluster: batch_service
    # Conservative hedging for batch operations
    hedge_policy:
      hedge_on_per_try_timeout: true
      initial_requests: 1
      additional_request_chance:
        numerator: 10
        denominator: 100  # Only 10% hedge rate
    timeout: 30s
    retry_policy:
      per_try_timeout: 10s
      num_retries: 1

- match:
    prefix: "/api/readonly"
  route:
    cluster: readonly_service
    # Medium hedging for read-only operations
    hedge_policy:
      hedge_on_per_try_timeout: true
      initial_requests: 1
      additional_request_chance:
        numerator: 50
        denominator: 100  # 50% hedge rate
    timeout: 5s
    retry_policy:
      retry_on: "5xx,reset,retriable-4xx"
      per_try_timeout: 1.5s
      num_retries: 2
      retriable_status_codes: [429, 503]
```

## Hedging with Request Priorities

Combine hedging with priority routing to ensure hedged requests don't overwhelm your backends:

```yaml
clusters:
- name: backend_service
  type: STRICT_DNS
  lb_policy: ROUND_ROBIN
  # Configure priority levels
  common_lb_config:
    healthy_panic_threshold:
      value: 50.0
    # Zone aware routing with priorities
    zone_aware_lb_config:
      routing_enabled:
        value: 100
      min_cluster_size: 3
  load_assignment:
    cluster_name: backend_service
    endpoints:
    # Priority 0 (highest priority)
    - priority: 0
      lb_endpoints:
      - endpoint:
          address:
            socket_address:
              address: backend-primary-1
              port_value: 8000
      - endpoint:
          address:
            socket_address:
              address: backend-primary-2
              port_value: 8000
    # Priority 1 (fallback for hedged requests)
    - priority: 1
      lb_endpoints:
      - endpoint:
          address:
            socket_address:
              address: backend-secondary-1
              port_value: 8000
      - endpoint:
          address:
            socket_address:
              address: backend-secondary-2
              port_value: 8000
```

## Monitoring Hedging Performance

Track hedging effectiveness using Envoy's built-in metrics:

```bash
# View hedge-related statistics
curl -s http://localhost:9901/stats | grep -E 'upstream_rq_retry|hedge'

# Key metrics to monitor:
# - cluster.backend_service.upstream_rq_retry_success: successful hedges
# - cluster.backend_service.upstream_rq_retry_overflow: hedge budget exhausted
# - cluster.backend_service.upstream_rq_timeout: requests that timed out
# - cluster.backend_service.upstream_rq_per_try_timeout: per-try timeouts
```

Create a Prometheus query to calculate hedge efficiency:

```promql
# Hedge success rate
rate(envoy_cluster_upstream_rq_retry_success{cluster="backend_service"}[5m])
/
rate(envoy_cluster_upstream_rq_retry{cluster="backend_service"}[5m])

# Additional load from hedging
(
  rate(envoy_cluster_upstream_rq_total{cluster="backend_service"}[5m])
  -
  rate(envoy_http_downstream_rq_completed{cluster="backend_service"}[5m])
)
/
rate(envoy_http_downstream_rq_completed{cluster="backend_service"}[5m])
```

## Implementing Hedging Headers

Pass hedging metadata to backends so they can identify and potentially prioritize hedged requests:

```yaml
routes:
- match:
    prefix: "/api"
  route:
    cluster: backend_service
    hedge_policy:
      hedge_on_per_try_timeout: true
      initial_requests: 1
      additional_request_chance:
        numerator: 30
        denominator: 100
    request_headers_to_add:
    # Add header indicating this is a hedged request
    - header:
        key: "X-Request-Attempt"
        value: "%UPSTREAM_REQUEST_ATTEMPT_COUNT%"
    - header:
        key: "X-Envoy-Expected-Rq-Timeout-Ms"
        value: "%RESP_FLAGS%"
```

Backend services can use these headers to implement strategies like:

```python
# Example Python backend handling hedged requests
from flask import Flask, request
import time

app = Flask(__name__)

@app.route('/api/data')
def get_data():
    attempt_count = request.headers.get('X-Request-Attempt', '1')

    # If this is a hedged request (attempt > 1), use a faster path
    if int(attempt_count) > 1:
        # Use cache, skip expensive operations, etc.
        return get_cached_data()
    else:
        # Normal processing path
        return get_fresh_data()

def get_cached_data():
    # Fast path using cache
    return {"data": "cached_value", "hedged": True}

def get_fresh_data():
    # Slower path with database queries
    result = db.query("SELECT * FROM data")
    return {"data": result, "hedged": False}
```

## Circuit Breaking with Hedging

Combine hedging with circuit breaking to protect backends from hedge-induced load spikes:

```yaml
clusters:
- name: backend_service
  type: STRICT_DNS
  lb_policy: ROUND_ROBIN
  # Circuit breaker thresholds
  circuit_breakers:
    thresholds:
    - priority: DEFAULT
      max_connections: 1000
      max_pending_requests: 1000
      max_requests: 1000
      max_retries: 3
      # Track hedged requests in retry budget
      retry_budget:
        budget_percent:
          value: 25.0  # Allow 25% additional load from hedges
        min_retry_concurrency: 3
  load_assignment:
    cluster_name: backend_service
    endpoints:
    - lb_endpoints:
      - endpoint:
          address:
            socket_address:
              address: backend-1
              port_value: 8000
```

## Testing Hedging Behavior

Simulate slow backends to verify hedging works correctly:

```python
# test_backend.py - Simulates variable latency
from flask import Flask
import random
import time

app = Flask(__name__)

@app.route('/api/test')
def test_endpoint():
    # Simulate variable latency (some requests are very slow)
    latency = random.choices(
        [0.1, 0.2, 2.0],  # 100ms, 200ms, or 2000ms
        weights=[70, 20, 10]  # 70% fast, 20% medium, 10% slow
    )[0]

    time.sleep(latency)
    return {
        "message": "success",
        "latency": latency
    }

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000)
```

Run load tests to measure hedging impact:

```bash
# Install wrk for load testing
apt-get install wrk

# Test without hedging (baseline)
wrk -t 4 -c 100 -d 30s --latency http://localhost:8080/api/test

# Analyze p99 and p999 latencies
# Then enable hedging in Envoy config and test again
# You should see significant improvements in tail latency
```

## Best Practices for Hedging

1. **Start conservative**: Begin with low hedge rates (10-20%) and increase based on monitoring
2. **Idempotent only**: Only hedge GET requests and idempotent operations
3. **Monitor backend load**: Ensure hedging doesn't push backends into overload
4. **Set appropriate timeouts**: Hedge delay should be around p95 response time
5. **Use circuit breakers**: Protect backends from hedge-induced load spikes
6. **Track effectiveness**: Monitor whether hedging actually improves latency

Request hedging is particularly effective for read-heavy workloads with high variance in response times. When configured properly, it can dramatically reduce tail latency with only a modest increase in backend load, improving user experience for the slowest requests that often matter most.
