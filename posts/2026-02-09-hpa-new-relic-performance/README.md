# How to Use HPA with New Relic Metrics for Performance-Based Scaling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, New Relic, HPA

Description: Configure Horizontal Pod Autoscaler with New Relic performance metrics to scale based on application insights like Apdex scores, throughput, response times, and custom events.

---

New Relic provides deep application performance monitoring with metrics like Apdex scores, transaction throughput, error rates, and custom events. By integrating New Relic metrics with Kubernetes HPA through a metrics adapter, you can scale based on actual application performance as observed through New Relic's APM platform.

This enables performance-driven autoscaling where you scale up when Apdex scores drop below acceptable levels, when transaction times increase, or when custom business metrics indicate capacity constraints. The New Relic Metrics Adapter exposes these metrics through the Kubernetes external metrics API for HPA consumption.

## Setting Up New Relic Metrics Adapter

Deploy the New Relic Kubernetes integration with metrics adapter.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: newrelic-config
  namespace: newrelic
type: Opaque
stringData:
  license_key: "your-new-relic-license-key"
  account_id: "your-account-id"
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: newrelic-adapter-config
  namespace: newrelic
data:
  config.yaml: |
    externalMetrics:
      - name: apdex_score
        query: "SELECT apdex(duration) FROM Transaction WHERE appName = '{{.Labels.app}}'"
      - name: average_response_time
        query: "SELECT average(duration) FROM Transaction WHERE appName = '{{.Labels.app}}'"
      - name: throughput
        query: "SELECT rate(count(*), 1 minute) FROM Transaction WHERE appName = '{{.Labels.app}}'"
      - name: error_rate
        query: "SELECT percentage(count(*), WHERE error IS true) FROM Transaction WHERE appName = '{{.Labels.app}}'"
```

Install with Helm.

```bash
helm repo add newrelic https://helm-charts.newrelic.com
helm repo update

helm install newrelic-bundle newrelic/nri-bundle \
  --namespace newrelic \
  --create-namespace \
  --set global.licenseKey="your-license-key" \
  --set global.cluster="your-cluster-name" \
  --set infrastructure.enabled=true \
  --set prometheus.enabled=true \
  --set webhook.enabled=true \
  --set ksm.enabled=true \
  --set kubeEvents.enabled=true \
  --set newrelic-k8s-metrics-adapter.enabled=true \
  --set newrelic-k8s-metrics-adapter.personalAPIKey="your-api-key" \
  --set newrelic-k8s-metrics-adapter.accountID="your-account-id"

# Verify external metrics API
kubectl get apiservice | grep newrelic
```

## Scaling Based on Apdex Score

Apdex (Application Performance Index) scores rate user satisfaction from 0 to 1. Scale when satisfaction drops.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: apdex-based-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-application
  minReplicas: 10
  maxReplicas: 100

  metrics:
  - type: External
    external:
      metric:
        name: newrelic.apdex_score
        selector:
          matchLabels:
            app: web-application
            env: production
      target:
        type: Value
        value: "0.85"  # Scale up if Apdex drops below 0.85

  behavior:
    scaleUp:
      stabilizationWindowSeconds: 120
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 600
      policies:
      - type: Percent
        value: 10
        periodSeconds: 180
```

When Apdex scores drop below 0.85, indicating declining user satisfaction, HPA adds capacity to improve performance.

## Scaling on Transaction Throughput

Scale based on requests per minute from New Relic.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: throughput-hpa
spec:
  scaleTargetRef:
    kind: Deployment
    name: api-service
  minReplicas: 15
  maxReplicas: 150

  metrics:
  - type: External
    external:
      metric:
        name: newrelic.throughput
        selector:
          matchLabels:
            app: api-service
      target:
        type: AverageValue
        averageValue: "100"  # 100 requests per minute per pod

  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 75
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 15
        periodSeconds: 120
```

## Scaling Based on Response Time

Use average response time to maintain performance SLAs.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: response-time-hpa
spec:
  scaleTargetRef:
    kind: Deployment
    name: transaction-service
  minReplicas: 20
  maxReplicas: 200

  metrics:
  - type: External
    external:
      metric:
        name: newrelic.average_response_time_ms
        selector:
          matchLabels:
            app: transaction-service
            transaction: checkout
      target:
        type: Value
        value: "200"  # Scale when avg response time exceeds 200ms

  behavior:
    scaleUp:
      stabilizationWindowSeconds: 90
      policies:
      - type: Percent
        value: 100
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 600
      policies:
      - type: Percent
        value: 10
        periodSeconds: 300
```

## Scaling on Error Rate

