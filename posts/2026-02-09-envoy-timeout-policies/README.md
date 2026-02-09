# How to configure Envoy timeout policies for request deadlines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Envoy, Timeouts, Reliability

Description: Learn how to configure comprehensive timeout policies in Envoy to prevent resource exhaustion and ensure predictable request handling.

---

Timeouts are critical for preventing resource exhaustion and ensuring predictable system behavior. Without proper timeouts, slow requests can accumulate and exhaust connection pools. Envoy provides multiple timeout mechanisms at different layers, from connection timeouts to request timeouts and idle timeouts. This guide shows you how to configure effective timeout strategies.

## Connection Timeout

Controls how long to wait when establishing connections:

```yaml
clusters:
- name: backend_service
  connect_timeout: 5s
  type: STRICT_DNS
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

Set connect_timeout based on network conditions. 1-5 seconds is typical for in-cluster communication.

## Request Timeout

Maximum time for the entire request (including retries):

```yaml
routes:
- match:
    prefix: "/api/fast"
  route:
    cluster: fast_service
    timeout: 5s

- match:
    prefix: "/api/batch"
  route:
    cluster: batch_service
    timeout: 300s
```

Configure different timeouts for different endpoints based on expected processing time.

## Idle Timeout

Close idle connections after a period of inactivity:

```yaml
clusters:
- name: backend_service
  connect_timeout: 5s
  type: STRICT_DNS
  common_http_protocol_options:
    idle_timeout: 60s
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

Idle timeout prevents keeping connections open indefinitely when not in use.

## Stream Idle Timeout

Timeout for individual HTTP streams (requests on HTTP/2 connections):

```yaml
http_connection_manager:
  stream_idle_timeout: 300s
  request_timeout: 300s
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
```

## Per-Try Timeout

Timeout for each retry attempt:

```yaml
routes:
- match:
    prefix: "/api"
  route:
    cluster: api_service
    timeout: 30s
    retry_policy:
      retry_on: "5xx"
      num_retries: 3
      per_try_timeout: 10s
```

Each of the 3 retries gets 10 seconds, but the entire request must complete within 30 seconds.

## HTTP/2 Ping Timeout

Detect broken connections with HTTP/2 pings:

```yaml
clusters:
- name: backend_service
  connect_timeout: 5s
  type: STRICT_DNS
  http2_protocol_options:
    connection_keepalive:
      interval: 30s
      timeout: 10s
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

Send HTTP/2 pings every 30 seconds, close connection if no response in 10 seconds.

## Downstream Connection Timeout

Timeout for client connections to Envoy:

```yaml
http_connection_manager:
  drain_timeout: 5s
  common_http_protocol_options:
    idle_timeout: 300s
    max_connection_duration: 3600s
```

max_connection_duration closes connections after 1 hour regardless of activity.

## Grpc Timeout

Pass gRPC deadline to upstream services:

```yaml
routes:
- match:
    prefix: "/grpc.Service"
  route:
    cluster: grpc_service
    timeout: 60s
    max_stream_duration:
      max_stream_duration: 60s
      grpc_timeout_header_max: 60s
```

## Monitoring Timeouts

Track timeout occurrences:

```promql
# Connection timeouts
envoy_cluster_upstream_cx_connect_timeout

# Request timeouts
envoy_cluster_upstream_rq_timeout

# Idle timeouts
envoy_cluster_upstream_cx_idle_timeout
```

## Best Practices

1. Set realistic timeouts based on actual service behavior
2. Configure shorter timeouts for critical paths
3. Use longer timeouts for batch operations
4. Monitor timeout metrics to identify slow endpoints
5. Consider retry timeouts in total request timeout
6. Test timeout behavior under load

## Conclusion

Proper timeout configuration prevents resource exhaustion and ensures predictable request handling. Configure connection timeouts for network reliability, request timeouts for SLA enforcement, and idle timeouts for resource cleanup. Use per-try timeouts with retry policies to balance resilience and responsiveness. Monitor timeout metrics to identify slow services and adjust policies accordingly.
