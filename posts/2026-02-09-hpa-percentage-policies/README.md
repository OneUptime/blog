# How to Use HPA with Percentage-Based Scale-Up and Scale-Down Policies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, HPA, Scaling

Description: Configure percentage-based HPA scaling policies to control how rapidly deployments scale up and down based on proportional changes rather than absolute pod counts.

---

Percentage-based scaling policies in HPA allow you to control scaling velocity as a proportion of current replica count. Instead of adding or removing a fixed number of pods, you scale by a percentage. This makes scaling behavior consistent regardless of deployment size, automatically adding more pods for large deployments and fewer for small ones.

A 50% scale-up policy adds 5 pods when you have 10 running, but adds 25 pods when you have 50 running. This proportional scaling maintains appropriate response times across different deployment sizes without requiring separate HPA configurations for different scales. Percentage policies are particularly useful for deployments that vary significantly in size over time or across environments.

## Understanding Percentage Policies

When HPA evaluates percentage policies, it calculates the number of pods as a percentage of current replicas. A 50% scale-up with 20 current replicas allows adding up to 10 pods (50% of 20). The actual pods added may be less if metrics don't warrant the full amount, but the policy sets the maximum rate of change.

Percentage policies work alongside pod-count policies. You can define both percentage and absolute pod policies, and HPA uses selectPolicy (Max, Min, or Disabled) to choose which applies in each situation.

## Basic Percentage Policy Configuration

Configure percentage-based scaling for both scale-up and scale-down.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: percentage-scaling-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-application
  minReplicas: 5
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
      - type: Percent
        value: 50  # Increase by up to 50% per period
        periodSeconds: 60

    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10  # Decrease by up to 10% per period
        periodSeconds: 120
```

This scales up quickly by adding 50% more capacity every minute when needed, but scales down slowly by removing only 10% every two minutes.

## Combining Percentage and Absolute Policies

Use both types for flexible scaling across deployment sizes.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: hybrid-policy-hpa
spec:
  scaleTargetRef:
    kind: Deployment
    name: api-server
  minReplicas: 10
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
      # Percentage-based for large deployments
      - type: Percent
        value: 100  # Double capacity
        periodSeconds: 60
      # Absolute for small deployments
      - type: Pods
        value: 20   # Add at least 20 pods
        periodSeconds: 60
      selectPolicy: Max  # Use whichever adds more pods

    scaleDown:
      stabilizationWindowSeconds: 600
      policies:
      # Conservative percentage
      - type: Percent
        value: 10
        periodSeconds: 180
      # Never remove more than 10 pods at once
      - type: Pods
        value: 10
        periodSeconds: 180
      selectPolicy: Min  # Use whichever removes fewer pods
```

This ensures small deployments scale by meaningful absolute amounts, while large deployments scale proportionally.

## Aggressive Percentage Scaling for Traffic Spikes

Configure aggressive percentage scaling for applications with sudden traffic increases.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: spike-handling-hpa
spec:
  scaleTargetRef:
    kind: Deployment
    name: traffic-spike-app
  minReplicas: 20
  maxReplicas: 1000

  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 60

  behavior:
    scaleUp:
      stabilizationWindowSeconds: 0  # Immediate response
      policies:
      - type: Percent
        value: 200  # Triple capacity if needed
        periodSeconds: 30
      - type: Pods
        value: 50   # Or add 50 pods minimum
        periodSeconds: 30
      selectPolicy: Max

    scaleDown:
      stabilizationWindowSeconds: 900  # Wait 15 minutes
      policies:
      - type: Percent
        value: 5    # Very conservative scale-down
        periodSeconds: 300
```

This can triple capacity rapidly during spikes but holds that capacity for a sustained period.

## Conservative Percentage Scaling for Stable Workloads

Use smaller percentages for predictable traffic.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: conservative-hpa
spec:
  scaleTargetRef:
    kind: Deployment
    name: stable-service
  minReplicas: 50
  maxReplicas: 150

  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70

  behavior:
    scaleUp:
      stabilizationWindowSeconds: 180  # Wait 3 minutes
      policies:
      - type: Percent
        value: 20   # Modest 20% increases
        periodSeconds: 120

    scaleDown:
      stabilizationWindowSeconds: 600
      policies:
      - type: Percent
        value: 5    # Very gradual scale-down
        periodSeconds: 300
```

This prevents unnecessary scaling for workloads with gradual, predictable changes.

## Percentage Policies for Memory-Based Scaling

Memory workloads benefit from even more conservative percentage policies.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: memory-percentage-hpa
spec:
  scaleTargetRef:
    kind: Deployment
    name: cache-cluster
  minReplicas: 10
  maxReplicas: 100

  metrics:
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 75

  behavior:
    scaleUp:
      stabilizationWindowSeconds: 120
      policies:
      - type: Percent
        value: 30   # Moderate increases for memory
        periodSeconds: 120

    scaleDown:
      stabilizationWindowSeconds: 1200  # Wait 20 minutes
      policies:
      - type: Percent
        value: 5    # Only 5% reduction at a time
        periodSeconds: 600  # Every 10 minutes
