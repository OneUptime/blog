# How to Configure HPA Behavior Policies for Scale-Up and Scale-Down Rates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, HPA, Autoscaling

Description: Configure Horizontal Pod Autoscaler behavior policies to control scale-up and scale-down rates, preventing aggressive scaling and ensuring smooth transitions during load changes.

---

The Horizontal Pod Autoscaler automatically adjusts replica counts based on resource metrics. By default, HPA scales aggressively, which can cause unnecessary pod churn and resource waste. Behavior policies give you precise control over how quickly HPA scales up and down, letting you balance responsiveness with stability.

Introduced in Kubernetes 1.18, HPA behavior policies let you define scaling velocity limits, stabilization windows, and pod change strategies. This prevents overreaction to temporary metric spikes while still responding quickly to sustained load changes.

## Understanding HPA Behavior

HPA behavior configuration has two main sections: scaleUp and scaleDown. Each section can define policies that control the maximum number or percentage of pods to add or remove during a scaling event, and stabilization windows that prevent rapid scaling oscillations.

The behavior field in HPA spec allows you to fine-tune scaling behavior independently for scale-up and scale-down operations, which typically have different requirements. Scale-up often needs to be fast to handle traffic spikes, while scale-down should be conservative to avoid disrupting stable workloads.

## Basic Behavior Configuration

Here's a basic HPA with behavior policies configured.

```yaml
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
  minReplicas: 3
  maxReplicas: 50

  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70

  # Behavior configuration
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
      - type: Pods
        value: 5
        periodSeconds: 60
      selectPolicy: Max

    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
      - type: Pods
        value: 2
        periodSeconds: 180
      selectPolicy: Min
```

This configuration allows scaling up by either 50% or 5 pods (whichever is larger) every 60 seconds, while limiting scale-down to either 10% or 2 pods (whichever is smaller).

## Controlling Scale-Up Rate

For applications that need to respond quickly to traffic increases, configure aggressive scale-up policies.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-server-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  minReplicas: 5
  maxReplicas: 100

  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 60

  behavior:
    scaleUp:
      # Short stabilization for fast response
      stabilizationWindowSeconds: 30

      policies:
      # Allow doubling in first minute
      - type: Percent
        value: 100
        periodSeconds: 60

      # Allow adding 10 pods quickly
      - type: Pods
        value: 10
        periodSeconds: 30

      # Use the most aggressive policy
      selectPolicy: Max
```

With this configuration, if CPU suddenly spikes, HPA can double the replica count or add 10 pods within 30 seconds, providing fast scaling for traffic bursts.

## Implementing Conservative Scale-Down

Scale-down should be more conservative to avoid removing capacity too quickly during temporary load dips.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: database-proxy-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: database-proxy
  minReplicas: 10
  maxReplicas: 100

  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 75

  behavior:
    scaleDown:
      # Long stabilization window
      stabilizationWindowSeconds: 600  # 10 minutes

      policies:
      # Scale down slowly
      - type: Percent
        value: 5
        periodSeconds: 180  # 3 minutes

      # Or remove at most 1 pod every 3 minutes
      - type: Pods
        value: 1
        periodSeconds: 180

      # Use the most conservative policy
      selectPolicy: Min
```

This ensures the deployment only scales down 5% or 1 pod every 3 minutes, and only after load stays low for 10 minutes, preventing premature capacity reduction.

## Combining Multiple Policies

Use multiple policies to handle different scaling scenarios appropriately.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: worker-pool-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: worker-pool
  minReplicas: 2
  maxReplicas: 200

  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 80

  behavior:
    scaleUp:
      stabilizationWindowSeconds: 0  # Scale up immediately

      policies:
      # For small deployments, add pods aggressively
      - type: Pods
        value: 20
        periodSeconds: 60

      # For large deployments, scale by percentage
      - type: Percent
        value: 50
        periodSeconds: 60

      # Use whichever adds more pods
      selectPolicy: Max

    scaleDown:
      stabilizationWindowSeconds: 300

      policies:
      # Remove at most 10% per minute
      - type: Percent
        value: 10
        periodSeconds: 60

      # But never more than 5 pods per minute
      - type: Pods
        value: 5
        periodSeconds: 60

      # Use whichever removes fewer pods
      selectPolicy: Min
