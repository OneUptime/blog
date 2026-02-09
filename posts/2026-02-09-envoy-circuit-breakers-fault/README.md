# How to implement Envoy circuit breakers for fault tolerance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Envoy, Resilience, Circuit Breakers

Description: Learn how to configure Envoy circuit breakers to prevent cascading failures and implement fault tolerance patterns in your microservices architecture.

---

Circuit breakers prevent cascading failures by limiting concurrent connections, pending requests, and retries to upstream services. When a service starts failing, circuit breakers stop sending requests before the entire system becomes overwhelmed. Envoy implements circuit breakers at the cluster level, providing fine-grained control over connection and request limits.

## Understanding Circuit Breaker Thresholds

Envoy circuit breakers operate on four key thresholds:

- max_connections: Maximum concurrent connections to upstream hosts
- max_pending_requests: Maximum requests queued waiting for connections
- max_requests: Maximum concurrent requests (HTTP/2 and HTTP/3)
- max_retries: Maximum concurrent retry requests

When any threshold is exceeded, requests are immediately rejected with a 503 response.

## Basic Circuit Breaker Configuration

```yaml
clusters:
- name: backend_service
  connect_timeout: 5s
  type: STRICT_DNS
  lb_policy: ROUND_ROBIN
  load_assignment:
    cluster_name: backend_service
    endpoints:
    - lb_endpoints:
      - endpoint:
          address:
            socket_address:
              address: backend.default.svc.cluster.local
              port_value: 8080
  circuit_breakers:
    thresholds:
    - priority: DEFAULT
      max_connections: 1000
      max_pending_requests: 1000
      max_requests: 1000
      max_retries: 3
```

These limits apply per Envoy instance, not globally.

## Per-Priority Circuit Breakers

Configure different limits for different traffic priorities:

```yaml
circuit_breakers:
  thresholds:
  - priority: DEFAULT
    max_connections: 1000
    max_pending_requests: 1000
    max_requests: 1000
    max_retries: 3
  - priority: HIGH
    max_connections: 2000
    max_pending_requests: 2000
    max_requests: 2000
    max_retries: 5
```

## Connection Pool Settings

Combine circuit breakers with connection pool configuration:

```yaml
clusters:
- name: backend_service
  connect_timeout: 5s
  type: STRICT_DNS
  lb_policy: ROUND_ROBIN
  load_assignment:
    cluster_name: backend_service
    endpoints:
    - lb_endpoints:
      - endpoint:
          address:
            socket_address:
              address: backend.default.svc.cluster.local
              port_value: 8080
  circuit_breakers:
    thresholds:
    - max_connections: 100
      max_pending_requests: 100
      max_requests: 100
      max_retries: 3
  http2_protocol_options:
    max_concurrent_streams: 100
  common_http_protocol_options:
    max_requests_per_connection: 1000
```

## Outlier Detection with Circuit Breakers

Combine circuit breakers with outlier detection for comprehensive fault tolerance:

```yaml
clusters:
- name: backend_service
  connect_timeout: 5s
  type: STRICT_DNS
  lb_policy: ROUND_ROBIN
  load_assignment:
    cluster_name: backend_service
    endpoints:
    - lb_endpoints:
      - endpoint:
          address:
            socket_address:
              address: backend.default.svc.cluster.local
              port_value: 8080
  circuit_breakers:
    thresholds:
    - max_connections: 1000
      max_pending_requests: 1000
      max_requests: 1000
      max_retries: 3
  outlier_detection:
    consecutive_5xx: 5
    interval: 10s
    base_ejection_time: 30s
    max_ejection_percent: 50
    enforcing_consecutive_5xx: 100
```

## Tracking Circuit Breaker Opens

Monitor when circuit breakers trip:

```promql
# Connection overflow
envoy_cluster_circuit_breakers_default_cx_open

# Pending request overflow
envoy_cluster_circuit_breakers_default_rq_pending_open

# Request overflow
envoy_cluster_circuit_breakers_default_rq_open

# Retry overflow
envoy_cluster_circuit_breakers_default_rq_retry_open
```

## Configuring Retries with Circuit Breakers

Limit concurrent retries to prevent retry storms:

```yaml
clusters:
- name: backend_service
  circuit_breakers:
    thresholds:
    - max_retries: 10

routes:
- match:
    prefix: "/api"
  route:
    cluster: backend_service
    retry_policy:
      retry_on: "5xx,reset,connect-failure"
      num_retries: 3
      per_try_timeout: 2s
```

## Testing Circuit Breakers

Generate load to trigger circuit breakers:

```bash
# Send concurrent requests
for i in {1..2000}; do
  curl http://envoy:8080/api &
done

# Check circuit breaker stats
curl http://localhost:9901/stats | grep circuit_breakers
```

## Gradual Traffic Recovery

After circuit breakers trip, traffic should recover gradually. Configure outlier detection to slowly reintroduce ejected hosts:

```yaml
outlier_detection:
  consecutive_5xx: 5
  interval: 10s
  base_ejection_time: 30s
  max_ejection_time: 300s
  max_ejection_percent: 50
  enforcing_consecutive_5xx: 100
```

## Best Practices

1. Set realistic limits based on upstream capacity
2. Monitor circuit breaker metrics continuously
3. Combine with retry policies and outlier detection
4. Test circuit breaker thresholds under load
5. Use different limits for different traffic priorities
6. Alert on frequent circuit breaker opens

## Conclusion

Envoy circuit breakers provide crucial fault tolerance by limiting concurrent connections and requests to upstream services. Configure appropriate thresholds based on upstream capacity, combine with outlier detection for comprehensive failure handling, and monitor circuit breaker metrics to understand system behavior under load. Circuit breakers prevent cascading failures and keep your system stable during partial outages.
