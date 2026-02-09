# How to Implement HPA with Datadog Metrics for APM-Based Scaling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Datadog, HPA

Description: Implement Horizontal Pod Autoscaler with Datadog APM metrics to scale based on application performance monitoring data like request rate, error rate, and trace latency.

---

Datadog provides comprehensive application performance monitoring with detailed metrics about request throughput, error rates, trace latency, and custom business metrics. By integrating Datadog metrics with Kubernetes HPA through the Datadog Cluster Agent, you can scale based on actual application behavior observed through APM rather than just resource utilization.

This enables sophisticated scaling strategies like scaling up when error rates increase, scaling based on downstream service latency, or scaling on custom business metrics your application reports to Datadog. The Datadog Cluster Agent exposes these metrics through the Kubernetes external metrics API, making them available to HPA.

## Setting Up Datadog Cluster Agent

Install the Datadog Cluster Agent with external metrics enabled.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: datadog-secret
  namespace: datadog
type: Opaque
stringData:
  api-key: "your-datadog-api-key"
  app-key: "your-datadog-app-key"
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: datadog-cluster-agent-config
  namespace: datadog
data:
  datadog-cluster.yaml: |
    cluster_agent:
      enabled: true
    external_metrics:
      enabled: true
      port: 8443
    kubernetes:
      collect_metadata_tags: true
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
  --set clusterAgent.metricsProvider.enabled=true

# Verify external metrics API
kubectl get apiservice | grep datadoghq
```

## Scaling Based on Request Rate

Scale based on requests per second from Datadog APM.

```yaml
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
        name: datadog.trace.requests_per_second
        selector:
          matchLabels:
            service: api-server
            env: production
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

Datadog APM automatically tracks request rates for instrumented services.

## Scaling on Error Rate

Scale up when error rates increase to handle issues.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: error-rate-hpa
spec:
  scaleTargetRef:
    kind: Deployment
    name: payment-service
  minReplicas: 15
  maxReplicas: 100

  metrics:
  # Primary: error rate
  - type: External
    external:
      metric:
        name: datadog.trace.error_rate
        selector:
          matchLabels:
            service: payment-service
            env: production
      target:
        type: Value
        value: "50"  # Scale when errors exceed 50/min

  # Secondary: request rate
  - type: External
    external:
      metric:
        name: datadog.trace.requests_per_second
        selector:
          matchLabels:
            service: payment-service
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

This adds capacity when errors spike, helping resolve issues through increased capacity.

## Scaling Based on Trace Latency

Use p99 latency from Datadog APM traces.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: latency-based-hpa
spec:
  scaleTargetRef:
    kind: Deployment
    name: web-frontend
  minReplicas: 20
  maxReplicas: 200

  metrics:
  - type: External
    external:
      metric:
        name: datadog.trace.p99_latency_ms
        selector:
          matchLabels:
            service: web-frontend
            resource: GET /api/data
      target:
        type: Value
        value: "250"  # Scale when p99 exceeds 250ms

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
# Python application code with datadog client
from datadog import initialize, statsd

initialize(api_key='your-api-key', app_key='your-app-key')

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
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: custom-metric-hpa
spec:
  scaleTargetRef:
    kind: Deployment
    name: order-processor
  minReplicas: 10
  maxReplicas: 150

  metrics:
  - type: External
    external:
      metric:
        name: datadog.custom.orders.processed_per_second
        selector:
          matchLabels:
            env: production
            service: order-processor
      target:
        type: AverageValue
        averageValue: "50"  # 50 orders/sec per pod
```

## Combining Multiple Datadog Metrics

Use multiple APM metrics for comprehensive scaling.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: multi-datadog-hpa
spec:
  scaleTargetRef:
    kind: Deployment
    name: comprehensive-service
  minReplicas: 15
  maxReplicas: 200

  metrics:
  # Request throughput
  - type: External
    external:
      metric:
        name: datadog.trace.requests_per_second
        selector:
          matchLabels:
            service: comprehensive-service
      target:
        type: AverageValue
        averageValue: "100"

  # P95 latency
  - type: External
    external:
      metric:
        name: datadog.trace.p95_latency_ms
        selector:
          matchLabels:
            service: comprehensive-service
      target:
        type: Value
        value: "200"

  # Error count
  - type: External
    external:
      metric:
        name: datadog.trace.errors_per_minute
        selector:
          matchLabels:
            service: comprehensive-service
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
# List all external metrics
kubectl get --raw "/apis/external.metrics.k8s.io/v1beta1" | jq '.resources[].name' | grep datadog

# Check specific metric value
kubectl get --raw "/apis/external.metrics.k8s.io/v1beta1/namespaces/production/datadog.trace.requests_per_second" | jq .

# View HPA status
kubectl describe hpa datadog-requests-hpa

# Check Datadog Cluster Agent logs
kubectl logs -n datadog -l app=datadog-cluster-agent
```

## Best Practices

Use Datadog APM metrics that directly represent your application's capacity constraints. Request rate, latency percentiles, and error rates typically work well.

Set target values based on observed behavior in Datadog dashboards. Review actual metric values during normal and peak load to determine appropriate thresholds.

Combine Datadog metrics with resource metrics to ensure scaling responds to both application and infrastructure signals.

Tag your Datadog metrics consistently to enable proper filtering in HPA metric selectors. Use service, env, and resource tags.

Monitor for metric lag. Datadog metrics may have slight delay compared to Kubernetes resource metrics. Account for this in stabilization windows.

Test metric availability before deploying HPA. Verify the Datadog Cluster Agent correctly exposes your metrics through the external metrics API.

## Troubleshooting

**Metrics not available**: Verify Datadog Cluster Agent has external metrics enabled and has valid API/App keys.

```bash
kubectl logs -n datadog -l app=datadog-cluster-agent | grep external_metrics
```

**HPA shows unknown for Datadog metrics**: Check metric name and selector labels match exactly what Datadog reports.

**Scaling based on wrong service**: Ensure service tags in metric selector match your service name in Datadog APM.

**High costs from Datadog custom metrics**: Each unique tag combination creates a custom metric. Keep tag cardinality low.

## Conclusion

Integrating Datadog APM metrics with Kubernetes HPA enables application-aware autoscaling based on actual user-facing performance. By scaling on request rate, latency, error rate, and custom business metrics tracked in Datadog, you create autoscaling systems that respond to real application behavior rather than just infrastructure metrics. This results in better performance maintenance and more efficient resource usage driven by observable application characteristics.
