# How to Implement API Gateway Circuit Breaking with Envoy-Based Gateways

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: API Gateway, Circuit Breaker, Envoy

Description: Implement circuit breaking patterns in Envoy-based API gateways to prevent cascading failures with practical configurations for outlier detection, connection limits, and retry policies.

---

Circuit breakers prevent cascading failures in distributed systems by stopping requests to failing services before they consume resources and cause widespread outages. Envoy-based API gateways including Istio, Ambassador, and standalone Envoy provide sophisticated circuit breaking capabilities that protect your microservices architecture from failure propagation.

## Understanding Circuit Breaking in Envoy

Envoy implements circuit breaking through connection and request limits at the cluster level. When a backend service becomes unhealthy or overloaded, Envoy stops sending traffic to it, giving the service time to recover. This differs from simple health checks because circuit breakers respond to real-time error rates and performance degradation, not just availability.

The circuit breaker operates in three states: closed (normal operation), open (blocking requests), and half-open (testing recovery). Envoy tracks metrics like consecutive errors, timeout rates, and connection failures to determine when to trip the circuit breaker.

## Basic Circuit Breaker Configuration

Start with a simple circuit breaker that limits concurrent connections and pending requests to prevent resource exhaustion.

```yaml
# envoy-circuit-breaker.yaml
static_resources:
  clusters:
  - name: user_service
    connect_timeout: 5s
    type: STRICT_DNS
    lb_policy: ROUND_ROBIN
    load_assignment:
      cluster_name: user_service
      endpoints:
      - lb_endpoints:
        - endpoint:
            address:
              socket_address:
                address: user-service
                port_value: 8080
    circuit_breakers:
      thresholds:
      - priority: DEFAULT
        max_connections: 1000
        max_pending_requests: 1000
        max_requests: 1000
        max_retries: 3
```

This configuration limits the cluster to 1000 concurrent connections, 1000 pending requests waiting for connections, 1000 active requests, and 3 concurrent retry attempts. When these limits are exceeded, Envoy immediately rejects new requests with a 503 status code.

## Outlier Detection for Circuit Breaking

Outlier detection monitors backend instances for abnormal behavior and temporarily ejects them from the load balancer pool. This is more sophisticated than simple circuit breaking because it operates per-instance rather than per-cluster.

```yaml
clusters:
- name: payment_service
  connect_timeout: 2s
  type: STRICT_DNS
  lb_policy: ROUND_ROBIN
  load_assignment:
    cluster_name: payment_service
    endpoints:
    - lb_endpoints:
      - endpoint:
          address:
            socket_address:
              address: payment-service
              port_value: 8080
  circuit_breakers:
    thresholds:
    - max_connections: 500
      max_requests: 500
  outlier_detection:
    consecutive_5xx: 5
    interval: 10s
    base_ejection_time: 30s
    max_ejection_percent: 50
    enforcing_consecutive_5xx: 100
    enforcing_success_rate: 100
    success_rate_minimum_hosts: 3
    success_rate_request_volume: 100
    success_rate_stdev_factor: 1900
```

This outlier detection configuration ejects an instance after 5 consecutive 5xx errors. The instance stays ejected for at least 30 seconds before being allowed back into the pool. Envoy won't eject more than 50% of instances even if they're all failing, ensuring some backends remain available.

The success rate enforcement analyzes the statistical distribution of success rates across instances. If an instance's success rate falls below the mean minus 1.9 standard deviations, it gets ejected. This catches instances that are degraded but not completely failing.

## Istio Circuit Breaking

Istio builds on Envoy's circuit breaking capabilities with Kubernetes-native configuration. Use DestinationRule resources to configure circuit breakers for your services.

```yaml
# user-service-circuit-breaker.yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: user-service
  namespace: default
spec:
  host: user-service.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 50
        http2MaxRequests: 100
        maxRequestsPerConnection: 2
    outlierDetection:
      consecutiveErrors: 5
      interval: 30s
      baseEjectionTime: 60s
      maxEjectionPercent: 50
      minHealthPercent: 40
```

The connectionPool settings control resource limits. `maxConnections` limits TCP connections to each instance, while `http1MaxPendingRequests` limits requests queued waiting for available connections. The `maxRequestsPerConnection` setting forces connection recycling, which helps detect network issues faster.

## Progressive Circuit Breaking

Implement progressive circuit breaking that tightens limits as error rates increase. This provides more responsive failure handling.

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: payment-service
spec:
  host: payment-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 200
      http:
        http1MaxPendingRequests: 100
        http2MaxRequests: 200
    outlierDetection:
      consecutiveErrors: 3
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 100
      consecutiveGatewayErrors: 3
  subsets:
  - name: v1
    labels:
      version: v1
    trafficPolicy:
      outlierDetection:
        consecutiveErrors: 5
        baseEjectionTime: 60s
  - name: v2
    labels:
      version: v2
    trafficPolicy:
      outlierDetection:
        consecutiveErrors: 2
        baseEjectionTime: 15s
