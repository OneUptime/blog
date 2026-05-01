# How to Set Up Envoy Health Checks for IPv4 Cluster Members

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Envoy, Health Check, IPv4, Cluster, Monitoring, Resilience

Description: Configure Envoy active health checks for IPv4 cluster endpoints using HTTP, TCP, and gRPC protocols to proactively identify and remove unhealthy backends.

## Introduction

Envoy active health checks periodically probe each cluster endpoint and remove unhealthy ones from the load balancing pool. Unlike passive outlier detection, active checks detect failures even during idle periods with no real traffic.

## HTTP Health Check

```yaml
# /etc/envoy/envoy.yaml

static_resources:
  clusters:
    - name: web_cluster
      connect_timeout: 5s
      type: STATIC
      lb_policy: ROUND_ROBIN

      health_checks:
        - # Maximum wait time for a health check response
          timeout: 5s

          # Time between health checks
          interval: 10s

          # How many failures before marking unhealthy
          unhealthy_threshold: 3

          # How many successes before marking healthy again
          healthy_threshold: 2

          # Add jitter to prevent thundering herd
          interval_jitter: 1s

          http_health_check:
            # Path to probe
            path: /health

            # Expected HTTP status code range
            expected_statuses:
              - start: 200
                end: 300

            # Custom host header for virtual-hosted backends
            host: health-check.internal

      load_assignment:
        cluster_name: web_cluster
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address: { address: 192.168.1.10, port_value: 8080 }
              - endpoint:
                  address:
                    socket_address: { address: 192.168.1.11, port_value: 8080 }
```

## TCP Health Check

For non-HTTP services (Redis, databases, etc.):

```yaml
clusters:
  - name: redis_cluster
    type: STATIC
    lb_policy: ROUND_ROBIN

    health_checks:
      - timeout: 3s
        interval: 5s
        unhealthy_threshold: 2
        healthy_threshold: 1

        tcp_health_check:
          # Send PING\r\n, expect +PONG
          send:
            text: "50494e470d0a"    # PING\r\n in hex
          receive:
            - text: "2b504f4e47"   # +PONG in hex

    load_assignment:
      cluster_name: redis_cluster
      endpoints:
        - lb_endpoints:
            - endpoint:
                address:
                  socket_address: { address: 192.168.2.10, port_value: 6379 }
```

## gRPC Health Check

For gRPC services implementing the standard health protocol:

```yaml
clusters:
  - name: grpc_service
    type: STATIC
    lb_policy: ROUND_ROBIN

    typed_extension_protocol_options:
      envoy.extensions.upstreams.http.v3.HttpProtocolOptions:
        "@type": type.googleapis.com/envoy.extensions.upstreams.http.v3.HttpProtocolOptions
        explicit_http_config:
          http2_protocol_options: {}

    health_checks:
      - timeout: 5s
        interval: 10s
        unhealthy_threshold: 2
        healthy_threshold: 1

        grpc_health_check:
          service_name: ""    # Empty = overall server health

    load_assignment:
      cluster_name: grpc_service
      endpoints:
        - lb_endpoints:
            - endpoint:
                address:
                  socket_address: { address: 192.168.3.10, port_value: 9090 }
```

## Health Check on Alternate Port

Check on a dedicated health port different from the service port:

```yaml
load_assignment:
  cluster_name: web_cluster
  endpoints:
    - lb_endpoints:
        - endpoint:
            address:
              socket_address: { address: 192.168.1.10, port_value: 8080 }
            health_check_config:
              # Health check on port 8081, traffic on 8080
              port_value: 8081
```

## Monitoring Health Check Status

```bash
# View endpoint health status

curl http://127.0.0.1:9901/clusters | grep -E "health_flags|::cx_|::rq_"

# Health flag values:
# healthy → healthy
# /failed_active_hc → failed active health check
# /pending_active_hc → awaiting the first active health check

# View health check stats
curl http://127.0.0.1:9901/stats | grep -E "cluster.web_cluster.health_check|cluster.web_cluster.membership_(healthy|degraded)"

# Key metrics:
# cluster.web_cluster.health_check.attempt
# cluster.web_cluster.health_check.success
# cluster.web_cluster.health_check.failure
# cluster.web_cluster.membership_healthy
# cluster.web_cluster.membership_degraded
```

## Conclusion

Envoy active health checks run independently of client traffic, enabling proactive failure detection even for idle services. Use HTTP checks for web services, TCP checks with protocol-specific payloads for databases and caches, and gRPC checks for gRPC services. Configure `unhealthy_threshold` and `healthy_threshold` to balance between fast failure detection and avoiding flapping during transient issues.
