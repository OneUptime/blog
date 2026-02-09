# How to Configure HPA with Multiple Metrics and Policies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, HPA, Autoscaling

Description: Configure Horizontal Pod Autoscaler with multiple metrics and scaling policies to create sophisticated autoscaling strategies that respond to diverse workload characteristics and constraints.

---

Real-world applications rarely depend on a single resource metric. A web application might be CPU-bound during request processing but memory-bound when caching responses. A data pipeline might need to scale based on queue depth, CPU usage, and processing latency simultaneously. HPA supports multiple metrics, allowing you to build comprehensive autoscaling strategies that consider all relevant capacity indicators.

When you configure multiple metrics, HPA calculates the desired replica count for each metric independently and selects the maximum value. This ensures your deployment scales to satisfy all constraints. Combined with flexible scaling policies for scale-up and scale-down, multiple metrics enable precise control over autoscaling behavior across different scenarios.

## Understanding Multi-Metric Scaling

HPA evaluates each metric separately using the same formula: desired replicas equals current replicas multiplied by current metric value divided by target value. For three metrics returning desired replica counts of 10, 15, and 12, HPA scales to 15 to satisfy all metrics.

This maximum selection strategy prevents under-provisioning. If CPU suggests 10 replicas but memory suggests 15, running only 10 would leave memory over-utilized even though CPU looks fine. Scaling to 15 ensures both CPU and memory stay within target thresholds.

## Combining CPU and Memory Metrics

Start with the most common combination: CPU and memory.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: dual-resource-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: application-server
  minReplicas: 5
  maxReplicas: 100

  metrics:
  # CPU-based scaling
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70

  # Memory-based scaling
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 75

  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
      selectPolicy: Max

    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 120
      selectPolicy: Min
```

This HPA scales when either CPU exceeds 70% or memory exceeds 75%, ensuring neither resource becomes a bottleneck.

## Adding Custom Application Metrics

Combine resource metrics with application-specific metrics from Prometheus.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: app-aware-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-gateway
  minReplicas: 10
  maxReplicas: 100

  metrics:
  # Resource metrics
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 65

  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80

  # Custom application metrics
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "100"

  - type: Pods
    pods:
      metric:
        name: request_latency_p95_milliseconds
      target:
        type: AverageValue
        averageValue: "200"

  behavior:
    scaleUp:
      stabilizationWindowSeconds: 30
      policies:
      - type: Percent
        value: 100
        periodSeconds: 60
      - type: Pods
        value: 10
        periodSeconds: 60
      selectPolicy: Max

    scaleDown:
      stabilizationWindowSeconds: 600
      policies:
      - type: Percent
        value: 10
        periodSeconds: 120
      selectPolicy: Min
```

Now HPA scales based on CPU, memory, request rate, and latency. If any metric suggests more replicas are needed, HPA scales up.

## Incorporating External Metrics

Add external metrics from cloud services or message queues.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: comprehensive-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: worker-pool
  minReplicas: 5
  maxReplicas: 200

  metrics:
  # Internal resource metrics
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 75

  # External queue depth from SQS
  - type: External
    external:
      metric:
        name: sqs_messages_visible
        selector:
          matchLabels:
            queue: production-tasks
      target:
        type: AverageValue
        averageValue: "20"  # 20 messages per pod

  # Custom processing rate metric
  - type: Pods
    pods:
      metric:
        name: tasks_processed_per_minute
      target:
        type: AverageValue
        averageValue: "50"

  behavior:
    scaleUp:
      stabilizationWindowSeconds: 120
      policies:
      - type: Percent
        value: 100
        periodSeconds: 90
      - type: Pods
        value: 20
        periodSeconds: 90
      selectPolicy: Max

    scaleDown:
      stabilizationWindowSeconds: 900
      policies:
      - type: Percent
        value: 15
        periodSeconds: 180
      selectPolicy: Min
```

This configuration scales based on CPU utilization, SQS queue depth, and processing throughput. Workers scale up when any constraint is reached.

## Using Object Metrics for Shared Resources

Object metrics track metrics associated with Kubernetes objects like Ingresses or Services.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ingress-aware-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend-service
  minReplicas: 10
  maxReplicas: 100

  metrics:
  # Standard resource metrics
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70

  # Ingress-level request rate
  - type: Object
    object:
      metric:
        name: requests_per_second
      describedObject:
        apiVersion: networking.k8s.io/v1
        kind: Ingress
        name: main-ingress
      target:
        type: Value
        value: "10k"  # Total requests per second

  # Per-pod custom metric
  - type: Pods
    pods:
      metric:
        name: active_connections
      target:
        type: AverageValue
        averageValue: "100"
```

Object metrics let you scale based on cluster-level resources rather than per-pod metrics.

## Implementing Different Policies for Different Scenarios

