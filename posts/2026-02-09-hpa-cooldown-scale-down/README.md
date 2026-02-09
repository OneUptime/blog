# How to Configure HPA Cooldown Period for Scale-Down Delay

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, HPA, Autoscaling

Description: Configure HPA cooldown period and stabilization windows to control scale-down delays, preventing premature capacity reduction and scaling oscillations in Kubernetes workloads.

---

Cooldown periods in HPA control the delay between scaling operations, particularly for scale-down actions. Without proper cooldown configuration, HPA can rapidly add and remove pods in response to fluctuating metrics, causing unnecessary churn. The cooldown period, implemented through stabilizationWindowSeconds in HPA v2, ensures metrics remain below thresholds for a sustained period before triggering scale-down.

This stabilization prevents premature capacity reduction during temporary traffic dips. If load drops for 30 seconds but then rebounds, you don't want to scale down and immediately scale back up. Proper cooldown configuration maintains stability while still responding to genuine load decreases, balancing responsiveness with operational efficiency.

## Understanding Stabilization Windows

The stabilizationWindowSeconds setting defines how long HPA looks back at historical scaling recommendations before making a decision. For scale-down, HPA examines all recommendations within the window and uses the highest value, preventing scale-down if any recent recommendation was higher.

If you set stabilizationWindowSeconds to 300 seconds for scale-down, HPA looks back 5 minutes. If at any point during those 5 minutes the metrics suggested more replicas than currently running, HPA won't scale down yet. Only when all recommendations in the window agree on fewer replicas does scale-down occur.

## Basic Cooldown Configuration

Configure different stabilization for scale-up and scale-down.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: stable-scaling-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-application
  minReplicas: 5
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
      stabilizationWindowSeconds: 60  # Scale up after 1 minute
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60

    scaleDown:
      stabilizationWindowSeconds: 600  # Wait 10 minutes before scaling down
      policies:
      - type: Percent
        value: 10
        periodSeconds: 120
```

This configuration responds quickly to load increases but waits 10 minutes after load decreases before scaling down.

## Setting Appropriate Cooldown Durations

Different workloads need different cooldown periods.

```yaml
# Short cooldown for highly variable traffic
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: short-cooldown-hpa
spec:
  scaleTargetRef:
    kind: Deployment
    name: variable-traffic-app
  minReplicas: 10
  maxReplicas: 50
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 65
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 120  # 2 minutes for variable traffic
      policies:
      - type: Percent
        value: 20
        periodSeconds: 60
---
# Long cooldown for stable traffic patterns
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: long-cooldown-hpa
spec:
  scaleTargetRef:
    kind: Deployment
    name: stable-traffic-app
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
    scaleDown:
      stabilizationWindowSeconds: 1800  # 30 minutes for stable traffic
      policies:
      - type: Percent
        value: 5
        periodSeconds: 300
```

Variable traffic needs shorter cooldowns to avoid holding excess capacity. Stable traffic benefits from longer cooldowns to avoid unnecessary scaling.

## Cooldown for Memory-Based Scaling

Memory workloads typically need longer cooldown periods.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: memory-cooldown-hpa
spec:
  scaleTargetRef:
    kind: Deployment
    name: cache-service
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
      stabilizationWindowSeconds: 180  # 3 minutes for memory increases
      policies:
      - type: Percent
        value: 50
        periodSeconds: 120
    scaleDown:
      stabilizationWindowSeconds: 900  # 15 minutes for memory decreases
      policies:
      - type: Percent
        value: 10
        periodSeconds: 300
```

Memory doesn't decrease as quickly as CPU when load drops, so longer cooldowns prevent premature scale-down while caches are still warm.

## Cooldown with Custom Metrics

Custom metrics often have more variance, requiring careful cooldown tuning.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: custom-metric-cooldown-hpa
spec:
  scaleTargetRef:
    kind: Deployment
    name: queue-worker
  minReplicas: 5
  maxReplicas: 200
  metrics:
  - type: Pods
    pods:
      metric:
        name: queue_items_per_pod
      target:
        type: AverageValue
        averageValue: "25"
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 120  # Wait 2 minutes to confirm queue growth
      policies:
      - type: Percent
        value: 100
        periodSeconds: 90
    scaleDown:
      stabilizationWindowSeconds: 600  # Wait 10 minutes for queue to clear
      policies:
      - type: Percent
        value: 20
        periodSeconds: 180
