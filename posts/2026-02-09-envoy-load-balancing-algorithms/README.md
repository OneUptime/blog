# How to implement Envoy load balancing algorithms

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Envoy, Load Balancing, Traffic Management

Description: Learn how to configure different load balancing algorithms in Envoy including round robin, least request, ring hash, and random for optimal traffic distribution.

---

Load balancing algorithms determine how Envoy distributes requests across backend hosts. The right algorithm can significantly impact performance, resource utilization, and user experience. Envoy supports multiple algorithms from simple round robin to sophisticated least-request and consistent hashing strategies. This guide covers all major load balancing algorithms and when to use each.

## Round Robin

The simplest algorithm distributes requests evenly across all healthy hosts:

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
```

Round robin works well when all backends have similar capacity and requests have similar cost.

## Least Request

Sends requests to the host with the fewest active requests:

```yaml
clusters:
- name: backend_service
  connect_timeout: 5s
  type: STRICT_DNS
  lb_policy: LEAST_REQUEST
  least_request_lb_config:
    choice_count: 2
  load_assignment:
    cluster_name: backend_service
    endpoints:
    - lb_endpoints:
      - endpoint:
          address:
            socket_address:
              address: backend.default.svc.cluster.local
              port_value: 8080
```

choice_count determines how many hosts to consider. Higher values improve distribution but increase CPU overhead. Least request works well when request processing times vary significantly.

## Random

Randomly selects a backend for each request:

```yaml
clusters:
- name: backend_service
  connect_timeout: 5s
  type: STRICT_DNS
  lb_policy: RANDOM
  load_assignment:
    cluster_name: backend_service
    endpoints:
    - lb_endpoints:
      - endpoint:
          address:
            socket_address:
              address: backend.default.svc.cluster.local
              port_value: 8080
```

Random is simple and effective for stateless services with many backends.

## Ring Hash (Consistent Hashing)

Routes requests based on a hash of request properties, ensuring the same request always goes to the same backend:

```yaml
clusters:
- name: backend_service
  connect_timeout: 5s
  type: STRICT_DNS
  lb_policy: RING_HASH
  ring_hash_lb_config:
    minimum_ring_size: 1024
    maximum_ring_size: 8192
    hash_function: XX_HASH
  load_assignment:
    cluster_name: backend_service
    endpoints:
    - lb_endpoints:
      - endpoint:
          address:
            socket_address:
              address: backend.default.svc.cluster.local
              port_value: 8080

routes:
- match:
    prefix: "/api"
  route:
    cluster: backend_service
    hash_policy:
    - header:
        header_name: "x-user-id"
```

This routes all requests with the same x-user-id header to the same backend, useful for session affinity or caching.

## Hash Policy Configuration

Different hash policies for ring hash:

```yaml
routes:
- match:
    prefix: "/api"
  route:
    cluster: backend_service
    hash_policy:
    # Hash on header
    - header:
        header_name: "x-session-id"
    # Hash on cookie
    - cookie:
        name: "session"
        ttl: 3600s
    # Hash on source IP
    - connection_properties:
        source_ip: true
    # Hash on query parameter
    - query_parameter:
        name: "user_id"
```

## Maglev Load Balancing

Maglev provides consistent hashing with better distribution than ring hash:

```yaml
clusters:
- name: backend_service
  connect_timeout: 5s
  type: STRICT_DNS
  lb_policy: MAGLEV
  maglev_lb_config:
    table_size: 65537
  load_assignment:
    cluster_name: backend_service
    endpoints:
    - lb_endpoints:
      - endpoint:
          address:
            socket_address:
              address: backend.default.svc.cluster.local
              port_value: 8080
```

Use Maglev when you need consistent hashing with minimal disruption when backends change.

## Weighted Load Balancing

Assign different weights to backends:

```yaml
load_assignment:
  cluster_name: backend_service
  endpoints:
  - lb_endpoints:
    - endpoint:
        address:
          socket_address:
            address: backend-new.default.svc.cluster.local
            port_value: 8080
      load_balancing_weight: 10
    - endpoint:
        address:
          socket_address:
            address: backend-old.default.svc.cluster.local
            port_value: 8080
      load_balancing_weight: 90
```

Useful for canary deployments or when backends have different capacities.

## Priority-Based Load Balancing

Route to different priority levels:

```yaml
load_assignment:
  cluster_name: backend_service
  endpoints:
  - priority: 0
    locality:
      zone: us-east-1a
    lb_endpoints:
    - endpoint:
        address:
          socket_address:
            address: backend-primary.default.svc.cluster.local
            port_value: 8080
  - priority: 1
    locality:
      zone: us-east-1b
    lb_endpoints:
    - endpoint:
        address:
          socket_address:
            address: backend-secondary.default.svc.cluster.local
            port_value: 8080
common_lb_config:
  zone_aware_lb_config:
    routing_enabled:
      value: 100
    min_cluster_size: 2
```

Traffic goes to priority 0 unless enough hosts are unhealthy, then fails over to priority 1.

## Slow Start

Gradually increase traffic to new backends:

```yaml
load_assignment:
  cluster_name: backend_service
  endpoints:
  - lb_endpoints:
    - endpoint:
        address:
          socket_address:
            address: backend.default.svc.cluster.local
            port_value: 8080
common_lb_config:
  slow_start_config:
    slow_start_window: 60s
    aggression:
      default_value: 1.0
```

New backends receive gradually increasing traffic over 60 seconds.

## Monitoring Load Balancing

Track distribution metrics:

```promql
# Requests per host
envoy_cluster_lb_subsets_selected

# Active requests per host
envoy_cluster_upstream_rq_active

# Load balancing failures
envoy_cluster_upstream_rq_pending_overflow
```

## Choosing the Right Algorithm

- Round Robin: Stateless services, equal backend capacity
- Least Request: Varying request processing times
- Random: Simple stateless services, many backends
- Ring Hash/Maglev: Session affinity, caching
- Weighted: Canary deployments, heterogeneous capacity
- Priority: Multi-zone deployments, failover

## Best Practices

1. Start with round robin for stateless services
2. Use least request when processing times vary
3. Implement consistent hashing for session affinity
4. Configure weights for canary deployments
5. Use priorities for multi-region failover
6. Monitor per-host metrics to verify distribution
7. Test load balancing under realistic traffic patterns

## Conclusion

Envoy provides flexible load balancing algorithms for different use cases. Choose round robin or random for simple stateless services, least request for variable workloads, and consistent hashing for session affinity. Configure weights for gradual rollouts and priorities for failover scenarios. Monitor per-host metrics to ensure even distribution and adjust algorithms based on observed traffic patterns.
