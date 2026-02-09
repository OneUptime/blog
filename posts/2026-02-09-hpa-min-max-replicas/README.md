# How to Configure HPA minReplicas and maxReplicas Boundaries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, HPA, Configuration

Description: Configure appropriate minReplicas and maxReplicas boundaries in HPA to ensure baseline availability, prevent resource exhaustion, and maintain cost control while enabling effective autoscaling.

---

The minReplicas and maxReplicas settings in HPA define the boundaries of your autoscaling range. No matter what metrics indicate, HPA never scales below minReplicas or above maxReplicas. These boundaries serve critical functions: minReplicas ensures baseline availability and performance, while maxReplicas prevents runaway scaling that could exhaust cluster resources or budget.

Choosing appropriate values requires balancing multiple concerns. Set minReplicas too low and you risk poor performance or unavailability during traffic spikes. Set it too high and you waste resources during quiet periods. Set maxReplicas too low and you cap capacity during peak traffic. Set it too high and a misbehaving application could consume your entire cluster.

## Understanding Replica Boundaries

HPA calculates desired replicas based on metrics but constrains the result to your configured range. If metrics suggest 3 replicas but minReplicas is 5, HPA maintains 5. If metrics suggest 150 replicas but maxReplicas is 100, HPA scales to 100 and stops.

These boundaries also affect HPA behavior. When at minReplicas, HPA can only scale up. When at maxReplicas, HPA can only scale down. If you're consistently at maxReplicas, you're capping your application's capacity.

## Basic Boundary Configuration

Start with conservative boundaries and adjust based on observation.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: basic-boundaries-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-application
  minReplicas: 3   # Minimum for high availability
  maxReplicas: 50  # Cap growth at 50 pods

  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

Three replicas provides basic availability with rolling updates, while 50 provides substantial capacity growth.

## Setting minReplicas for High Availability

Ensure enough replicas for availability during updates and failures.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ha-boundaries-hpa
spec:
  scaleTargetRef:
    kind: Deployment
    name: critical-service
  minReplicas: 10  # High minimum for critical service
  maxReplicas: 200

  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 65
```

For critical services, set minReplicas high enough that losing one or two pods during updates or node failures doesn't impact performance.

Calculate minimum based on your pod disruption budget and rolling update strategy.

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: critical-service-pdb
spec:
  minAvailable: 8  # Always keep 8 healthy
  selector:
    matchLabels:
      app: critical-service
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: critical-service
spec:
  replicas: 10  # Matches HPA minReplicas
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: 2
```

With maxUnavailable of 1 and minAvailable of 8, you need at least 9 replicas, so minReplicas of 10 provides appropriate headroom.

## Calculating maxReplicas from Cluster Capacity

Prevent HPA from consuming entire cluster resources.

```bash
# Check node capacity
kubectl get nodes -o json | jq '.items[] | {name: .metadata.name, cpu: .status.capacity.cpu, memory: .status.capacity.memory}'

# Calculate maximum pods for your deployment
# If cluster has 100 cores total and each pod requests 200m CPU
# Maximum pods = 100 cores / 0.2 cores per pod = 500 pods
# Set maxReplicas to 70-80% of maximum to leave headroom
```

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: capacity-aware-hpa
spec:
  scaleTargetRef:
    kind: Deployment
    name: resource-intensive-app
  minReplicas: 5
  maxReplicas: 400  # 80% of calculated maximum 500

  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## Cost-Constrained Boundaries

Set maxReplicas based on budget constraints.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: cost-controlled-hpa
spec:
  scaleTargetRef:
    kind: Deployment
    name: budget-conscious-app
  minReplicas: 5
  maxReplicas: 30  # Limited by budget

  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 75
```

If each pod costs $10/month and your budget is $300/month, maxReplicas of 30 keeps costs under control.

## Different Boundaries for Different Environments

Use environment-specific boundaries.

```yaml
# Production: High availability, high capacity
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: app-hpa
  namespace: production
spec:
  scaleTargetRef:
    kind: Deployment
    name: application
  minReplicas: 10
  maxReplicas: 200
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 65
---
# Staging: Lower minimum, constrained maximum
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: app-hpa
  namespace: staging
spec:
  scaleTargetRef:
    kind: Deployment
    name: application
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
---
# Development: Minimal resources
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: app-hpa
  namespace: development
spec:
  scaleTargetRef:
    kind: Deployment
    name: application
  minReplicas: 1
  maxReplicas: 5
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 80
```

## Adjusting Boundaries Based on Traffic Patterns

Change boundaries for known traffic patterns.

```yaml
# Business hours configuration (apply 7 AM - 7 PM)
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: time-aware-hpa
  annotations:
    schedule: "business-hours"
spec:
  scaleTargetRef:
    kind: Deployment
    name: business-app
  minReplicas: 20  # Higher baseline during business hours
  maxReplicas: 200
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 60
```

Use a CronJob or external controller to update HPA boundaries based on time.

```bash
#!/bin/bash
# Script to adjust HPA boundaries by time of day
hour=$(date +%H)