```

Queue metrics fluctuate as items are added and processed, so stabilization prevents reacting to normal operational variance.

## Disabling Scale-Down Cooldown

For some workloads, immediate scale-down is appropriate.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: immediate-scale-down-hpa
spec:
  scaleTargetRef:
    kind: Deployment
    name: batch-processor
  minReplicas: 1
  maxReplicas: 50
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
      - type: Pods
        value: 10
        periodSeconds: 30
    scaleDown:
      stabilizationWindowSeconds: 0  # No cooldown, scale down immediately
      policies:
      - type: Pods
        value: 5
        periodSeconds: 60
```

Batch processing workloads that complete discrete tasks can scale down immediately when work finishes.

## Monitoring Cooldown Effects

Track how cooldown periods affect scaling decisions.

```bash
# Watch HPA recommendations over time
kubectl get hpa stable-scaling-hpa -w

# Check stabilization status
kubectl describe hpa stable-scaling-hpa | grep -A 5 "Scale Down"

# View scaling events
kubectl get events --field-selector involvedObject.name=stable-scaling-hpa --sort-by='.lastTimestamp'

# Monitor desired vs current replicas
watch -n 5 'kubectl get hpa stable-scaling-hpa -o json | jq "{current: .status.currentReplicas, desired: .status.desiredReplicas}"'
```

If desired replicas is lower than current for extended periods, cooldown is preventing scale-down.

## Cooldown with Multiple Metrics

When using multiple metrics, cooldown applies to the overall scaling decision.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: multi-metric-cooldown-hpa
spec:
  scaleTargetRef:
    kind: Deployment
    name: api-server
  minReplicas: 10
  maxReplicas: 100
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Pods
    pods:
      metric:
        name: request_rate_per_pod
      target:
        type: AverageValue
        averageValue: "100"
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 600
      policies:
      - type: Percent
        value: 10
        periodSeconds: 120
```

Even if CPU suggests scaling down, if request rate recently suggested more replicas, cooldown prevents scale-down until both metrics agree for the full window.

## Adjusting Cooldown Based on Time of Day

Use different HPA configurations for predictable traffic patterns.

```bash
#!/bin/bash
# Script to adjust HPA cooldown based on time of day

hour=$(date +%H)

if [ $hour -ge 8 ] && [ $hour -lt 18 ]; then
  # Business hours: shorter cooldown for responsiveness
  kubectl patch hpa api-server-hpa --type='json' -p='[
    {"op": "replace", "path": "/spec/behavior/scaleDown/stabilizationWindowSeconds", "value": 300}
  ]'
else
  # Off hours: longer cooldown to avoid unnecessary scaling
  kubectl patch hpa api-server-hpa --type='json' -p='[
    {"op": "replace", "path": "/spec/behavior/scaleDown/stabilizationWindowSeconds", "value": 1800}
  ]'
fi
```

Run this as a CronJob to adapt cooldown to traffic patterns.

## Best Practices

Set scale-down cooldown at least 3-5 times longer than scale-up cooldown. It's safer to hold capacity temporarily than to remove it prematurely.

Base cooldown duration on your metric collection interval and traffic variability. If metrics are collected every 30 seconds and traffic varies over 5-minute cycles, use at least a 5-minute cooldown.

Monitor the frequency of scaling operations. If you see frequent scale-up followed by scale-down within minutes, increase cooldown.

Consider the cost of pod startup when setting cooldown. If pods take 2 minutes to start and become ready, cooldowns shorter than 2 minutes provide no benefit.

Test cooldown settings under realistic load patterns. Simulate your actual traffic variations to validate cooldown prevents unnecessary oscillation.

Document why specific cooldown values were chosen. Include information about traffic patterns and observed scaling behavior.

## Troubleshooting

**Scale-down never happens**: Cooldown might be too long, or metrics might not stay below threshold for the full window.

```bash
kubectl get hpa stable-scaling-hpa -o json | jq '.status'
```

**Rapid scaling oscillation**: Cooldown is too short. Increase stabilizationWindowSeconds.

**Slow response to load decreases**: Cooldown might be excessive for your traffic pattern. Reduce stabilizationWindowSeconds gradually.

**Unexpected scaling behavior**: Check all metrics contributing to scaling decisions. One metric with high recent values can prevent scale-down.

## Conclusion

Cooldown configuration through stabilizationWindowSeconds is essential for stable HPA behavior. By requiring sustained metric changes before scaling down, cooldowns prevent unnecessary pod churn while still responding to genuine load decreases. The key is balancing responsiveness with stability based on your workload's traffic patterns, metric volatility, and operational requirements. Proper cooldown configuration, combined with appropriate scaling policies and target metrics, creates autoscaling systems that maintain performance while minimizing unnecessary scaling operations.
