# How to Configure Circuit Breakers in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Circuit Breaker, Istio, Resilience, Service Mesh

Description: Implement circuit breakers in Rancher using Istio's DestinationRule to prevent cascade failures and improve system resilience when downstream services degrade.

## Introduction

Circuit breakers prevent cascade failures in microservice architectures by failing fast when downstream services are overloaded or unhealthy. When a service is failing, instead of queuing up requests that will all fail, the circuit breaker applies backpressure and allows the system to recover. Istio implements this behavior through the DestinationRule resource using two mechanisms: connection pool settings (to limit concurrent connections, requests, and retries) and outlier detection (to eject unhealthy hosts).

## Prerequisites

- Rancher with Istio installed
- Services with Istio sidecar injection enabled
- kubectl with cluster-admin access

## Understanding Circuit Breaker States

Application-level circuit breakers typically have three states:
- **Closed**: Normal operation, requests flow through
- **Open**: Requests fail immediately while the breaker blocks calls
- **Half-Open**: Testing if service has recovered

Istio and Envoy do not expose one global Closed/Open/Half-Open state for a service. Instead, they enforce resource limits per upstream cluster and temporarily eject unhealthy hosts from load balancing.

## Step 1: Configure Connection Pool Limits

Connection pool limits prevent overwhelming downstream services:

```yaml
# connection-pool-limits.yaml - Limit concurrent connections

apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: payment-service-dr
  namespace: production
spec:
  host: payment-service
  trafficPolicy:
    connectionPool:
      tcp:
        # Maximum concurrent TCP connections
        maxConnections: 100
        # TCP connection timeout
        connectTimeout: 30ms
        # Keep connections alive
        tcpKeepalive:
          time: 7200s
          interval: 75s
      http:
        # Maximum queued requests waiting for a connection
        http1MaxPendingRequests: 50
        # Maximum active requests to the destination
        http2MaxRequests: 200
        # Maximum requests allowed per upstream connection
        maxRequestsPerConnection: 100
        # Remove connections idle for more than 1 hour
        idleTimeout: 1h
```

## Step 2: Configure Outlier Detection

Outlier detection monitors host health and ejects failing instances:

```yaml
# outlier-detection.yaml - Eject unhealthy hosts automatically
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: database-service-dr
  namespace: production
spec:
  host: database-service
  trafficPolicy:
    outlierDetection:
      # Eject hosts with 5 consecutive 5xx errors
      consecutive5xxErrors: 5
      # Also eject on gateway errors
      consecutiveGatewayErrors: 3
      # How often to scan for unhealthy hosts
      interval: 10s
      # How long to keep host ejected
      baseEjectionTime: 30s
      # Maximum percentage of hosts that can be ejected
      maxEjectionPercent: 50
      # Disable outlier detection if healthy hosts drop below 50%
      minHealthPercent: 50
```

## Step 3: Comprehensive Circuit Breaker Configuration

Combine connection pool limits and outlier detection:

```yaml
# full-circuit-breaker.yaml - Production-grade circuit breaker
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: orders-service-dr
  namespace: production
spec:
  host: orders-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 50
        connectTimeout: 5s
      http:
        http1MaxPendingRequests: 25
        http2MaxRequests: 100
        maxRetries: 3
    outlierDetection:
      consecutive5xxErrors: 5
      consecutiveGatewayErrors: 2
      interval: 30s
      baseEjectionTime: 60s
      maxEjectionPercent: 100
      # Track locally originated failures separately from upstream 5xxs
      splitExternalLocalOriginErrors: true
  subsets:
    - name: v1
      labels:
        version: v1
      trafficPolicy:
        connectionPool:
          http:
            # Subset-specific override - more connections for v1
            http2MaxRequests: 150
```

## Step 4: Deploy a Test Scenario

Use Fortio to load test and trigger circuit breaking:

```bash
# Deploy Fortio load testing tool
kubectl apply -n production -f - << 'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: fortio-deploy
spec:
  replicas: 1
  selector:
    matchLabels:
      app: fortio
  template:
    metadata:
      labels:
        app: fortio
    spec:
      containers:
        - name: fortio
          image: fortio/fortio:latest
          command:
            - /usr/bin/fortio
          args:
            - server
          ports:
            - containerPort: 8080
EOF

# Generate traffic to exceed the orders-service limits from Step 3
kubectl exec -n production deployment/fortio-deploy -c fortio -- \
  /usr/bin/fortio load \
  -c 60 \
  -qps 0 \
  -n 600 \
  http://orders-service:8080/api/orders
```

## Step 5: Monitor Circuit Breaker Metrics

Istio exposes only a minimal set of Envoy stats by default. If you want these circuit breaker and outlier detection metrics in Prometheus, enable the relevant Envoy stats with `proxyStatsMatcher` and restart the affected proxies first, then query Rancher Monitoring:

```bash
# In a separate terminal, forward Rancher Monitoring's Prometheus instance
kubectl -n cattle-monitoring-system port-forward deployment/prometheus-rancher-monitoring-prometheus 9090:9090

# Query Prometheus for circuit breaker overflow counters
curl -G -s 'http://localhost:9090/api/v1/query' \
  --data-urlencode 'query=sum by (__name__, cluster_name) ({__name__=~"envoy_cluster_upstream_rq_(pending|active)_overflow"})' | \
  jq '.data.result[] | {metric: .metric.__name__, service: .metric.cluster_name, overflow_count: .value[1]}'

# Check ejected hosts
curl -G -s 'http://localhost:9090/api/v1/query' \
  --data-urlencode 'query=sum by (cluster_name) (envoy_cluster_outlier_detection_ejections_active)' | \
  jq '.data.result[] | {service: .metric.cluster_name, ejected_hosts: .value[1]}'

# Check upstream request timeouts
curl -G -s 'http://localhost:9090/api/v1/query' \
  --data-urlencode 'query=rate(envoy_cluster_upstream_rq_timeout[5m])' | \
  jq '.data.result'
```

## Step 6: Create Circuit Breaker Alerts

```yaml
# circuit-breaker-alerts.yaml - Prometheus alerts for circuit breaking
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: circuit-breaker-alerts
  namespace: cattle-monitoring-system
  labels:
    release: rancher-monitoring
spec:
  groups:
    - name: circuit-breaker
      rules:
        # Alert when circuit breaker starts rejecting requests
        - alert: CircuitBreakerRejectingRequests
          expr: |
            sum by (cluster_name) (
              rate({__name__=~"envoy_cluster_upstream_rq_(pending|active)_overflow"}[5m])
            ) > 10
          for: 2m
          labels:
            severity: warning
          annotations:
            summary: "Circuit breaker rejecting requests for {{ $labels.cluster_name }}"
            description: "{{ $value }} requests per second are being rejected by circuit breaking thresholds"

        # Alert on high host ejection rate
        - alert: HighOutlierEjectionRate
          expr: |
            sum(envoy_cluster_outlier_detection_ejections_active) by (cluster_name) > 0
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Hosts ejected by outlier detection in {{ $labels.cluster_name }}"
```

## Step 7: Implement Application-Level Circuit Breaker

For application-level circuit breaking in a Spring Boot application using the Resilience4j starter, you can configure it like this:

```yaml
# app-with-circuit-breaker.yaml - Application with built-in circuit breaker
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend-app
  namespace: production
spec:
  selector:
    matchLabels:
      app: frontend-app
  template:
    metadata:
      labels:
        app: frontend-app
    spec:
      containers:
        - name: frontend
          image: registry.example.com/frontend:v1.0
          env:
            # Resilience4j circuit breaker configuration
            - name: RESILIENCE4J_CIRCUITBREAKER_INSTANCES_BACKEND_FAILURERATETHRESHOLD
              value: "50"
            - name: RESILIENCE4J_CIRCUITBREAKER_INSTANCES_BACKEND_SLOWCALLRATETHRESHOLD
              value: "70"
            - name: RESILIENCE4J_CIRCUITBREAKER_INSTANCES_BACKEND_SLOWCALLDURATIONTHRESHOLD
              value: "2s"
            - name: RESILIENCE4J_CIRCUITBREAKER_INSTANCES_BACKEND_WAITDURATIONINOPENSTATE
              value: "60s"
```

## Step 8: Verify Circuit Breaker Behavior

If you enabled the Envoy stats above, you can also inspect them directly from a sidecar proxy:

```bash
# Check Envoy statistics for the service
kubectl exec -n production -c istio-proxy deployment/frontend-app -- \
  pilot-agent request GET stats | grep -E 'orders-service.*(upstream_rq_pending_overflow|upstream_rq_active_overflow|outlier_detection)'

# Check outlier detection status
kubectl exec -n production -c istio-proxy deployment/frontend-app -- \
  pilot-agent request GET clusters | grep -E 'orders-service.*outlier'

# View Envoy cluster configuration
kubectl exec -n production -c istio-proxy deployment/frontend-app -- \
  pilot-agent request GET config_dump | jq '.configs[] | select(.["@type"] | contains("ClustersConfigDump"))'
```

## Conclusion

Circuit breakers are essential for building resilient microservice architectures in Rancher. Istio's DestinationRule provides fine-grained control over both connection pool limits (preventing resource exhaustion) and outlier detection (automatically ejecting unhealthy hosts). Combine circuit breakers with retry policies, timeouts, and bulkhead patterns for a comprehensive resilience strategy. Always monitor circuit breaker metrics and set up alerts to detect when services are degrading before they cause user-visible failures.
