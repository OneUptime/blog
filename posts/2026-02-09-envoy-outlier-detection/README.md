# How to Implement Envoy Outlier Detection for Automatic Ejection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Envoy, Reliability, Load Balancing, Health Checks, Fault Tolerance

Description: Learn how to configure Envoy outlier detection to automatically identify and eject unhealthy backend instances, improving service reliability through passive health checking.

---

Outlier detection is Envoy's passive health checking mechanism that automatically identifies and temporarily removes failing upstream hosts from the load balancing pool. Unlike active health checks that periodically probe endpoints, outlier detection monitors actual request traffic and ejects hosts exhibiting anomalous behavior like connection failures, timeout spikes, or elevated error rates.

This approach catches problems that active health checks might miss, such as hosts that respond to health probes but fail under production load, gradual performance degradation, or intermittent issues that only affect certain request types. By removing outliers quickly, Envoy prevents cascading failures and maintains overall service reliability even when individual instances develop problems.

## Understanding Outlier Detection

Envoy tracks several metrics for each upstream host: consecutive connection failures, consecutive 5xx responses, and success rate relative to other hosts in the cluster. When a host exceeds configured thresholds, Envoy ejects it from the load balancing pool for a base ejection time. The ejection duration increases exponentially with repeated ejections, preventing flapping hosts from repeatedly entering and leaving the pool.

The detection algorithm distinguishes between two modes: consecutive failures (any single host exceeding thresholds) and success rate outliers (hosts performing significantly worse than cluster averages). You can enable both modes simultaneously to catch different failure patterns.

## Basic Outlier Detection Configuration

Let's configure outlier detection for a backend service cluster:

```yaml
# envoy-outlier-detection.yaml
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
                  prefix: "/"
                route:
                  cluster: backend_service
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
    # Outlier detection configuration
    outlier_detection:
      # Consecutive 5xx errors before ejection
      consecutive_5xx: 5
      # Time interval for ejection analysis
      interval: 10s
      # Base ejection time
      base_ejection_time: 30s
      # Maximum ejection percentage (safety limit)
      max_ejection_percent: 50
      # Enforce consecutive 5xx for gateway errors
      enforcing_consecutive_5xx: 100
      # Enforce consecutive gateway failures
      enforcing_consecutive_gateway_failure: 0
      # Success rate parameters
      enforcing_success_rate: 100
      success_rate_minimum_hosts: 3
      success_rate_request_volume: 100
      success_rate_stdev_factor: 1900
      # Consecutive connection failures before ejection
      consecutive_gateway_failure: 3
      # Local origin failures (connection refused, etc.)
      consecutive_local_origin_failure: 5
      enforcing_consecutive_local_origin_failure: 100
      # Split external and local origin failures
      split_external_local_origin_errors: true
    # Connection settings
    connect_timeout: 1s
    common_http_protocol_options:
      idle_timeout: 300s

admin:
  address:
    socket_address:
      address: 0.0.0.0
      port_value: 9901
```

This configuration ejects hosts after 5 consecutive 5xx errors or 3 consecutive gateway failures. Ejected hosts remain out of rotation for 30 seconds initially.

## Understanding Detection Parameters

Let's examine each parameter in detail:

### Consecutive Failure Detection

```yaml
outlier_detection:
  # HTTP 5xx responses (500, 502, 503, 504)
  consecutive_5xx: 5
  enforcing_consecutive_5xx: 100  # 100% enforcement

  # Gateway failures (connection refused, reset, timeout)
  consecutive_gateway_failure: 3
  enforcing_consecutive_gateway_failure: 100

  # Local origin failures (connect failures before reaching upstream)
  consecutive_local_origin_failure: 5
  enforcing_consecutive_local_origin_failure: 100

  # Differentiate between connection failures and HTTP errors
  split_external_local_origin_errors: true
```

