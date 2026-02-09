# How to Use Prometheus Adapter for Custom Metrics API with HPA

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Kubernetes, HPA, Autoscaling, Custom Metrics

Description: Learn how to deploy the Prometheus Adapter to expose custom metrics for Kubernetes Horizontal Pod Autoscaler based on application-specific metrics.

---

Kubernetes Horizontal Pod Autoscaler (HPA) typically scales based on CPU and memory. But many applications need custom scaling logic based on request rates, queue lengths, or business metrics. The Prometheus Adapter bridges Prometheus metrics and the Kubernetes Custom Metrics API, enabling HPA to scale pods based on any metric Prometheus collects.

## Understanding the Prometheus Adapter

The Prometheus Adapter implements the Kubernetes Custom Metrics API and External Metrics API. It:
- Queries Prometheus for metrics
- Transforms metric names and labels to Kubernetes resource format
- Exposes metrics through the Custom Metrics API
- Allows HPA to make scaling decisions based on these metrics

The flow:
1. Application exposes metrics to Prometheus
2. Prometheus Adapter queries these metrics
3. Adapter exposes them via Custom Metrics API
4. HPA queries the API and scales pods accordingly

## Installing Prometheus Adapter

Deploy using Helm:

```bash
# Add the Prometheus community repository
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Install Prometheus Adapter
helm install prometheus-adapter prometheus-community/prometheus-adapter \
  --namespace monitoring \
  --set prometheus.url=http://prometheus-operated.monitoring.svc.cluster.local \
  --set prometheus.port=9090
```

Verify installation:

```bash
# Check if adapter is running
kubectl get pods -n monitoring -l app.kubernetes.io/name=prometheus-adapter

# Check if Custom Metrics API is available
kubectl get apiservice v1beta1.custom.metrics.k8s.io

# List available custom metrics
kubectl get --raw /apis/custom.metrics.k8s.io/v1beta1 | jq
```

## Basic Adapter Configuration

Configure the adapter to expose HTTP request rate:

```yaml
# prometheus-adapter-values.yaml
prometheus:
  url: http://prometheus-operated.monitoring.svc.cluster.local
  port: 9090

rules:
  default: false  # Disable default rules

  custom:
    # Expose HTTP requests per second per pod
    - seriesQuery: 'http_requests_total{namespace!="",pod!=""}'
      resources:
        overrides:
          namespace: {resource: "namespace"}
          pod: {resource: "pod"}
      name:
        matches: "^(.*)_total"
        as: "${1}_per_second"
      metricsQuery: |
        sum(rate(<<.Series>>{<<.LabelMatchers>>}[2m])) by (<<.GroupBy>>)
```

Apply the configuration:

```bash
helm upgrade prometheus-adapter prometheus-community/prometheus-adapter \
  --namespace monitoring \
  --values prometheus-adapter-values.yaml
```

## Creating an HPA Using Custom Metrics

Create an HPA that scales based on requests per second:

```yaml
# hpa-custom-metrics.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web-app-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-app
  minReplicas: 2
  maxReplicas: 10
  metrics:
    # Scale based on custom metric
    - type: Pods
      pods:
        metric:
          name: http_requests_per_second
        target:
          type: AverageValue
          averageValue: "1000"  # Target 1000 req/s per pod
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 50
          periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
        - type: Percent
          value: 100
          periodSeconds: 15
        - type: Pods
          value: 2
          periodSeconds: 15
      selectPolicy: Max
```

Apply the HPA:

```bash
kubectl apply -f hpa-custom-metrics.yaml

# Check HPA status
kubectl get hpa -n production

# Describe to see current metric values
kubectl describe hpa web-app-hpa -n production
```

## Advanced Adapter Rules

### Queue Length Scaling

Scale based on message queue depth:

```yaml
rules:
  custom:
    # Scale based on queue length
    - seriesQuery: 'rabbitmq_queue_messages{namespace!="",pod!=""}'
      resources:
        overrides:
          namespace: {resource: "namespace"}
          pod: {resource: "pod"}
      name:
        as: "queue_depth"
      metricsQuery: |
        avg(<<.Series>>{<<.LabelMatchers>>}) by (<<.GroupBy>>)
```

HPA configuration:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: queue-consumer-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: queue-consumer
  minReplicas: 1
  maxReplicas: 20
  metrics:
    - type: Pods
      pods:
        metric:
          name: queue_depth
        target:
          type: AverageValue
          averageValue: "100"  # Target 100 messages per pod
