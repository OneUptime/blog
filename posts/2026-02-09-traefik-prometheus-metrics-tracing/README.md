# How to Configure Traefik Ingress with Prometheus Metrics and Tracing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Traefik, Observability

Description: Learn how to configure Prometheus metrics and distributed tracing in Traefik Ingress Controller for comprehensive observability, monitoring, and troubleshooting of your Kubernetes applications.

---

Observability is critical for operating production systems effectively. Traefik provides built-in support for Prometheus metrics and distributed tracing with Jaeger, Zipkin, and other tracing backends. This guide shows you how to configure comprehensive observability for your Traefik-based ingress.

## Understanding Traefik Observability

Traefik offers multiple observability features:
- Prometheus metrics for monitoring request rates, latencies, and errors
- Distributed tracing for request flow visualization
- Access logs for detailed request information
- Health checks and dashboard

These features work together to provide complete visibility into your traffic patterns and application health.

## Enabling Prometheus Metrics

Configure Traefik to expose Prometheus metrics.

### Metrics Configuration

```yaml
# traefik-metrics.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: traefik-config
  namespace: traefik
data:
  traefik.yaml: |
    # Metrics configuration
    metrics:
      prometheus:
        addEntryPointsLabels: true
        addRoutersLabels: true
        addServicesLabels: true
        buckets:
          - 0.1
          - 0.3
          - 1.2
          - 5.0
        entryPoint: metrics

    # Entry points
    entryPoints:
      web:
        address: ":80"
      websecure:
        address: ":443"
      metrics:
        address: ":8082"

    # API and dashboard
    api:
      dashboard: true
      insecure: true
---
# Update Traefik deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: traefik
  namespace: traefik
spec:
  template:
    spec:
      containers:
      - name: traefik
        ports:
        - name: metrics
          containerPort: 8082
        volumeMounts:
        - name: config
          mountPath: /etc/traefik
      volumes:
      - name: config
        configMap:
          name: traefik-config
---
# Metrics service
apiVersion: v1
kind: Service
metadata:
  name: traefik-metrics
  namespace: traefik
  labels:
    app: traefik
spec:
  ports:
  - name: metrics
    port: 8082
    targetPort: 8082
  selector:
    app.kubernetes.io/name: traefik
```

### ServiceMonitor for Prometheus Operator

```yaml
# servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: traefik
  namespace: traefik
spec:
  selector:
    matchLabels:
      app: traefik
  endpoints:
  - port: metrics
    interval: 15s
```

## Configuring Distributed Tracing

Enable tracing with Jaeger or Zipkin.

### Jaeger Tracing

```yaml
# traefik-jaeger.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: traefik-config
  namespace: traefik
data:
  traefik.yaml: |
    # Tracing configuration
    tracing:
      jaeger:
        samplingServerURL: http://jaeger-agent.observability:5778/sampling
        localAgentHostPort: jaeger-agent.observability:6831
        samplingType: const
        samplingParam: 1.0
        traceContextHeaderName: uber-trace-id

    # Metrics
    metrics:
      prometheus:
        addEntryPointsLabels: true
        addRoutersLabels: true
        addServicesLabels: true
```

Deploy Jaeger:

```bash
kubectl create namespace observability

kubectl apply -n observability -f \
  https://raw.githubusercontent.com/jaegertracing/jaeger-operator/main/deploy/crds/jaegertracing.io_jaegers_crd.yaml

kubectl apply -n observability -f - <<EOF
apiVersion: jaegertracing.io/v1
kind: Jaeger
metadata:
  name: jaeger
spec:
  strategy: allInOne
  allInOne:
    image: jaegertracing/all-in-one:latest
EOF
```

### Zipkin Tracing

```yaml
# traefik-zipkin.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: traefik-config
  namespace: traefik
data:
  traefik.yaml: |
    tracing:
      zipkin:
        httpEndpoint: http://zipkin.observability:9411/api/v2/spans
        sameSpan: true
        id128Bit: true
        sampleRate: 1.0
```

## Monitoring Dashboard

Create Grafana dashboards for Traefik metrics.

### Grafana Dashboard ConfigMap

```yaml
# grafana-dashboard.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: traefik-dashboard
  namespace: monitoring
data:
  traefik.json: |
    {
      "dashboard": {
        "title": "Traefik Dashboard",
        "panels": [
          {
            "title": "Request Rate",
            "targets": [
              {
                "expr": "rate(traefik_entrypoint_requests_total[5m])"
              }
            ]
          },
          {
            "title": "Response Time (p99)",
            "targets": [
              {
                "expr": "histogram_quantile(0.99, rate(traefik_entrypoint_request_duration_seconds_bucket[5m]))"
              }
            ]
          }
        ]
      }
    }
```