```

This accounts for memory workloads where rapid changes can cause thrashing.

## Multi-Stage Percentage Scaling

Different percentages for different periods enable nuanced scaling.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: multi-stage-hpa
spec:
  scaleTargetRef:
    kind: Deployment
    name: adaptive-service
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
      stabilizationWindowSeconds: 30
      policies:
      # Fast initial response
      - type: Percent
        value: 100
        periodSeconds: 30
      # Moderate subsequent scaling
      - type: Percent
        value: 30
        periodSeconds: 90
      # Cap maximum growth
      - type: Pods
        value: 100
        periodSeconds: 60
      selectPolicy: Max

    scaleDown:
      stabilizationWindowSeconds: 600
      policies:
      - type: Percent
        value: 15
        periodSeconds: 120
```

Though HPA doesn't explicitly support staged policies, defining multiple policies with different periods creates similar behavior.

## Monitoring Percentage-Based Scaling

Track how percentage policies affect scaling velocity.

```bash
# Monitor replica changes over time
kubectl get hpa percentage-scaling-hpa -w

# Calculate scaling rate
watch -n 10 'kubectl get hpa percentage-scaling-hpa -o json | jq "{current: .status.currentReplicas, desired: .status.desiredReplicas, percent_change: ((.status.desiredReplicas - .status.currentReplicas) / .status.currentReplicas * 100 | floor)}"'

# View scaling events
kubectl get events --field-selector involvedObject.name=percentage-scaling-hpa

# Track maximum scaling velocity
kubectl describe hpa percentage-scaling-hpa | grep -A 3 "Scale Up"
```

## Calculating Optimal Percentages

Determine appropriate percentage values through analysis.

```python
# Python script to analyze optimal scaling percentages
import pandas as pd

# Sample data: time series of required replicas
data = pd.DataFrame({
    'timestamp': pd.date_range('2026-01-01', periods=1440, freq='min'),
    'required_replicas': [10, 12, 15, 20, 30, 45, 60, 75, 80, 82] * 144  # Simplified
})

# Calculate percent changes
data['percent_change'] = data['required_replicas'].pct_change() * 100

# Find typical increase rates
p95_increase = data[data['percent_change'] > 0]['percent_change'].quantile(0.95)
p99_increase = data[data['percent_change'] > 0]['percent_change'].quantile(0.99)

print(f"95th percentile increase: {p95_increase:.1f}%")
print(f"99th percentile increase: {p99_increase:.1f}%")
print(f"Recommended scale-up percentage: {p95_increase * 1.2:.0f}%")  # Add 20% buffer
```

Base percentage policies on actual traffic growth patterns.

## Best Practices

Use larger percentages for scale-up (50-100%) and smaller percentages for scale-down (5-15%). This maintains performance during load increases while avoiding premature capacity reduction.

Combine percentage and absolute policies with selectPolicy: Max for scale-up and Min for scale-down. This ensures appropriate behavior across deployment sizes.

Set periodSeconds based on your pod startup time. No point allowing 100% increase every 30 seconds if pods take 2 minutes to become ready.

Test percentage policies under realistic load. Simulate traffic patterns to verify scaling velocity meets your requirements.

Adjust percentages based on deployment size ranges. Small deployments (under 10 pods) may need different percentages than large deployments (over 100 pods).

Monitor actual scaling velocity and adjust if you see frequent hits against policy limits. If you're consistently at the maximum percentage, consider increasing it.

## Troubleshooting

**Scaling is slower than expected**: Percentage might be too small for your deployment size. With 5 replicas and 10% scale-down, you remove at most 0.5 pods, which rounds to 0.

```bash
# Check calculated pod changes
kubectl get hpa -o json | jq '.status.currentReplicas, .status.desiredReplicas'
```

**Scaling is too aggressive**: Reduce percentage values or increase periodSeconds to slow scaling velocity.

**Different behavior in dev vs production**: Same percentage policies behave differently at different scales. Use hybrid percentage/absolute policies.

**Scaling stalls at certain sizes**: Check if you're hitting minReplicas or maxReplicas boundaries.

## Conclusion

Percentage-based scaling policies provide proportional scaling behavior that adapts to deployment size automatically. By defining scaling velocity as a percentage of current replicas rather than absolute pod counts, you create HPA configurations that work appropriately across different scales. Combined with absolute pod policies and appropriate period settings, percentage policies enable fine-grained control over autoscaling velocity while maintaining consistent behavior regardless of deployment size.
