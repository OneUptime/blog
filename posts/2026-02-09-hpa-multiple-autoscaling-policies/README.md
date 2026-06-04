# How to Configure HPA with Multiple Autoscaling Policies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, HPA, Policies

Description: Configure multiple HPA autoscaling policies with different parameters to handle various scaling scenarios and create sophisticated autoscaling behavior for diverse workload patterns.

---

HPA allows defining multiple scaling policies within a single behavior configuration, each with different parameters for scaling velocity. By combining multiple policies with different pod counts, percentages, and period seconds, you create nuanced autoscaling behavior that adapts to different situations automatically.

Multiple policies provide flexibility across deployment sizes and scaling scenarios. You might want to add at least 10 pods by choosing the policy that allows the largest change, or cap growth to 50% of the current count by choosing the policy that allows the smallest change. For scale-down, you might remove at most 10% but never more than 5 pods at once. Using selectPolicy (Max, Min, or Disabled), you control which policy applies when multiple policies recommend different scaling amounts.

## Understanding Policy Selection

When multiple policies exist, HPA evaluates each one and calculates how many pods that policy allows adding or removing. The selectPolicy determines which result to use. Max chooses the policy allowing the most change, Min chooses the most conservative, and Disabled prevents that scaling direction entirely.

For scale-up, Max selectPolicy enables aggressive scaling by choosing whichever policy adds more pods. For scale-down, Min selectPolicy provides conservative scaling by choosing whichever policy removes fewer pods.

## Basic Multiple Policy Configuration

Configure different policies for different scaling velocities.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: multi-policy-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-service
  minReplicas: 10
  maxReplicas: 200

  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70

  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      # Percentage-based policy
      - type: Percent
        value: 50
        periodSeconds: 60
      # Absolute pod policy
      - type: Pods
        value: 20
        periodSeconds: 60
      # Use whichever adds more pods
      selectPolicy: Max

    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      # Conservative percentage
      - type: Percent
        value: 10
        periodSeconds: 120
      # Cap absolute removal
      - type: Pods
        value: 5
        periodSeconds: 120
      # Use whichever removes fewer pods
      selectPolicy: Min
```

This configuration adds either 50% or 20 pods (whichever is more) every minute during scale-up, but removes either 10% or 5 pods (whichever is less) during scale-down.

## Policies for Different Deployment Sizes

Handle small and large deployments with different policies.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: size-adaptive-hpa
spec:
  scaleTargetRef:
    kind: Deployment
    name: adaptive-service
  minReplicas: 5
  maxReplicas: 500

  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 65

  behavior:
    scaleUp:
      stabilizationWindowSeconds: 30
      policies:
      # For small deployments: add fixed pods
      - type: Pods
        value: 15
        periodSeconds: 60
      # For medium deployments: scale by percentage
      - type: Percent
        value: 50
        periodSeconds: 60
      # Additional fixed-pod policy for large changes
      - type: Pods
        value: 100
        periodSeconds: 60
      selectPolicy: Max  # Use most aggressive for scale-up

    scaleDown:
      stabilizationWindowSeconds: 600
      policies:
      # Percentage-based removal
      - type: Percent
        value: 10
        periodSeconds: 180
      # But never more than this absolute amount
      - type: Pods
        value: 10
        periodSeconds: 180
      selectPolicy: Min  # Use most conservative for scale-down
```

At 10 pods, adding 15 is more than 50%, so the 15-pod policy wins. At 100 pods, 50% is 50 pods, so the percentage policy wins. At 250 pods, 50% is 125 pods, so the percentage policy still wins because selectPolicy is Max.

## Time-Based Policy Strategies

Different policies for different periods create phased scaling.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: phased-scaling-hpa
spec:
  scaleTargetRef:
    kind: Deployment
    name: phased-service
  minReplicas: 10
  maxReplicas: 300

  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70

  behavior:
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      # Rapid initial scale-up
      - type: Pods
        value: 50
        periodSeconds: 30
      # Moderate follow-up scaling
      - type: Percent
        value: 30
        periodSeconds: 90
      # Conservative long-term growth
      - type: Percent
        value: 15
        periodSeconds: 180
      selectPolicy: Max

    scaleDown:
      stabilizationWindowSeconds: 900
      policies:
      # Gradual scale-down
      - type: Percent
        value: 5
        periodSeconds: 300
      # Never remove more than this
      - type: Pods
        value: 3
        periodSeconds: 300
      selectPolicy: Min
```

This enables a fast short-period response while also allowing longer-period policies to participate when they permit the largest change.

## Policies with Different Metric Types

Configure shared policies for an HPA that scales from multiple metric types.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: metric-aware-hpa
spec:
  scaleTargetRef:
    kind: Deployment
    name: multi-metric-service
  minReplicas: 15
  maxReplicas: 200

  metrics:
  # CPU metric
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70

  # Memory metric
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 75

  # Custom latency metric
  - type: Pods
    pods:
      metric:
        name: request_latency_p95_ms
      target:
        type: AverageValue
        averageValue: "200"

  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      # Aggressive for latency issues
      - type: Percent
        value: 100
        periodSeconds: 45
      # Moderate for resource pressure
      - type: Percent
        value: 40
        periodSeconds: 90
      # Minimum absolute increase
      - type: Pods
        value: 10
        periodSeconds: 60
      selectPolicy: Max

    scaleDown:
      stabilizationWindowSeconds: 600
      policies:
      - type: Percent
        value: 10
        periodSeconds: 180
      - type: Pods
        value: 5
        periodSeconds: 180
      selectPolicy: Min
```