```

This configuration scales up aggressively (adding up to 20 pods or 50%, whichever is more) but scales down conservatively (removing at most 10% or 5 pods, whichever is less).

## Handling Traffic Pattern Variations

Different traffic patterns require different behavior configurations.

```yaml
# For gradual traffic increases
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: gradual-load-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: analytics-engine
  minReplicas: 5
  maxReplicas: 50

  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70

  behavior:
    scaleUp:
      stabilizationWindowSeconds: 120
      policies:
      - type: Percent
        value: 25
        periodSeconds: 120
      selectPolicy: Max

    scaleDown:
      stabilizationWindowSeconds: 600
      policies:
      - type: Percent
        value: 10
        periodSeconds: 180
      selectPolicy: Min
---
# For spike traffic patterns
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: spike-traffic-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-frontend
  minReplicas: 10
  maxReplicas: 100

  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 60

  behavior:
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Pods
        value: 30
        periodSeconds: 30
      selectPolicy: Max

    scaleDown:
      stabilizationWindowSeconds: 900  # Wait 15 minutes
      policies:
      - type: Percent
        value: 5
        periodSeconds: 300
      selectPolicy: Min
```

The gradual load configuration scales moderately in both directions, while the spike traffic configuration scales up very quickly but holds capacity longer before scaling down.

## Disabling Scale-Down

For certain workloads, you might want to prevent scale-down entirely during specific time periods.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: no-scale-down-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: critical-service
  minReplicas: 20
  maxReplicas: 100

  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70

  behavior:
    scaleUp:
      policies:
      - type: Percent
        value: 100
        periodSeconds: 60

    scaleDown:
      # Disable scale-down
      policies:
      - type: Pods
        value: 0
        periodSeconds: 60
      selectPolicy: Disabled
```

With selectPolicy set to Disabled, the HPA will never scale down, only up. This is useful during critical business periods or when you want to manually control scale-down timing.

## Monitoring Behavior Policy Effects

Track how behavior policies affect scaling decisions.

```bash
# Watch HPA scaling events
kubectl get hpa web-app-hpa -w

# Check detailed HPA status
kubectl describe hpa web-app-hpa

# View scaling events
kubectl get events --field-selector involvedObject.name=web-app-hpa

# Check current and desired replica counts
kubectl get hpa web-app-hpa -o json | \
  jq '{current: .status.currentReplicas, desired: .status.desiredReplicas}'
```

Monitor scaling frequency to validate your policies prevent excessive pod churn while still responding appropriately to load changes.

## Adjusting Policies Based on Metrics

When scaling on multiple metrics, behavior policies apply to the combined scaling decision.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: multi-metric-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: app-server
  minReplicas: 5
  maxReplicas: 50

  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80

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

HPA calculates the desired replica count for each metric and chooses the highest value. The behavior policies then limit how quickly that calculated replica count can be reached.

## Handling Initial Scale-Up

For deployments starting at minReplicas, the first scale-up is particularly important.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: initial-scale-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: batch-processor
  minReplicas: 1
  maxReplicas: 100

  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 80

  behavior:
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      # Allow aggressive initial scale-up
      - type: Pods
        value: 50
        periodSeconds: 60
      - type: Percent
        value: 100
        periodSeconds: 60
      selectPolicy: Max
```

This configuration allows rapid scale-up from the minimum, which is important for workloads that start small but need to quickly grow to handle load.

## Best Practices

Set stabilization windows appropriately for your workload characteristics. Longer windows reduce scaling frequency but increase response time to load changes.

Use percentage-based policies for large deployments and pod-based policies for small ones. This ensures scaling remains proportional regardless of deployment size.

Make scale-down more conservative than scale-up. It's generally safer to hold extra capacity temporarily than to prematurely reduce it and face service degradation.

Test behavior policies under realistic load scenarios to ensure they provide the desired balance between responsiveness and stability. Use load testing tools to simulate traffic patterns.

Document your scaling strategy and the rationale behind specific behavior policy values. This helps team members understand why certain policies are configured the way they are.

## Conclusion

HPA behavior policies give you precise control over autoscaling rates, preventing both overreaction to temporary load changes and delayed response to sustained traffic growth. By configuring appropriate scale-up and scale-down policies, you can build autoscaling systems that are both responsive and stable.

The ability to independently control scale-up and scale-down behavior, combined with multiple policy options and selection strategies, provides the flexibility needed to handle diverse workload patterns. With proper tuning based on your application's characteristics and traffic patterns, HPA behavior policies help you maintain optimal performance while minimizing resource waste.
