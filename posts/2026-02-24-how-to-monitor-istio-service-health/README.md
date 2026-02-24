# How to Monitor Istio Service Health

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Monitoring, Service Health, Observability, Prometheus

Description: Practical approaches to monitoring service health in Istio using golden signals, health endpoints, and automated health checking.

---

Knowing whether your services are healthy sounds simple, but in a microservices environment with Istio, "healthy" means many different things. A service might be running but returning errors. It might be responding but with unacceptable latency. It might be working fine for 99% of requests but failing for a specific set of users. Istio gives you the telemetry to answer all of these questions if you know where to look.

## The Four Golden Signals

Google's SRE book defined four golden signals for monitoring any service: latency, traffic, errors, and saturation. Istio automatically collects three of these four for every service in the mesh.

### Latency

Istio tracks request latency as a histogram. You can query it at various percentiles:

```promql
# P50 latency
histogram_quantile(0.50,
  sum(rate(istio_request_duration_milliseconds_bucket{
    reporter="destination",
    destination_service_name="order-service"
  }[5m])) by (le)
)

# P95 latency
histogram_quantile(0.95,
  sum(rate(istio_request_duration_milliseconds_bucket{
    reporter="destination",
    destination_service_name="order-service"
  }[5m])) by (le)
)

# P99 latency
histogram_quantile(0.99,
  sum(rate(istio_request_duration_milliseconds_bucket{
    reporter="destination",
    destination_service_name="order-service"
  }[5m])) by (le)
)
```

Track latency broken down by response code to identify if errors are slow errors (timeouts) or fast errors (immediate rejections):

```promql
histogram_quantile(0.99,
  sum(rate(istio_request_duration_milliseconds_bucket{
    reporter="destination",
    destination_service_name="order-service"
  }[5m])) by (le, response_code)
)
```

### Traffic

Request rate tells you how much load a service is handling:

```promql
# Requests per second
sum(rate(istio_requests_total{
  reporter="destination",
  destination_service_name="order-service"
}[5m]))

# Breakdown by source
sum(rate(istio_requests_total{
  reporter="destination",
  destination_service_name="order-service"
}[5m])) by (source_workload)
```

### Errors

Error rate is typically the first signal that something is wrong:

```promql
# 5xx error rate as a percentage
sum(rate(istio_requests_total{
  reporter="destination",
  destination_service_name="order-service",
  response_code=~"5.*"
}[5m]))
/
sum(rate(istio_requests_total{
  reporter="destination",
  destination_service_name="order-service"
}[5m]))

# Error count by specific code
sum(rate(istio_requests_total{
  reporter="destination",
  destination_service_name="order-service",
  response_code=~"[45].*"
}[5m])) by (response_code)
```

### Saturation

Saturation is about resource utilization. Istio does not track this directly, but you can combine Istio metrics with Kubernetes metrics:

```promql
# CPU saturation of sidecars
sum(rate(container_cpu_usage_seconds_total{
  container="istio-proxy",
  namespace="production"
}[5m])) by (pod)

# Connection pool saturation
envoy_cluster_upstream_cx_active{
  cluster_name="outbound|8080||order-service.production.svc.cluster.local"
}
```

## Building a Service Health Dashboard

Create a Grafana dashboard that shows health at a glance for each service. The key panels:

**Success Rate Panel:**

```promql
1 - (
  sum(rate(istio_requests_total{
    reporter="destination",
    response_code=~"5.*"
  }[5m])) by (destination_service_name)
  /
  sum(rate(istio_requests_total{
    reporter="destination"
  }[5m])) by (destination_service_name)
)
```

Display this as a stat panel with thresholds: green above 99.9%, yellow above 99%, red below 99%.

**Request Duration Heatmap:**

```promql
sum(rate(istio_request_duration_milliseconds_bucket{
  reporter="destination"
}[5m])) by (le, destination_service_name)
```

A heatmap shows the distribution of request durations over time, making it easy to spot latency changes visually.

## Istio Health Check Configuration