Though HPA doesn't track which metric triggered scaling, policies that allow aggressive response help any metric-driven scale-up.

## Choosing Percentage Caps or Floors

Choose whether policy selection should favor a lower bound or an upper bound for scaling velocity.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: bounded-policies-hpa
spec:
  scaleTargetRef:
    kind: Deployment
    name: bounded-service
  minReplicas: 20
  maxReplicas: 500

  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 65

  behavior:
    scaleUp:
      stabilizationWindowSeconds: 45
      policies:
      # Scale by percentage
      - type: Percent
        value: 75
        periodSeconds: 60
      # But always add at least this many
      - type: Pods
        value: 15
        periodSeconds: 60
      # Another fixed-pod option for larger immediate changes
      - type: Pods
        value: 80
        periodSeconds: 60
      selectPolicy: Max  # Favors the largest allowed scale-up

    scaleDown:
      stabilizationWindowSeconds: 600
      policies:
      # Remove percentage
      - type: Percent
        value: 12
        periodSeconds: 180
      # But always remove at least one
      - type: Pods
        value: 1
        periodSeconds: 180
      # Cap absolute removal for larger deployments
      - type: Pods
        value: 15
        periodSeconds: 180
      selectPolicy: Min
```

With selectPolicy set to Max, scale-up favors the largest allowed change, which acts like a floor when percentage-based scaling would be smaller. With selectPolicy set to Min, scale-down favors the smallest allowed change, which acts like a cap when another policy would remove more pods.

## Monitoring Multiple Policies

Track which policies are effective in different scenarios.

```bash
# View current HPA configuration

kubectl get hpa multi-policy-hpa -o yaml | grep -A 20 behavior

# Monitor scaling events over time
kubectl get events --field-selector involvedObject.name=multi-policy-hpa,reason=SuccessfulRescale

# Track replica changes to infer which policy applied
watch -n 5 'kubectl get hpa multi-policy-hpa -o json | jq "{current: .status.currentReplicas, desired: .status.desiredReplicas, metrics: .status.currentMetrics}"'

# Calculate actual scaling rates
kubectl get events --field-selector involvedObject.name=multi-policy-hpa -o json | jq '.items[] | select(.reason=="SuccessfulRescale") | {time: .lastTimestamp, message: .message}' | head -20
```

## Testing Policy Behavior

Simulate different scaling scenarios to validate policy configuration.

```bash
# Generate load to trigger scale-up
kubectl run load-generator --image=busybox --rm -it -- /bin/sh -c "while true; do wget -q -O- http://web-service.production.svc.cluster.local; done"

# Watch how policies respond
kubectl get hpa multi-policy-hpa -w

# Stop load to observe scale-down
# (terminate load generator)

# Verify scale-down follows configured policies
kubectl get events --field-selector involvedObject.name=multi-policy-hpa
```

## Best Practices

Use Max selectPolicy for scale-up to enable responsive scaling, and Min selectPolicy for scale-down to ensure conservative capacity reduction.

Define scale-up policies deliberately: use percentage-based policies for proportional scaling, fixed pod policies for minimum meaningful changes, and selectPolicy: Min when you need a hard cap on scale-up velocity.

For scale-down, include both percentage and absolute policies when you need to limit removals across different deployment sizes. Use selectPolicy: Min to prevent removing too many pods at once.

Test policies across different deployment sizes. Start at minReplicas, scale to maxReplicas, and observe behavior at various points.

Document the rationale for each policy. Explain what scenario each policy addresses and why specific values were chosen.

Review and adjust policies quarterly based on observed scaling patterns. Traffic growth or application changes may require policy updates.

Monitor for policies that never activate. If one policy always dominates, others might be redundant or misconfigured.

## Troubleshooting

**Scaling slower than expected**: Check if Min selectPolicy is limiting scale-up or if conservative policies dominate. Review selectPolicy and policy values.

**Scaling too aggressively**: Max selectPolicy on scale-down or overly aggressive policy values. Switch to Min or reduce percentage/pod values.

**Different behavior than anticipated**: Calculate what each policy allows at current replica count. Verify selectPolicy matches your intent.

**Scaling stalls at certain sizes**: Check if specific policies create bottlenecks at certain replica counts. Adjust policy values to eliminate gaps.

## Conclusion

Multiple autoscaling policies provide sophisticated control over HPA behavior across different scenarios and deployment sizes. By combining percentage-based and absolute policies with appropriate selectPolicy settings, you create autoscaling systems that respond appropriately whether you have 5 pods or 500 pods. The key is understanding how policies interact through selectPolicy and testing behavior across your entire scaling range to ensure policies provide the desired scaling characteristics in all situations.