if [ $hour -ge 7 ] && [ $hour -lt 19 ]; then
  # Business hours: 20-200 replicas
  kubectl patch hpa time-aware-hpa --type='json' -p='[
    {"op": "replace", "path": "/spec/minReplicas", "value": 20},
    {"op": "replace", "path": "/spec/maxReplicas", "value": 200}
  ]'
else
  # Off hours: 5-50 replicas
  kubectl patch hpa time-aware-hpa --type='json' -p='[
    {"op": "replace", "path": "/spec/minReplicas", "value": 5},
    {"op": "replace", "path": "/spec/maxReplicas", "value": 50}
  ]'
fi
```

## Monitoring Boundary Hits

Alert when HPA reaches boundaries.

```bash
# Check if at minReplicas
kubectl get hpa -o json | jq '.items[] | select(.status.currentReplicas == .spec.minReplicas) | {name: .metadata.name, replicas: .status.currentReplicas, min: .spec.minReplicas}'

# Check if at maxReplicas
kubectl get hpa -o json | jq '.items[] | select(.status.currentReplicas == .spec.maxReplicas) | {name: .metadata.name, replicas: .status.currentReplicas, max: .spec.maxReplicas}'
```

Set up Prometheus alerts.

```yaml
# Alert when at maxReplicas
- alert: HPAAtMaxReplicas
  expr: kube_horizontalpodautoscaler_status_current_replicas == kube_horizontalpodautoscaler_spec_max_replicas
  for: 10m
  labels:
    severity: warning
  annotations:
    summary: "HPA {{ $labels.horizontalpodautoscaler }} at maximum replicas"
    description: "Consider increasing maxReplicas or investigating high load"

# Alert when consistently at minReplicas with low CPU
- alert: HPAOverProvisionedMin
  expr: |
    kube_horizontalpodautoscaler_status_current_replicas == kube_horizontalpodautoscaler_spec_min_replicas
    and
    kube_horizontalpodautoscaler_status_condition{condition="ScalingLimited",status="true"} == 1
    and
    avg(container_cpu_usage_seconds_total) by (pod) < 0.3
  for: 6h
  labels:
    severity: info
  annotations:
    summary: "HPA {{ $labels.horizontalpodautoscaler }} may have excessive minReplicas"
    description: "Consider reducing minReplicas to save costs"
```

## Gradually Adjusting Boundaries

Start conservative and adjust based on data.

```yaml
# Week 1: Conservative boundaries
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: tuning-hpa
spec:
  scaleTargetRef:
    kind: Deployment
    name: new-service
  minReplicas: 10  # Start high for safety
  maxReplicas: 50  # Limit growth initially
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 60
```

After observing for a week:

```bash
# Check actual replica usage
kubectl top pods -l app=new-service | tail -n +2 | wc -l

# Check HPA history
kubectl get events --field-selector involvedObject.name=tuning-hpa | grep -E "Scaled|max|min"

# If never below 8 replicas, reduce minReplicas
# If hitting maxReplicas frequently, increase it
kubectl patch hpa tuning-hpa --type='json' -p='[
  {"op": "replace", "path": "/spec/minReplicas", "value": 8},
  {"op": "replace", "path": "/spec/maxReplicas", "value": 100}
]'
```

## Best Practices

Set minReplicas to at least 2 for production workloads to ensure availability during updates. For critical services, use 3 or more.

Calculate maxReplicas based on cluster capacity, budget constraints, and observed peak traffic. Leave 20-30% cluster capacity as headroom for other workloads.

Monitor how often you hit boundaries. Frequent hits indicate boundaries are too restrictive.

Adjust boundaries seasonally if traffic patterns change. E-commerce sites might increase maxReplicas before holiday seasons.

Document the rationale behind specific boundary values. Include traffic analysis, capacity calculations, and cost considerations.

Test boundary values through load testing. Verify that maxReplicas provides sufficient capacity for expected peak traffic plus a safety margin.

Review boundaries quarterly. As traffic grows or application efficiency improves, boundaries may need adjustment.

## Troubleshooting

**Always at minReplicas**: Metrics suggest fewer replicas than minimum. Either reduce minReplicas or adjust metric targets to utilize capacity better.

**Constantly at maxReplicas**: Increase maxReplicas or investigate why demand is so high. May indicate application inefficiency or genuine growth.

**Wide gap between min and max with little variation**: Either minReplicas is too high (wasting resources) or maxReplicas is unnecessarily high (no harm but misleading).

**Hitting maxReplicas during peak times**: Increase maxReplicas or optimize application to handle more load per pod.

## Conclusion

Proper configuration of minReplicas and maxReplicas provides guardrails for HPA autoscaling. These boundaries ensure baseline availability through minReplicas while preventing resource exhaustion through maxReplicas. The key is basing these values on actual data: observed traffic patterns, measured pod capacity, cluster resources, and budget constraints. With appropriate boundaries and continuous monitoring, HPA can effectively scale your workloads within safe operational parameters while maintaining performance and cost efficiency.