Beyond passive monitoring, you can configure Istio to actively check service health and take action.

### Outlier Detection

Outlier detection removes unhealthy pods from the load balancing pool:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: order-service-health
  namespace: production
spec:
  host: order-service
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 30s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
      minHealthPercent: 30
```

This ejects a pod from the pool after 3 consecutive 5xx errors, checks every 30 seconds, and keeps it ejected for at least 30 seconds before trying it again. The `maxEjectionPercent` prevents ejecting too many pods at once.

### Health Checking with Probes

Kubernetes liveness and readiness probes work alongside Istio. Make sure they are configured correctly:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  template:
    spec:
      containers:
      - name: order-service
        livenessProbe:
          httpGet:
            path: /healthz
            port: 8080
          initialDelaySeconds: 15
          periodSeconds: 10
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /readyz
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
          failureThreshold: 3
```

When Istio is in STRICT mTLS mode, kubelet health checks go through the sidecar. Istio automatically handles this by rewriting probe paths, but you should be aware that health check latency might be slightly higher.

## Monitoring Service Dependencies

A service might be healthy on its own but unhealthy because a dependency is failing. Track dependency health:

```promql
# Error rate of outbound requests from a service
sum(rate(istio_requests_total{
  reporter="source",
  source_workload="order-service",
  response_code=~"5.*"
}[5m])) by (destination_service_name)
/
sum(rate(istio_requests_total{
  reporter="source",
  source_workload="order-service"
}[5m])) by (destination_service_name)
```

This shows which downstream services are causing problems for the order service.

## Using Kiali for Service Health

Kiali provides a visual health overview of every service in the mesh. Access it:

```bash
kubectl port-forward svc/kiali -n istio-system 20001:20001
```

Kiali computes health based on:

- Request error rate (both inbound and outbound)
- Envoy proxy health
- Pod availability

You can configure health thresholds in Kiali:

```yaml
health_config:
  rate:
  - namespace:
      name: "production"
    tolerance:
    - code: "5XX"
      degraded: 1
      failure: 5
      protocol: http
    - code: "4XX"
      degraded: 10
      failure: 20
      protocol: http
```

## Distributed Tracing for Health Diagnosis

When a service is unhealthy, traces help you find the root cause:

```bash
kubectl port-forward svc/jaeger-query -n istio-system 16686:16686
```

Look for traces with errors and examine the span waterfall to see which service in the call chain is causing the failure. Traces show the exact duration of each hop, making it easy to identify where latency is being added.

## Automated Health Reporting

Create a simple script that queries Prometheus and generates a health report:

```bash
#!/bin/bash

PROMETHEUS_URL="http://prometheus.monitoring:9090"

# Get services with error rate above 1%
curl -s "${PROMETHEUS_URL}/api/v1/query" \
  --data-urlencode 'query=
    (sum(rate(istio_requests_total{response_code=~"5.*",reporter="destination"}[5m])) by (destination_service_name) /
     sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_service_name)) > 0.01
  ' | jq -r '.data.result[] | "\(.metric.destination_service_name): \(.value[1] | tonumber * 100 | round)% error rate"'
```

Run this on a schedule or integrate it with your on-call tooling.

## Connection-Level Health

Beyond request-level metrics, monitor connection-level health:

```promql
# Active connections
envoy_cluster_upstream_cx_active

# Connection failures
sum(rate(envoy_cluster_upstream_cx_connect_fail[5m])) by (cluster_name)

# Connection timeouts
sum(rate(envoy_cluster_upstream_cx_connect_timeout[5m])) by (cluster_name)
```

Connection failures often indicate network issues, DNS problems, or resource exhaustion that request-level metrics might not catch early enough.

Service health monitoring in Istio is about combining the right metrics with the right thresholds and the right visualization. Use the four golden signals as your foundation, add outlier detection for automated remediation, leverage Kiali for visual topology health, and use traces for diagnosing root causes. Together, these give you a comprehensive view of service health across your entire mesh.
