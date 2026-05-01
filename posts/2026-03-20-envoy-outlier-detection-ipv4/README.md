# How to Configure Envoy Outlier Detection for IPv4 Endpoints

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Envoy, Outlier Detection, IPv4, Health, Resilience, Service Mesh

Description: Configure Envoy outlier detection to automatically identify and eject unhealthy IPv4 endpoints from load balancing pools based on error patterns and success rates.

## Introduction

Outlier detection in Envoy passively monitors upstream endpoint health by analyzing response patterns. Endpoints with high error rates are temporarily removed from rotation without requiring active health check probes.

## Basic Outlier Detection Configuration

```yaml
# /etc/envoy/envoy.yaml

static_resources:
  clusters:
    - name: backend_cluster
      connect_timeout: 5s
      type: STATIC
      lb_policy: ROUND_ROBIN

      outlier_detection:
        # Eject after N consecutive 5xx responses
        consecutive_5xx: 5

        # Detection interval
        interval: 10s

        # Base ejection time (multiplied by consecutive ejections)
        base_ejection_time: 30s

        # Max ejection time (caps the increasing ejection duration)
        max_ejection_time: 300s

        # Max percentage of endpoints that can be ejected simultaneously
        max_ejection_percent: 50

        # Require at least this many requests before using success rate detection
        success_rate_request_volume: 100

        # Minimum number of hosts for success rate analysis
        success_rate_minimum_hosts: 3

        # Eject if success rate is below: mean - (stdev * factor / 1000)
        success_rate_stdev_factor: 1900

      load_assignment:
        cluster_name: backend_cluster
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

## Outlier Detection Types

| Metric | Config Key | Triggers on |
|---|---|---|
| Consecutive 5xx | `consecutive_5xx` | N consecutive 5xx responses |
| Gateway errors | `consecutive_gateway_failure` | N consecutive 502/503/504 responses; in default mode, local failures count too |
| Local origin failures | `consecutive_local_origin_failure` | N consecutive local failures such as timeouts/resets (`split_external_local_origin_errors: true`) |
| Success rate | `success_rate_stdev_factor` | Statistical anomaly in success rate |

## Aggressive Detection for Databases

For databases where any failure is significant:

```yaml
clusters:
  - name: database_cluster
    type: STATIC
    lb_policy: ROUND_ROBIN

    outlier_detection:
      # Eject after 3 consecutive failures (strict for DB)
      consecutive_5xx: 3
      consecutive_gateway_failure: 2
      enforcing_consecutive_5xx: 100         # 100% enforcement
      enforcing_consecutive_gateway_failure: 100

      interval: 5s
      base_ejection_time: 60s
      max_ejection_percent: 34               # Allows at most 1 of 3 hosts to be ejected

    load_assignment:
      cluster_name: database_cluster
      endpoints:
        - lb_endpoints:
            - endpoint:
                address:
                  socket_address: { address: 192.168.3.10, port_value: 5432 }
            - endpoint:
                address:
                  socket_address: { address: 192.168.3.11, port_value: 5432 }
            - endpoint:
                address:
                  socket_address: { address: 192.168.3.12, port_value: 5432 }
```

## Monitoring Ejected Endpoints

```bash
# View current outlier detection stats

curl http://127.0.0.1:9901/stats | grep outlier_detection

# Key metrics:
# cluster.backend_cluster.outlier_detection.ejections_active       → currently ejected hosts
# cluster.backend_cluster.outlier_detection.ejections_enforced_total       → total enforced ejections
# cluster.backend_cluster.outlier_detection.ejections_enforced_consecutive_5xx → enforced consecutive 5xx ejections

# Check which endpoints are currently ejected
curl http://127.0.0.1:9901/clusters | grep failed_outlier_check

# Enable outlier detection event logging
# Add to bootstrap configuration:
# cluster_manager:
#   outlier_detection:
#     event_log_path: /var/log/envoy/outlier.log
```

## Conclusion

Envoy outlier detection provides passive health monitoring without dedicated health check connections. Configure `consecutive_5xx` for quick ejection of consistently failing backends, tune `base_ejection_time` to balance between fast recovery and protection from flapping, and set `max_ejection_percent` to ensure at least some backends remain available even during incidents. Monitor ejection events via stats and event logs for capacity planning.
