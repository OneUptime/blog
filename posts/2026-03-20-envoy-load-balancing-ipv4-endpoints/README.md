# How to Configure Envoy Load Balancing Policies for IPv4 Endpoints

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Envoy, Load Balancing, IPv4, Cluster, Round Robin, Least Request

Description: Configure different Envoy load balancing algorithms for IPv4 endpoint clusters including round robin, least request, random, and ring hash policies.

## Introduction

Envoy supports multiple load balancing algorithms configurable per cluster. Choosing the right algorithm depends on your workload characteristics: uniform request costs favor round-robin, variable costs favor least-request, and session affinity requires ring-hash or maglev.

## Available Load Balancing Policies

```yaml
# Round Robin (default): equal distribution

lb_policy: ROUND_ROBIN

# Least Request: pick from a small random subset, then choose the endpoint with fewer active requests
lb_policy: LEAST_REQUEST

# Random: random selection
lb_policy: RANDOM

# Ring Hash: consistent hashing for session affinity
lb_policy: RING_HASH

# Maglev: Google's consistent hashing algorithm
lb_policy: MAGLEV

# Weighted endpoint distribution: ROUND_ROBIN + per-endpoint load_balancing_weight
lb_policy: ROUND_ROBIN
```

## Round Robin (Default)

```yaml
clusters:
  - name: web_cluster
    connect_timeout: 5s
    type: STATIC
    lb_policy: ROUND_ROBIN   # Default: cycle through endpoints sequentially

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
            - endpoint:
                address:
                  socket_address: { address: 192.168.1.12, port_value: 8080 }
```

## Least Request

Best for backends with variable response times:

```yaml
clusters:
  - name: api_cluster
    type: STATIC
    lb_policy: LEAST_REQUEST

    least_request_lb_config:
      choice_count: 2   # Randomly choose 2 endpoints, pick the one with fewer requests

    load_assignment:
      cluster_name: api_cluster
      endpoints:
        - lb_endpoints:
            - endpoint:
                address:
                  socket_address: { address: 192.168.2.10, port_value: 8080 }
            - endpoint:
                address:
                  socket_address: { address: 192.168.2.11, port_value: 8080 }
```

## Weighted Endpoints

Assign different weights to endpoints:

```yaml
load_assignment:
  cluster_name: weighted_cluster
  endpoints:
    - lb_endpoints:
        - endpoint:
            address:
              socket_address: { address: 192.168.1.10, port_value: 8080 }
          load_balancing_weight: 5    # 50% of traffic

        - endpoint:
            address:
              socket_address: { address: 192.168.1.11, port_value: 8080 }
          load_balancing_weight: 3    # 30% of traffic

        - endpoint:
            address:
              socket_address: { address: 192.168.1.12, port_value: 8080 }
          load_balancing_weight: 2    # 20% of traffic
```

## Ring Hash for Session Affinity

Route the same client consistently to the same backend:

```yaml
clusters:
  - name: stateful_cluster
    type: STATIC
    lb_policy: RING_HASH

    ring_hash_lb_config:
      minimum_ring_size: 1024
      maximum_ring_size: 8388608

    load_assignment:
      cluster_name: stateful_cluster
      endpoints:
        - lb_endpoints:
            - endpoint:
                address:
                  socket_address: { address: 192.168.3.10, port_value: 8080 }
            - endpoint:
                address:
                  socket_address: { address: 192.168.3.11, port_value: 8080 }
```

Configure the hash key in the route (e.g., use client IP):

```yaml
routes:
  - match: { prefix: "/" }
    route:
      cluster: stateful_cluster
      hash_policy:
        - connection_properties:
            source_ip: true   # Hash on client source IP for IP-based stickiness
```

## Verifying Load Balancing Distribution

```bash
# Send 100 requests and check distribution
for i in $(seq 1 100); do
    printf '%s\n' "$(curl -s http://localhost:8080/backend-id)"
done | sort | uniq -c | sort -rn

# View per-endpoint request counts from Envoy's admin /clusters endpoint
curl -s http://127.0.0.1:9901/clusters?format=json | jq '
  .cluster_statuses[]
  | select(.name == "web_cluster")
  | .host_statuses[]
  | {
      host: "\(.address.socket_address.address):\(.address.socket_address.port_value)",
      rq_total: (.stats[] | select(.name == "rq_total") | .value)
    }'
```

## Conclusion

Envoy load balancing policy is set via `lb_policy` on each cluster. Use `ROUND_ROBIN` as the default for uniform workloads, `LEAST_REQUEST` for variable-cost requests, weighted endpoints for capacity-proportional distribution, and `RING_HASH` with `hash_policy` for session affinity. Combine with outlier detection and health checks for production-grade endpoint management.