The `enforcing_*` parameters control what percentage of hosts actually get ejected when they hit thresholds. Setting to 100 means all violating hosts are ejected. Lower values provide gradual rollout.

### Success Rate Outlier Detection

Success rate detection compares each host's success rate to the cluster average:

```yaml
outlier_detection:
  # Enable success rate detection
  enforcing_success_rate: 100

  # Minimum number of hosts required for success rate calculation
  success_rate_minimum_hosts: 3

  # Minimum requests per interval to calculate success rate
  success_rate_request_volume: 100

  # Standard deviation factor (1900 = 1.9 std devs below mean)
  success_rate_stdev_factor: 1900

  # Analysis interval
  interval: 10s
```

A host is ejected if its success rate is more than 1.9 standard deviations below the mean. This catches gradually degrading hosts that might not trigger consecutive failure thresholds.

## Advanced Outlier Detection Strategies

For production deployments, combine multiple detection methods with progressive ejection:

```yaml
clusters:
- name: critical_service
  type: STRICT_DNS
  lb_policy: LEAST_REQUEST
  load_assignment:
    cluster_name: critical_service
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
      - endpoint:
          address:
            socket_address:
              address: backend-4
              port_value: 8000
  outlier_detection:
    # Aggressive consecutive failure detection
    consecutive_5xx: 3
    enforcing_consecutive_5xx: 100
    consecutive_gateway_failure: 2
    enforcing_consecutive_gateway_failure: 100
    consecutive_local_origin_failure: 3
    enforcing_consecutive_local_origin_failure: 100

    # Success rate outlier detection
    enforcing_success_rate: 100
    success_rate_minimum_hosts: 3
    success_rate_request_volume: 50
    success_rate_stdev_factor: 1900

    # Short interval for fast detection
    interval: 5s

    # Progressive ejection time
    base_ejection_time: 30s
    max_ejection_time: 300s

    # Conservative max ejection to maintain capacity
    max_ejection_percent: 30

    # Failure percentage threshold
    enforcing_failure_percentage: 100
    failure_percentage_threshold: 85
    failure_percentage_minimum_hosts: 3
    failure_percentage_request_volume: 50

    # Split error types for better detection
    split_external_local_origin_errors: true
  connect_timeout: 500ms
```

## Combining Outlier Detection with Active Health Checks

Use both passive and active health checking for comprehensive monitoring:

```yaml
clusters:
- name: monitored_service
  type: STRICT_DNS
  lb_policy: ROUND_ROBIN
  load_assignment:
    cluster_name: monitored_service
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
  # Active health checks
  health_checks:
  - timeout: 1s
    interval: 10s
    unhealthy_threshold: 2
    healthy_threshold: 2
    http_health_check:
      path: "/health"
      expected_statuses:
      - start: 200
        end: 299
      # Don't count health check failures as outlier events
      codec_client_type: HTTP1
  # Passive outlier detection
  outlier_detection:
    consecutive_5xx: 5
    consecutive_gateway_failure: 3
    enforcing_consecutive_5xx: 100
    enforcing_consecutive_gateway_failure: 100
    interval: 10s
    base_ejection_time: 30s
    max_ejection_percent: 50
    success_rate_minimum_hosts: 2
    success_rate_request_volume: 100
    success_rate_stdev_factor: 1900
  connect_timeout: 1s
```

Active health checks catch hosts that completely stop responding, while outlier detection catches subtle degradation under load.

## Monitoring Outlier Detection

Track outlier detection events using Envoy metrics:

```bash
# View outlier detection statistics
curl -s http://localhost:9901/stats | grep outlier_detection

# Key metrics:
# cluster.backend.outlier_detection.ejections_active: currently ejected hosts
# cluster.backend.outlier_detection.ejections_consecutive_5xx: ejections due to 5xx
# cluster.backend.outlier_detection.ejections_consecutive_gateway_failure: gateway failures
# cluster.backend.outlier_detection.ejections_success_rate: success rate outliers
# cluster.backend.outlier_detection.ejections_total: total ejections
# cluster.backend.outlier_detection.ejections_overflow: max ejection % reached
```