Configure multiple scaling policies to handle various situations.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: adaptive-policy-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: adaptive-service
  minReplicas: 10
  maxReplicas: 200

  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 65

  - type: Pods
    pods:
      metric:
        name: queue_depth_per_pod
      target:
        type: AverageValue
        averageValue: "25"

  behavior:
    scaleUp:
      stabilizationWindowSeconds: 0  # Immediate response

      policies:
      # For small deployments, add fixed number of pods
      - type: Pods
        value: 10
        periodSeconds: 30

      # For medium deployments, scale by percentage
      - type: Percent
        value: 50
        periodSeconds: 60

      # For large deployments, cap maximum growth
      - type: Pods
        value: 50
        periodSeconds: 60

      selectPolicy: Max  # Use most aggressive for scale-up

    scaleDown:
      stabilizationWindowSeconds: 600

      policies:
      # Remove slowly by percentage
      - type: Percent
        value: 10
        periodSeconds: 120

      # But never more than 5 pods at once
      - type: Pods
        value: 5
        periodSeconds: 120

      selectPolicy: Min  # Use most conservative for scale-down
```

Multiple policies let HPA adapt to deployment size. Small deployments scale by absolute pod count, while large deployments scale by percentage.

## Weighted Metric Priorities

While HPA doesn't support explicit metric weights, you can influence priority by adjusting target values.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: priority-aware-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-application
  minReplicas: 10
  maxReplicas: 100

  metrics:
  # High priority: scale aggressively for latency
  - type: Pods
    pods:
      metric:
        name: p99_latency_ms
      target:
        type: AverageValue
        averageValue: "100"  # Strict threshold

  # Medium priority: CPU with comfortable headroom
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 60  # Lower target for earlier scaling

  # Lower priority: memory with more tolerance
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 85  # Higher target, scales only when critical
```

Setting different target thresholds effectively prioritizes metrics. Lower targets cause earlier scaling, giving that metric higher effective priority.

## Monitoring Multi-Metric HPA

Track which metrics drive scaling decisions.

```bash
# View all current metrics and their values
kubectl get hpa comprehensive-hpa -o json | jq '.status.currentMetrics'

# Check which metric suggests most replicas
kubectl describe hpa comprehensive-hpa

# Watch metrics over time
watch -n 5 'kubectl get hpa comprehensive-hpa -o json | jq ".status.currentMetrics[] | {type: .type, current: .resource.current.averageUtilization // .pods.current.averageValue // .external.current.averageValue}"'
```

Understanding which metric triggers scaling helps you tune thresholds and policies.

## Handling Metric Failures

When a metric becomes unavailable, HPA behavior depends on configuration.

```bash
# Check for metric errors
kubectl describe hpa comprehensive-hpa | grep -A 5 Conditions

# View detailed metric status
kubectl get hpa comprehensive-hpa -o yaml | grep -A 20 currentMetrics
```

If a metric shows `<unknown>`, HPA ignores it and scales based on remaining metrics. This fail-open behavior prevents scaling paralysis but means you should monitor metric availability.

Set up alerts for metric failures.

```yaml
# Prometheus alert example
- alert: HPAMetricMissing
  expr: kube_horizontalpodautoscaler_status_condition{condition="ScalingActive",status="false"} == 1
  for: 5m
  annotations:
    summary: "HPA {{ $labels.horizontalpodautoscaler }} cannot get metrics"
```

## Testing Multi-Metric Scaling

Generate load that affects different metrics.

```bash
# CPU load
kubectl run cpu-load --image=progrium/stress --rm -it -- stress --cpu 8 --timeout 300s

# Memory load
kubectl run memory-load --image=progrium/stress --rm -it -- stress --vm 2 --vm-bytes 1G --timeout 300s

# Application load
kubectl run http-load --image=williamyeh/hey --rm -it -- -c 100 -z 5m http://service-name
```

Watch how HPA responds to different load types.

```bash
kubectl get hpa comprehensive-hpa -w
```

## Best Practices

Start with resource metrics (CPU and memory) then add application-specific metrics. Don't skip the basics in favor of custom metrics alone.

Set target values based on load testing and production observation. Don't guess optimal thresholds - measure them under realistic load.

Use stricter thresholds for metrics that directly impact user experience (like latency) and more relaxed thresholds for background capacity metrics (like CPU).

Configure asymmetric scaling with aggressive scale-up and conservative scale-down. This maintains performance during load increases while preventing oscillation.

Monitor the relationship between all metrics and replica count. Use Grafana dashboards or similar tools to visualize how metrics correlate with scaling decisions.

Test scaling behavior under combined load scenarios. Real production traffic affects multiple metrics simultaneously, so test that way.

Document why each metric was chosen and what its target value means. Future operators need context to tune or modify the configuration.

## Conclusion

Multi-metric HPA configurations create sophisticated autoscaling systems that respond to diverse capacity signals. By combining resource metrics, custom application metrics, and external metrics with appropriate scaling policies, you ensure your deployments scale based on actual system constraints rather than single-dimensional indicators.

The key is selecting metrics that accurately represent your application's capacity limits, setting appropriate target thresholds based on testing and observation, and configuring scaling policies that balance responsiveness with stability. With proper implementation and monitoring, multi-metric HPA provides robust autoscaling that maintains performance while efficiently using cluster resources.
