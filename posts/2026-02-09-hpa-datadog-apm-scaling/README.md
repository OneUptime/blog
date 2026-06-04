# How to Implement HPA with Datadog Metrics for APM-Based Scaling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Datadog, HPA

Description: Implement Horizontal Pod Autoscaler with Datadog APM metrics to scale based on application performance monitoring data like request rate, error rate, and trace latency.

---

Datadog provides comprehensive application performance monitoring with detailed metrics about request throughput, error rates, trace latency, and custom business metrics. By integrating Datadog metrics with Kubernetes HPA through the Datadog Cluster Agent, you can scale based on actual application behavior observed through APM rather than just resource utilization.

This enables sophisticated scaling strategies like scaling up when error rates increase, scaling based on downstream service latency, or scaling on custom business metrics your application reports to Datadog. The Datadog Cluster Agent exposes these metrics through the Kubernetes external metrics API, making them available to HPA.

## Setting Up Datadog Cluster Agent

Install the Datadog Cluster Agent with external metrics and DatadogMetric query support enabled.

```yaml
datadog:
  apiKey: "your-datadog-api-key"
  appKey: "your-datadog-app-key"

clusterAgent:
  enabled: true
  metricsProvider:
    enabled: true
    useDatadogMetrics: true
```

Deploy with Helm.

```bash
helm repo add datadog https://helm.datadoghq.com
helm repo update

helm install datadog-agent datadog/datadog \
  --namespace datadog \
  --create-namespace \
  --set datadog.apiKey="your-api-key" \
  --set datadog.appKey="your-app-key" \
  --set clusterAgent.enabled=true \
  --set clusterAgent.metricsProvider.enabled=true \
  --set clusterAgent.metricsProvider.useDatadogMetrics=true

# Verify external metrics API

kubectl get apiservice v1beta1.external.metrics.k8s.io
```

## Scaling Based on Request Rate

Scale based on requests per second from Datadog APM.

```yaml
apiVersion: datadoghq.com/v1alpha1
kind: DatadogMetric
metadata:
  name: api-server-rps
  namespace: production
spec:
  query: "sum:trace.web.request.hits{service:api-server,env:production}.as_rate().rollup(60)"
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: datadog-requests-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  minReplicas: 10
  maxReplicas: 100

  metrics:
  - type: External
    external:
      metric:
        name: datadogmetric@production:api-server-rps
      target:
        type: AverageValue
        averageValue: "100"  # 100 requests/sec per pod

  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 120
```

Datadog APM automatically creates trace metrics for instrumented services. Replace `web.request` with the span name used by your service.

## Scaling on Error Rate

Scale up when error rates increase to handle issues.

```yaml
apiVersion: datadoghq.com/v1alpha1
kind: DatadogMetric
metadata:
  name: payment-error-rate
  namespace: production
spec:
  query: "100 * sum:trace.web.request.errors{service:payment-service,env:production}.as_rate().rollup(60) / sum:trace.web.request.hits{service:payment-service,env:production}.as_rate().rollup(60)"
---
apiVersion: datadoghq.com/v1alpha1
kind: DatadogMetric
metadata:
  name: payment-rps
  namespace: production
spec:
  query: "sum:trace.web.request.hits{service:payment-service,env:production}.as_rate().rollup(60)"
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: error-rate-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: payment-service
  minReplicas: 15
  maxReplicas: 100

  metrics:
  # Primary: error rate
  - type: External
    external:
      metric:
        name: datadogmetric@production:payment-error-rate
      target:
        type: Value
        value: "5"  # Scale when the error rate exceeds 5%

  # Secondary: request rate
  - type: External
    external:
      metric:
        name: datadogmetric@production:payment-rps
      target:
        type: AverageValue
        averageValue: "80"

  behavior:
    scaleUp:
      stabilizationWindowSeconds: 30
      policies:
      - type: Percent
        value: 100
        periodSeconds: 60
```

This adds capacity when errors spike and the errors are correlated with saturation.

## Scaling Based on Trace Latency

Use p99 latency from Datadog APM traces.

```yaml
apiVersion: datadoghq.com/v1alpha1
kind: DatadogMetric
metadata:
  name: web-frontend-p99-latency
  namespace: production
spec:
  query: "p99:trace.web.request{service:web-frontend,env:production}.rollup(60)"
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: latency-based-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-frontend
  minReplicas: 20
  maxReplicas: 200

  metrics:
  - type: External
    external:
      metric:
        name: datadogmetric@production:web-frontend-p99-latency
      target:
        type: Value
        value: "0.25"  # Scale when p99 exceeds 250ms

  behavior:
    scaleUp:
      stabilizationWindowSeconds: 90
      policies:
      - type: Percent
        value: 75
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 600
      policies:
      - type: Percent
        value: 10
        periodSeconds: 180
```