## Per-Service Metrics

Add labels to track individual services.

### IngressRoute with Custom Labels

```yaml
# monitored-ingressroute.yaml
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: monitored-app
  namespace: default
  labels:
    environment: production
    team: platform
spec:
  entryPoints:
    - websecure
  routes:
  - match: Host(`app.example.com`)
    kind: Rule
    services:
    - name: app-service
      port: 80
```

Query metrics by labels:

```promql
# Request rate by service
rate(traefik_service_requests_total{service="app-service@kubernetes"}[5m])

# 95th percentile latency
histogram_quantile(0.95,
  rate(traefik_service_request_duration_seconds_bucket[5m]))

# Error rate
rate(traefik_service_requests_total{code=~"5.."}[5m])
```

## Access Logs

Configure detailed access logging.

### Access Log Configuration

```yaml
# access-logs.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: traefik-config
  namespace: traefik
data:
  traefik.yaml: |
    accessLog:
      filePath: "/var/log/traefik/access.log"
      format: json
      filters:
        statusCodes:
          - "400-499"
          - "500-599"
        retryAttempts: true
        minDuration: "10ms"
      fields:
        defaultMode: keep
        names:
          ClientUsername: drop
        headers:
          defaultMode: keep
          names:
            User-Agent: keep
            Authorization: drop
            Cookie: drop
```

## Alert Rules

Create Prometheus alert rules for Traefik.

### PrometheusRule

```yaml
# prometheus-rules.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: traefik-alerts
  namespace: traefik
spec:
  groups:
  - name: traefik
    interval: 30s
    rules:
    # High error rate
    - alert: TraefikHighErrorRate
      expr: |
        rate(traefik_entrypoint_requests_total{code=~"5.."}[5m])
        / rate(traefik_entrypoint_requests_total[5m]) > 0.05
      for: 5m
      annotations:
        summary: "High error rate on {{ $labels.entrypoint }}"

    # High latency
    - alert: TraefikHighLatency
      expr: |
        histogram_quantile(0.99,
          rate(traefik_entrypoint_request_duration_seconds_bucket[5m])) > 1
      for: 5m
      annotations:
        summary: "High latency on {{ $labels.entrypoint }}"

    # Service down
    - alert: TraefikServiceDown
      expr: traefik_service_server_up == 0
      for: 1m
      annotations:
        summary: "Service {{ $labels.service }} is down"
```

## Testing Observability

Generate traffic and verify metrics:

```bash
# Generate test traffic
for i in {1..1000}; do
  curl https://app.example.com/
done

# Check metrics endpoint
curl http://traefik-metrics.traefik:8082/metrics

# Query specific metrics
curl http://traefik-metrics.traefik:8082/metrics | grep traefik_service_requests_total

# Access Jaeger UI
kubectl port-forward -n observability svc/jaeger-query 16686:16686
# Visit http://localhost:16686

# Access Grafana
kubectl port-forward -n monitoring svc/grafana 3000:3000
# Visit http://localhost:3000
```

## Useful Prometheus Queries

```promql
# Total requests per second
sum(rate(traefik_entrypoint_requests_total[5m])) by (entrypoint)

# Requests by status code
sum(rate(traefik_entrypoint_requests_total[5m])) by (code)

# Average response time
avg(rate(traefik_entrypoint_request_duration_seconds_sum[5m]))
  /
avg(rate(traefik_entrypoint_requests_total[5m]))

# Top 5 slowest services
topk(5,
  histogram_quantile(0.95,
    rate(traefik_service_request_duration_seconds_bucket[5m])))

# Backend server health
traefik_service_server_up
```

## Troubleshooting

Common observability issues:

**Metrics not showing**: Verify metrics port is accessible:
```bash
kubectl port-forward -n traefik svc/traefik-metrics 8082:8082
curl localhost:8082/metrics
```

**Traces not appearing**: Check Jaeger connectivity:
```bash
kubectl logs -n traefik -l app.kubernetes.io/name=traefik | grep jaeger
```

**High cardinality**: Limit labels to avoid metric explosion

## Conclusion

Comprehensive observability with Prometheus metrics and distributed tracing is essential for operating Traefik effectively in production. By configuring metrics, tracing, alerts, and dashboards, you gain complete visibility into traffic patterns, performance, and errors. Always monitor key metrics like request rate, latency, and error rate, and use distributed tracing to debug complex request flows across microservices.
