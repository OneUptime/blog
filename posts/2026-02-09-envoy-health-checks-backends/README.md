# How to configure Envoy health checks for backend endpoints

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Envoy, Health Checks, Reliability

Description: Learn how to configure active and passive health checks in Envoy to automatically detect and remove unhealthy backend endpoints from load balancing.

---

Health checks ensure Envoy only sends traffic to healthy backend instances. Envoy supports both active health checking (proactively checking endpoints) and passive health checking (detecting failures from actual traffic). Proper health check configuration prevents sending requests to failing backends and improves overall reliability.

## Active HTTP Health Checks

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
  health_checks:
  - timeout: 5s
    interval: 10s
    unhealthy_threshold: 3
    healthy_threshold: 2
    http_health_check:
      path: /health
      expected_statuses:
      - start: 200
        end: 299
```

Envoy sends GET /health every 10 seconds. Three consecutive failures mark the host unhealthy, two successes mark it healthy.

## TCP Health Checks

For non-HTTP services:

```yaml
health_checks:
- timeout: 3s
  interval: 10s
  unhealthy_threshold: 3
  healthy_threshold: 2
  tcp_health_check:
    send:
      text: "ping"
    receive:
    - text: "pong"
```

## gRPC Health Checks

For gRPC services:

```yaml
health_checks:
- timeout: 5s
  interval: 10s
  unhealthy_threshold: 3
  healthy_threshold: 2
  grpc_health_check:
    service_name: "myservice.Health"
    authority: "backend.service"
```

Uses the standard gRPC health checking protocol.

## Custom Health Check Headers

Add custom headers to health check requests:

```yaml
http_health_check:
  path: /health
  request_headers_to_add:
  - header:
      key: "x-health-check"
      value: "envoy"
  - header:
      key: "user-agent"
      value: "envoy-health-checker"
```

## Event Log Path

Log health check state changes:

```yaml
health_checks:
- timeout: 5s
  interval: 10s
  unhealthy_threshold: 3
  healthy_threshold: 2
  event_log_path: /var/log/envoy/health_check.log
  http_health_check:
    path: /health
```

## Jitter Configuration

Add randomness to health check intervals to prevent thundering herds:

```yaml
health_checks:
- timeout: 5s
  interval: 10s
  interval_jitter: 2s
  unhealthy_threshold: 3
  healthy_threshold: 2
  http_health_check:
    path: /health
```

Actual interval will be between 8-12 seconds.

## No Traffic Interval

Reduce health check frequency when no traffic is flowing:

```yaml
health_checks:
- timeout: 5s
  interval: 10s
  unhealthy_threshold: 3
  healthy_threshold: 2
  no_traffic_interval: 60s
  http_health_check:
    path: /health
```

Check every 60 seconds when the host receives no traffic, every 10 seconds when active.

## Passive Health Checking (Outlier Detection)

Detect failures from actual traffic:

```yaml
clusters:
- name: backend_service
  outlier_detection:
    consecutive_5xx: 5
    consecutive_gateway_failure: 3
    interval: 10s
    base_ejection_time: 30s
    max_ejection_percent: 50
    enforcing_consecutive_5xx: 100
    enforcing_consecutive_gateway_failure: 100
    enforcing_success_rate: 100
    success_rate_minimum_hosts: 5
    success_rate_request_volume: 100
    success_rate_stdev_factor: 1900
```

Hosts are ejected after 5 consecutive 5xx errors or 3 gateway failures.

## Combining Active and Passive Checks

Use both for comprehensive health monitoring:

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
  health_checks:
  - timeout: 5s
    interval: 10s
    unhealthy_threshold: 3
    healthy_threshold: 2
    http_health_check:
      path: /health
  outlier_detection:
    consecutive_5xx: 5
    interval: 10s
    base_ejection_time: 30s
    max_ejection_percent: 50
```

## Health Check Filtering

Only health check specific endpoints:

```yaml
health_checks:
- timeout: 5s
  interval: 10s
  unhealthy_threshold: 3
  healthy_threshold: 2
  http_health_check:
    path: /health
  health_checker:
    name: envoy.health_checkers.http
```

## TLS Health Checks

Health check TLS-enabled backends:

```yaml
health_checks:
- timeout: 5s
  interval: 10s
  unhealthy_threshold: 3
  healthy_threshold: 2
  http_health_check:
    path: /health
  transport_socket_match_criteria:
    tls_mode: true
```

## Monitoring Health Checks

Track health check metrics:

```promql
# Healthy hosts
envoy_cluster_health_check_success

# Failed health checks
envoy_cluster_health_check_failure

# Currently healthy hosts
envoy_cluster_membership_healthy

# Total hosts
envoy_cluster_membership_total
```

Create alerts:

```yaml
groups:
- name: health_checks
  rules:
  - alert: NoHealthyBackends
    expr: envoy_cluster_membership_healthy == 0
    annotations:
      summary: "Cluster {{ $labels.cluster_name }} has no healthy backends"

  - alert: HighHealthCheckFailureRate
    expr: rate(envoy_cluster_health_check_failure[5m]) > 0.5
    annotations:
      summary: "High health check failure rate for {{ $labels.cluster_name }}"
```

## Best Practices

1. Set reasonable timeout and interval values
2. Use unhealthy_threshold > 1 to avoid flapping
3. Configure jitter to prevent thundering herds
4. Combine active and passive health checking
5. Monitor health check success rates
6. Log health state changes for debugging
7. Use appropriate health check endpoints that reflect actual service health

## Conclusion

Envoy health checks automatically detect and remove unhealthy backends from load balancing pools. Configure active HTTP health checks for proactive monitoring, and use outlier detection for passive health checking based on actual traffic. Combine both approaches for comprehensive health monitoring. Tune thresholds and intervals based on your service characteristics and monitor health check metrics to ensure reliable traffic routing.