## Scaling on Custom Business Metrics

Use custom metrics sent to Datadog from your application.

```python
# Python application code with DogStatsD
from datadog import initialize, statsd

initialize(statsd_host='127.0.0.1', statsd_port=8125)

def process_order(order):
    # Process order
    order_value = order.total_amount

    # Send custom metric to Datadog
    statsd.increment('orders.processed')
    statsd.histogram('orders.value', order_value, tags=['env:production', 'service:order-processor'])

    return order
```

Scale based on the custom metric.

```yaml
apiVersion: datadoghq.com/v1alpha1
kind: DatadogMetric
metadata:
  name: order-processor-orders
  namespace: production
spec:
  query: "sum:orders.processed{env:production,service:order-processor}.rollup(60)"
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: custom-metric-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: order-processor
  minReplicas: 10
  maxReplicas: 150

  metrics:
  - type: External
    external:
      metric:
        name: datadogmetric@production:order-processor-orders
      target:
        type: AverageValue
        averageValue: "50"  # 50 orders/sec per pod
```

## Combining Multiple Datadog Metrics

Use multiple APM metrics for comprehensive scaling.

```yaml
apiVersion: datadoghq.com/v1alpha1
kind: DatadogMetric
metadata:
  name: comprehensive-rps
  namespace: production
spec:
  query: "sum:trace.web.request.hits{service:comprehensive-service,env:production}.as_rate().rollup(60)"
---
apiVersion: datadoghq.com/v1alpha1
kind: DatadogMetric
metadata:
  name: comprehensive-p95-latency
  namespace: production
spec:
  query: "p95:trace.web.request{service:comprehensive-service,env:production}.rollup(60)"
---
apiVersion: datadoghq.com/v1alpha1
kind: DatadogMetric
metadata:
  name: comprehensive-errors
  namespace: production
spec:
  query: "sum:trace.web.request.errors{service:comprehensive-service,env:production}.as_rate().rollup(60)"
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: multi-datadog-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: comprehensive-service
  minReplicas: 15
  maxReplicas: 200

  metrics:
  # Request throughput
  - type: External
    external:
      metric:
        name: datadogmetric@production:comprehensive-rps
      target:
        type: AverageValue
        averageValue: "100"

  # P95 latency
  - type: External
    external:
      metric:
        name: datadogmetric@production:comprehensive-p95-latency
      target:
        type: Value
        value: "0.2"

  # Error count
  - type: External
    external:
      metric:
        name: datadogmetric@production:comprehensive-errors
      target:
        type: Value
        value: "10"

  # Standard CPU as backup
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## Monitoring Datadog-Based HPA

Check available Datadog metrics.

```bash
# List DatadogMetric resources
kubectl get datadogmetric -n production

# Check specific metric value
kubectl get --raw "/apis/external.metrics.k8s.io/v1beta1/namespaces/production/datadogmetric@production:api-server-rps" | jq .

# View HPA status
kubectl describe hpa datadog-requests-hpa

# Check Datadog Cluster Agent logs
kubectl logs -n datadog -l app=datadog-cluster-agent
```

## Best Practices

Use Datadog APM metrics that directly represent your application's capacity constraints. Request rate, latency percentiles, and error rates typically work well.

Set target values based on observed behavior in Datadog dashboards. Review actual metric values during normal and peak load to determine appropriate thresholds.

Combine Datadog metrics with resource metrics to ensure scaling responds to both application and infrastructure signals.

Tag your Datadog metrics consistently to enable proper filtering in DatadogMetric queries. Use service, env, and resource tags.

Monitor for metric lag. Datadog metrics may have slight delay compared to Kubernetes resource metrics. Account for this in stabilization windows.

Test metric availability before deploying HPA. Verify the Datadog Cluster Agent correctly exposes your metrics through the external metrics API.

## Troubleshooting

**Metrics not available**: Verify Datadog Cluster Agent has external metrics enabled and has valid API/App keys.

```bash
kubectl logs -n datadog -l app=datadog-cluster-agent | grep external_metrics
```

**HPA shows unknown for Datadog metrics**: Check that the HPA references an existing `DatadogMetric` and that the Datadog query returns one series.

**Scaling based on wrong service**: Ensure service tags in DatadogMetric queries match your service name in Datadog APM.

**High costs from Datadog custom metrics**: Each unique tag combination creates a custom metric. Keep tag cardinality low.

## Conclusion

Integrating Datadog APM metrics with Kubernetes HPA enables application-aware autoscaling based on actual user-facing performance. By scaling on request rate, latency, error rate, and custom business metrics tracked in Datadog, you create autoscaling systems that respond to real application behavior rather than just infrastructure metrics. This results in better performance maintenance and more efficient resource usage driven by observable application characteristics.