```

### Error Rate Scaling

Scale up when error rate increases:

```yaml
rules:
  custom:
    # Track error rate percentage
    - seriesQuery: 'http_requests_total{namespace!="",pod!="",status=~"5.."}'
      resources:
        overrides:
          namespace: {resource: "namespace"}
          pod: {resource: "pod"}
      name:
        as: "http_error_rate"
      metricsQuery: |
        (
          sum(rate(http_requests_total{status=~"5..",<<.LabelMatchers>>}[2m])) by (<<.GroupBy>>)
          / sum(rate(http_requests_total{<<.LabelMatchers>>}[2m])) by (<<.GroupBy>>)
        ) * 100
```

### Response Time Scaling

Scale based on latency:

```yaml
rules:
  custom:
    # 95th percentile latency
    - seriesQuery: 'http_request_duration_seconds_bucket{namespace!="",pod!=""}'
      resources:
        overrides:
          namespace: {resource: "namespace"}
          pod: {resource: "pod"}
      name:
        matches: "^(.*)_bucket"
        as: "${1}_p95"
      metricsQuery: |
        histogram_quantile(0.95,
          sum(rate(<<.Series>>{<<.LabelMatchers>>}[2m])) by (le, <<.GroupBy>>)
        )
```

HPA for latency:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: latency-based-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-service
  minReplicas: 3
  maxReplicas: 15
  metrics:
    - type: Pods
      pods:
        metric:
          name: http_request_duration_seconds_p95
        target:
          type: AverageValue
          averageValue: "0.5"  # Scale if p95 > 500ms
```

## Multiple Metrics in HPA

Combine multiple metrics for sophisticated scaling:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: multi-metric-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-app
  minReplicas: 3
  maxReplicas: 20
  metrics:
    # CPU (built-in metric)
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70

    # Request rate (custom metric)
    - type: Pods
      pods:
        metric:
          name: http_requests_per_second
        target:
          type: AverageValue
          averageValue: "1000"

    # Response time (custom metric)
    - type: Pods
      pods:
        metric:
          name: http_request_duration_seconds_p95
        target:
          type: AverageValue
          averageValue: "1"

    # Active connections (custom metric)
    - type: Pods
      pods:
        metric:
          name: active_connections
        target:
          type: AverageValue
          averageValue: "100"

  # Scale based on the metric that needs most replicas
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
    scaleUp:
      stabilizationWindowSeconds: 60
```

## External Metrics

Use external metrics for scaling based on non-pod metrics:

```yaml
# Adapter configuration for external metrics
rules:
  external:
    # Scale based on total queue length (not per pod)
    - seriesQuery: 'rabbitmq_queue_messages_ready'
      resources:
        template: <<.Resource>>
      name:
        as: "queue_messages_ready"
      metricsQuery: |
        sum(<<.Series>>{queue="orders"})
```

HPA with external metric:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: external-metric-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: order-processor
  minReplicas: 2
  maxReplicas: 30
  metrics:
    - type: External
      external:
        metric:
          name: queue_messages_ready
          selector:
            matchLabels:
              queue: orders
        target:
          type: Value
          value: "1000"  # Scale if total queue > 1000 messages
```

## Comprehensive Adapter Configuration

Complete configuration example:

```yaml
# prometheus-adapter-complete-values.yaml
prometheus:
  url: http://prometheus-operated.monitoring.svc.cluster.local
  port: 9090

rules:
  default: false

  # Resource metrics (CPU, memory)
  resource:
    cpu:
      containerQuery: |
        sum(rate(container_cpu_usage_seconds_total{<<.LabelMatchers>>,container!="",pod!=""}[3m])) by (<<.GroupBy>>)
      nodeQuery: |
        sum(rate(container_cpu_usage_seconds_total{<<.LabelMatchers>>,id='/'}[3m])) by (<<.GroupBy>>)
      resources:
        overrides:
          node: {resource: "node"}
          namespace: {resource: "namespace"}
          pod: {resource: "pod"}
      containerLabel: container

    memory:
      containerQuery: |
        sum(container_memory_working_set_bytes{<<.LabelMatchers>>,container!="",pod!=""}) by (<<.GroupBy>>)
      nodeQuery: |
        sum(container_memory_working_set_bytes{<<.LabelMatchers>>,id='/'}) by (<<.GroupBy>>)
      resources:
        overrides:
          node: {resource: "node"}
          namespace: {resource: "namespace"}
          pod: {resource: "pod"}
      containerLabel: container

  # Custom pod metrics
  custom:
    # HTTP request rate
    - seriesQuery: 'http_requests_total{namespace!="",pod!=""}'
      resources:
        overrides:
          namespace: {resource: "namespace"}
          pod: {resource: "pod"}
      name:
        matches: "^(.*)_total"
        as: "${1}_per_second"
      metricsQuery: |
        sum(rate(<<.Series>>{<<.LabelMatchers>>}[2m])) by (<<.GroupBy>>)

    # HTTP request duration (p95)
    - seriesQuery: 'http_request_duration_seconds_bucket{namespace!="",pod!=""}'
      resources:
        overrides:
          namespace: {resource: "namespace"}
          pod: {resource: "pod"}
      name:
        matches: "^(.*)_bucket"
        as: "${1}_p95"
      metricsQuery: |
        histogram_quantile(0.95,
          sum(rate(<<.Series>>{<<.LabelMatchers>>}[2m])) by (le, <<.GroupBy>>)
        )

    # Active connections
    - seriesQuery: 'active_connections{namespace!="",pod!=""}'
      resources:
        overrides:
          namespace: {resource: "namespace"}
          pod: {resource: "pod"}
      name:
        as: "active_connections"
      metricsQuery: |
        sum(<<.Series>>{<<.LabelMatchers>>}) by (<<.GroupBy>>)

  # External metrics
  external:
    # Queue depth
    - seriesQuery: 'rabbitmq_queue_messages_ready'
      resources:
        template: <<.Resource>>
      name:
        as: "queue_messages_ready"
      metricsQuery: |
        sum(<<.Series>>{<<.LabelMatchers>>})

    # Database connection pool
    - seriesQuery: 'pg_stat_database_connections'
      resources:
        template: <<.Resource>>
      name:
        as: "database_connections"
      metricsQuery: |
        sum(<<.Series>>{<<.LabelMatchers>>})
```

## Testing and Debugging

Check available metrics:

```bash
# List all custom metrics
kubectl get --raw /apis/custom.metrics.k8s.io/v1beta1 | jq '.resources[].name'

# Get specific metric for a pod
kubectl get --raw "/apis/custom.metrics.k8s.io/v1beta1/namespaces/production/pods/*/http_requests_per_second" | jq

# List external metrics
kubectl get --raw /apis/external.metrics.k8s.io/v1beta1 | jq
```

Check adapter logs:

```bash
# View adapter logs
kubectl logs -n monitoring -l app.kubernetes.io/name=prometheus-adapter

# Check for errors
kubectl logs -n monitoring -l app.kubernetes.io/name=prometheus-adapter | grep -i error
```

Test HPA behavior:

```bash
# Watch HPA in action
kubectl get hpa -n production -w

# Generate load to trigger scaling
kubectl run -n production load-generator --image=busybox --restart=Never -- \
  /bin/sh -c "while true; do wget -q -O- http://web-app:8080; done"
```

## Monitoring HPA Decisions

Create alerts for HPA issues:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: hpa-alerts
  namespace: monitoring
spec:
  groups:
    - name: hpa
      interval: 30s
      rules:
        - alert: HPAMaxedOut
          expr: |
            kube_horizontalpodautoscaler_status_current_replicas
            >= kube_horizontalpodautoscaler_spec_max_replicas
          for: 15m
          labels:
            severity: warning
          annotations:
            summary: "HPA {{ $labels.horizontalpodautoscaler }} is at maximum replicas"
            description: "Consider increasing max replicas or optimizing the application."

        - alert: HPAMetricUnavailable
          expr: |
            kube_horizontalpodautoscaler_status_condition{status="false",condition="ScalingActive"} == 1
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "HPA {{ $labels.horizontalpodautoscaler }} cannot get metrics"
            description: "Check Prometheus Adapter and metric availability."
```

## Best Practices

1. Start with conservative scaling thresholds and tune based on observation
2. Use stabilization windows to prevent flapping
3. Set appropriate min/max replica counts
4. Combine CPU/memory with custom metrics for robust scaling
5. Monitor HPA decisions and tune accordingly
6. Test HPA behavior with load testing before production
7. Use external metrics for scaling based on shared resources
8. Document scaling logic and thresholds in runbooks
9. Alert when HPA is maxed out or unable to get metrics
10. Regularly review and optimize scaling policies

## Conclusion

The Prometheus Adapter enables sophisticated autoscaling based on any metric Prometheus collects. By exposing custom metrics through the Kubernetes API, HPA can make intelligent scaling decisions tailored to your application's specific characteristics. Whether scaling on request rates, queue depths, latency, or business metrics, the Prometheus Adapter provides the flexibility needed for modern application autoscaling.
