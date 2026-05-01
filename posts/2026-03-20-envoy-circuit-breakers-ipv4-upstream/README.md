# How to Set Up Envoy Circuit Breakers for IPv4 Upstream Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Envoy, Circuit Breaker, IPv4, Resilience, Upstream, Service Mesh

Description: Configure Envoy circuit breakers to protect IPv4 upstream clusters from overload by limiting concurrent connections, pending requests, and retries.

## Introduction

Envoy circuit breakers prevent cascade failures by limiting how many requests flow to an upstream cluster. When limits are exceeded, Envoy fails fast rather than queuing indefinitely-protecting both the caller and the backend.

## Circuit Breaker Configuration

Circuit breakers are configured in the `circuit_breakers` field of a cluster:

```yaml
# /etc/envoy/envoy.yaml

admin:
  address:
    socket_address:
      address: 127.0.0.1
      port_value: 9901

static_resources:
  clusters:
    - name: api_service
      connect_timeout: 5s
      type: STATIC
      lb_policy: ROUND_ROBIN

      # Circuit breaker thresholds
      circuit_breakers:
        thresholds:
          - priority: DEFAULT      # Applies to non-high-priority traffic
            max_connections: 1000  # Max active TCP connections to this cluster
            max_pending_requests: 1000  # Max requests waiting for a connection
            max_requests: 1000     # Max active HTTP requests
            max_retries: 3         # Max concurrent retries

          - priority: HIGH         # Applies to high-priority traffic
            max_connections: 2000
            max_pending_requests: 500
            max_requests: 2000
            max_retries: 5

      load_assignment:
        cluster_name: api_service
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address: { address: 192.168.1.10, port_value: 8080 }
              - endpoint:
                  address:
                    socket_address: { address: 192.168.1.11, port_value: 8080 }
```

## Monitoring Circuit Breaker State

Circuit breaker overflows are tracked in Envoy stats:

```bash
# Check circuit breaker overflow counters

curl -s http://127.0.0.1:9901/stats | grep -E 'cluster\.api_service\.(circuit_breakers\.default\.cx_open|upstream_(cx_overflow|rq_pending_overflow|rq_active_overflow|rq_retry_overflow))'

# Key metrics:
# cluster.api_service.circuit_breakers.default.cx_open         → connection breaker at capacity (1=open, 0=closed)
# cluster.api_service.upstream_cx_overflow                     → max_connections overflow
# cluster.api_service.upstream_rq_pending_overflow             → max_pending_requests overflow
# cluster.api_service.upstream_rq_active_overflow              → max_requests overflow
# cluster.api_service.upstream_rq_retry_overflow               → max_retries overflow

# Watch in real-time
watch -n2 "curl -s http://127.0.0.1:9901/stats | grep 'api_service.upstream_rq_pending_overflow'"
```

## Circuit Breakers with Retry Policy

Combine circuit breakers with retries for comprehensive resilience:

```yaml
route_config:
  name: main_route
  virtual_hosts:
    - name: backend
      domains: ["*"]
      routes:
        - match: { prefix: "/" }
          route:
            cluster: api_service
            # Retry on connection failures and 5xx
            retry_policy:
              retry_on: "connect-failure,refused-stream,5xx"
              num_retries: 3
              per_try_timeout: 5s
              retry_host_predicate:
                - name: envoy.retry_host_predicates.previous_hosts
              host_selection_retry_max_attempts: 3
```

## Outlier Detection (Passive Circuit Breaker)

Automatically eject unhealthy endpoints based on error rates:

```yaml
clusters:
  - name: api_service
    type: STATIC
    lb_policy: ROUND_ROBIN

    # Passive outlier detection
    outlier_detection:
      consecutive_5xx: 5              # In default mode, eject after 5 consecutive 5xx or local-origin failures
      interval: 10s                   # Check interval
      base_ejection_time: 30s         # Minimum ejection duration
      max_ejection_percent: 50        # Max % of endpoints that can be ejected
      success_rate_minimum_hosts: 3   # Need at least 3 hosts to use rate-based ejection
      success_rate_request_volume: 100  # Min requests per interval for analysis
      success_rate_stdev_factor: 1900   # Eject if success rate < mean - 1.9*stdev

    load_assignment:
      cluster_name: api_service
      endpoints:
        - lb_endpoints:
            - endpoint:
                address:
                  socket_address: { address: 192.168.1.10, port_value: 8080 }
            - endpoint:
                address:
                  socket_address: { address: 192.168.1.11, port_value: 8080 }
            - endpoint:
                address:
                  socket_address: { address: 192.168.1.12, port_value: 8080 }
```

## Conclusion

Envoy circuit breakers in the `circuit_breakers.thresholds` block set limits on connections, pending requests, active requests, and retries per cluster. Set values based on your backend capacity and SLA requirements. Monitor `upstream_cx_overflow`, `upstream_rq_pending_overflow`, `upstream_rq_active_overflow`, and `upstream_rq_retry_overflow` metrics to tune thresholds, and combine with outlier detection for automatic removal of failing endpoints.