Create alerts for frequent ejections:

```yaml
# Prometheus alert rules
groups:
- name: envoy_outlier_detection
  rules:
  - alert: FrequentOutlierEjections
    expr: rate(envoy_cluster_outlier_detection_ejections_total[5m]) > 0.1
    for: 5m
    annotations:
      summary: "High rate of outlier ejections in {{ $labels.cluster }}"
      description: "Cluster {{ $labels.cluster }} is experiencing frequent ejections"

  - alert: MaxEjectionPercentReached
    expr: envoy_cluster_outlier_detection_ejections_overflow > 0
    annotations:
      summary: "Max ejection percentage reached for {{ $labels.cluster }}"
      description: "Cannot eject more hosts without violating max_ejection_percent"
```

## Testing Outlier Detection

Simulate failing backends to verify outlier detection works:

```python
# failing_backend.py - Simulates intermittent failures
from flask import Flask, jsonify
import random
import time

app = Flask(__name__)

# Simulate a flaky instance
FAILURE_RATE = 0.7  # 70% failure rate

@app.route('/api/test')
def test_endpoint():
    if random.random() < FAILURE_RATE:
        # Simulate various failure modes
        failure_type = random.choice(['5xx', 'timeout', 'connection'])

        if failure_type == '5xx':
            return jsonify({"error": "Internal error"}), 500
        elif failure_type == 'timeout':
            time.sleep(10)  # Hang to cause timeout
            return jsonify({"data": "slow"}), 200
        else:
            # Connection will be reset
            time.sleep(0.1)
            return "", 503

    return jsonify({"data": "success"}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000)
```

Run this backend alongside healthy instances and monitor ejections:

```bash
# Check which hosts are ejected
curl -s http://localhost:9901/clusters | grep -A 10 "backend_service"

# Look for health_flags indicating ejection reasons:
# /failed_outlier_check: host ejected by outlier detection
# /failed_active_hc: host failed active health check
```

## Panic Threshold and Load Balancing

When too many hosts are ejected, Envoy enters panic mode to maintain availability:

```yaml
clusters:
- name: backend_with_panic
  type: STRICT_DNS
  lb_policy: ROUND_ROBIN
  # Common load balancer configuration
  common_lb_config:
    # Panic threshold: route to all hosts if > 50% are unhealthy
    healthy_panic_threshold:
      value: 50.0
    # Zone aware load balancing
    zone_aware_lb_config:
      routing_enabled:
        value: 100.0
      min_cluster_size: 3
  load_assignment:
    cluster_name: backend_with_panic
    endpoints:
    - lb_endpoints:
      - endpoint:
          address:
            socket_address:
              address: backend-1
              port_value: 8000
        health_status: HEALTHY
  outlier_detection:
    consecutive_5xx: 5
    max_ejection_percent: 50
    base_ejection_time: 30s
```

When ejections exceed panic threshold, Envoy routes to all hosts including ejected ones, preventing complete service outage.

## Best Practices

1. **Start conservative**: Begin with higher thresholds and longer intervals, then tighten based on monitoring
2. **Limit max ejection**: Set max_ejection_percent to maintain minimum capacity (typically 30-50%)
3. **Use success rate detection**: Catches gradual degradation consecutive thresholds might miss
4. **Combine with health checks**: Use both active and passive monitoring
5. **Monitor ejection rates**: Frequent ejections indicate systemic problems
6. **Test failure scenarios**: Verify outlier detection catches actual failures
7. **Adjust for traffic patterns**: Low traffic clusters need higher request volume thresholds

Outlier detection provides automatic, traffic-aware health checking that improves service reliability without manual intervention. When properly configured, it quickly isolates problematic hosts while maintaining sufficient capacity to handle production traffic.