```

This configuration applies different circuit breaking thresholds to different service versions. The v2 subset has more aggressive circuit breaking (trips after 2 errors) because it's newer and less proven, while v1 has more lenient thresholds.

## Ambassador Circuit Breakers

Ambassador uses Kubernetes resources to configure Envoy circuit breakers. The Module resource provides circuit breaking configuration.

```yaml
# ambassador-circuit-breaker.yaml
apiVersion: getambassador.io/v3alpha1
kind: Module
metadata:
  name: ambassador
  namespace: ambassador
spec:
  config:
    circuit_breakers:
    - priority: default
      max_connections: 1024
      max_pending_requests: 1024
      max_requests: 1024
      max_retries: 3
---
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: order-service
  namespace: default
spec:
  hostname: "*"
  prefix: /orders/
  service: order-service:8080
  circuit_breakers:
  - priority: default
    max_connections: 500
    max_pending_requests: 500
    max_requests: 500
  outlier_detection:
    consecutive_5xx: 5
    interval: 10s
    base_ejection_time: 30s
    max_ejection_percent: 50
```

Ambassador allows circuit breaker configuration at both the global level (Module) and per-route level (Mapping). The Mapping configuration overrides global settings for specific services that need tighter or looser limits.

## Retry Policies and Circuit Breakers

Circuit breakers work closely with retry policies. Aggressive retry policies can worsen cascading failures, so coordinate them with your circuit breaking thresholds.

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: catalog-service
spec:
  hosts:
  - catalog-service
  http:
  - route:
    - destination:
        host: catalog-service
    retries:
      attempts: 3
      perTryTimeout: 2s
      retryOn: 5xx,reset,connect-failure,refused-stream
    timeout: 10s
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: catalog-service
spec:
  host: catalog-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 50
        maxRetries: 5
    outlierDetection:
      consecutiveErrors: 3
      interval: 10s
      baseEjectionTime: 30s
```

This configuration allows up to 3 retry attempts per request but limits the cluster to 5 concurrent retries. Without the `maxRetries` limit in the circuit breaker, a single failing request could spawn hundreds of retries that overwhelm the backend.

## Testing Circuit Breakers

Verify your circuit breakers work correctly by simulating failures. Use a load generator to trigger the circuit breaker.

```bash
# Install fortio for load testing
kubectl run fortio --image=fortio/fortio -- load -c 50 -qps 0 -n 1000 \
  http://user-service:8080/api/users

# Check circuit breaker stats in Envoy
kubectl exec -it <envoy-pod> -c istio-proxy -- \
  curl localhost:15000/stats | grep user_service | grep circuit

# Expected output showing circuit breaker engagement
cluster.outbound|8080||user-service.default.svc.cluster.local.circuit_breakers.default.cx_open: 1
cluster.outbound|8080||user-service.default.svc.cluster.local.circuit_breakers.default.rq_open: 1
cluster.outbound|8080||user-service.default.svc.cluster.local.circuit_breakers.default.rq_pending_open: 1
```

When the circuit breaker trips, you'll see counters increment for connection limits (`cx_open`), request limits (`rq_open`), and pending request limits (`rq_pending_open`).

## Monitoring Circuit Breaker State

Integrate circuit breaker metrics with your monitoring system to alert on circuit breaker events.

```yaml
# ServiceMonitor for Prometheus
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: envoy-circuit-breakers
spec:
  selector:
    matchLabels:
      app: istio-ingressgateway
  endpoints:
  - port: http-envoy-prom
    interval: 15s
    path: /stats/prometheus
```

Create Prometheus alerts for circuit breaker events:

```yaml
# circuit-breaker-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: circuit-breaker-alerts
spec:
  groups:
  - name: circuit-breakers
    interval: 30s
    rules:
    - alert: CircuitBreakerOpen
      expr: |
        increase(envoy_cluster_circuit_breakers_default_rq_open[5m]) > 10
      for: 2m
      labels:
        severity: warning
      annotations:
        summary: "Circuit breaker tripped for {{ $labels.cluster_name }}"
        description: "Circuit breaker has opened {{ $value }} times in the last 5 minutes"

    - alert: HighEjectionRate
      expr: |
        rate(envoy_cluster_outlier_detection_ejections_active[5m]) > 0.3
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "High outlier detection ejection rate for {{ $labels.cluster_name }}"
```

## Graceful Degradation

Combine circuit breakers with graceful degradation strategies. When a circuit breaker opens, return cached data or reduced functionality instead of failing completely.

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: recommendation-service
spec:
  hosts:
  - recommendation-service
  http:
  - match:
    - uri:
        prefix: /recommendations
    route:
    - destination:
        host: recommendation-service
      weight: 100
    - destination:
        host: recommendation-fallback
      weight: 0
    timeout: 3s
    retries:
      attempts: 2
      perTryTimeout: 1s
    fault:
      abort:
        percentage:
          value: 0
        httpStatus: 503
```

When the primary service circuit breaker opens, Istio can route traffic to a fallback service that returns cached recommendations or generic popular items.

## Conclusion

Circuit breakers are essential for building resilient microservices architectures. Envoy-based gateways provide sophisticated circuit breaking that goes beyond simple failure counting to include statistical analysis, progressive ejection, and coordinated retry policies. By properly configuring circuit breakers, outlier detection, and connection limits, you prevent isolated service failures from cascading through your entire system. Monitor circuit breaker metrics closely and tune thresholds based on your actual traffic patterns and SLA requirements.