Scale up when error rates increase.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: error-rate-hpa
spec:
  scaleTargetRef:
    kind: Deployment
    name: payment-processor
  minReplicas: 10
  maxReplicas: 80

  metrics:
  - type: External
    external:
      metric:
        name: newrelic.error_rate_percent
        selector:
          matchLabels:
            app: payment-processor
      target:
        type: Value
        value: "2"  # Scale when error rate exceeds 2%

  # Also scale on CPU as backup
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70

  behavior:
    scaleUp:
      stabilizationWindowSeconds: 30
      policies:
      - type: Pods
        value: 10
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 900
      policies:
      - type: Percent
        value: 5
        periodSeconds: 300
```

## Custom Event-Based Scaling

Use custom events sent to New Relic for business metric scaling.

```python
# Python application with New Relic agent
import newrelic.agent

@newrelic.agent.background_task()
def process_batch_job():
    # Process batch
    items_processed = process_items()

    # Record custom event
    newrelic.agent.record_custom_event(
        'BatchProcessing',
        {
            'itemsProcessed': items_processed,
            'processingTime': processing_time,
            'queueDepth': remaining_items
        }
    )
```

Configure HPA to scale on the custom event metric.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: custom-event-hpa
spec:
  scaleTargetRef:
    kind: Deployment
    name: batch-processor
  minReplicas: 5
  maxReplicas: 100

  metrics:
  - type: External
    external:
      metric:
        name: newrelic.custom.queue_depth
        selector:
          matchLabels:
            eventType: BatchProcessing
      target:
        type: AverageValue
        averageValue: "500"  # 500 items per pod
```

## Combining Multiple New Relic Metrics

Use multiple performance indicators for comprehensive scaling.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: multi-newrelic-hpa
spec:
  scaleTargetRef:
    kind: Deployment
    name: comprehensive-app
  minReplicas: 20
  maxReplicas: 250

  metrics:
  # Apdex score
  - type: External
    external:
      metric:
        name: newrelic.apdex_score
        selector:
          matchLabels:
            app: comprehensive-app
      target:
        type: Value
        value: "0.9"

  # Throughput
  - type: External
    external:
      metric:
        name: newrelic.throughput_rpm
        selector:
          matchLabels:
            app: comprehensive-app
      target:
        type: AverageValue
        averageValue: "120"

  # Response time
  - type: External
    external:
      metric:
        name: newrelic.response_time_ms
        selector:
          matchLabels:
            app: comprehensive-app
      target:
        type: Value
        value: "150"

  # CPU as baseline
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 65
```

## Monitoring New Relic-Based Scaling

Verify metrics and scaling behavior.

```bash
# List available New Relic metrics
kubectl get --raw "/apis/external.metrics.k8s.io/v1beta1" | jq '.resources[].name' | grep newrelic

# Check specific metric value
kubectl get --raw "/apis/external.metrics.k8s.io/v1beta1/namespaces/production/newrelic.apdex_score?labelSelector=app%3Dweb-application" | jq .

# View HPA status
kubectl describe hpa apdex-based-hpa

# Check adapter logs
kubectl logs -n newrelic -l app=newrelic-k8s-metrics-adapter
```

## Best Practices

Choose New Relic metrics that directly correlate with user experience. Apdex scores and response times are typically more meaningful than throughput alone.

Set metric thresholds based on your SLAs. If you guarantee sub-200ms response time, set HPA targets slightly better (150-180ms) to maintain headroom.

Combine performance metrics with resource metrics. New Relic provides application perspective, while CPU/memory provide infrastructure perspective.

Use New Relic's transaction segmentation to scale different service tiers independently based on their specific performance characteristics.

Monitor metric query costs in New Relic. Each HPA evaluation runs a NRQL query. Ensure your account has sufficient query limits.

Test metric lag. New Relic metrics may have 30-60 second delay. Account for this in stabilization windows.

## Troubleshooting

**Metrics not available**: Verify New Relic license key is valid and metrics adapter is running.

```bash
kubectl get pods -n newrelic -l app=newrelic-k8s-metrics-adapter
kubectl logs -n newrelic -l app=newrelic-k8s-metrics-adapter
```

**HPA shows unknown values**: Check that your NRQL queries return numeric values and app labels match.

**Scaling doesn't match New Relic dashboard**: Ensure HPA metric queries use same filters and time windows as your dashboards.

**High query costs**: Optimize NRQL queries and increase HPA evaluation interval if possible.

## Conclusion

New Relic metrics integration enables performance-driven Kubernetes autoscaling based on actual user experience metrics. By scaling on Apdex scores, response times, throughput, and custom events, you create autoscaling systems that maintain SLAs and user satisfaction rather than just managing resource utilization. This results in more effective capacity management that directly supports business objectives and user experience goals.
