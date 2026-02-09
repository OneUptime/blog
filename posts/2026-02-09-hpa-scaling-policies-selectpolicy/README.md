# How to Configure HPA Scaling Policies with selectPolicy Max, Min, or Disabled

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Autoscaling, HPA

Description: Learn how to fine-tune HPA scaling behavior using selectPolicy to choose between Max, Min, or Disabled options for controlling how multiple scaling policies interact.

---

Kubernetes HPA v2 allows defining multiple scaling policies for scale-up and scale-down operations. When multiple policies apply simultaneously, the selectPolicy field determines which policy takes precedence. Understanding selectPolicy options gives you precise control over scaling aggressiveness and stability.

## Understanding Scaling Policies

Scaling policies define limits on how quickly HPA can change replica counts. Each policy specifies a scaling rate and period:

- **Pods**: Maximum number of pods to add or remove in the period
- **Percent**: Maximum percentage change in the period

When you define multiple policies, selectPolicy determines the winner:

- **Max**: Use the policy that allows the most change (most aggressive)
- **Min**: Use the policy that allows the least change (most conservative)
- **Disabled**: Ignore all policies and allow unlimited scaling

## Using selectPolicy Max for Aggressive Scale-Up

The Max policy chooses whichever policy allows adding the most replicas. This ensures fast response to increased load:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: aggressive-scaleup-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  minReplicas: 3
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
      stabilizationWindowSeconds: 0  # Scale up immediately
      selectPolicy: Max  # Choose the most aggressive policy
      policies:
      - type: Pods
        value: 10  # Can add up to 10 pods
        periodSeconds: 30
      - type: Percent
        value: 50  # Can add up to 50% of current replicas
        periodSeconds: 30
```

How this works:

- Current replicas: 10
- CPU utilization triggers scale-up
- Policy 1: Add 10 pods (result: 20 replicas)
- Policy 2: Add 50% (result: 15 replicas)
- With selectPolicy Max: Choose Policy 1, scale to 20 replicas

If replicas were at 30:

- Policy 1: Add 10 pods (result: 40 replicas)
- Policy 2: Add 50% (result: 45 replicas)
- With selectPolicy Max: Choose Policy 2, scale to 45 replicas

## Using selectPolicy Min for Conservative Scale-Down

For scale-down operations, Min policy provides stability by limiting how quickly replicas decrease:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: stable-scaledown-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: worker-deployment
  minReplicas: 5
  maxReplicas: 50
  metrics:
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 75
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300  # Wait 5 minutes before scaling down
      selectPolicy: Min  # Choose the most conservative policy
      policies:
      - type: Pods
        value: 2  # Remove at most 2 pods
        periodSeconds: 60
      - type: Percent
        value: 10  # Remove at most 10% of current replicas
        periodSeconds: 60
```

With 40 replicas and load decreasing:

- Policy 1: Remove 2 pods (result: 38 replicas)
- Policy 2: Remove 10% = 4 pods (result: 36 replicas)
- With selectPolicy Min: Choose Policy 1, scale to 38 replicas

This prevents drastic scale-down that might cause issues if load increases again.

## Combining Max for Scale-Up and Min for Scale-Down

A common pattern is aggressive scale-up with conservative scale-down:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: asymmetric-scaling-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-frontend
  minReplicas: 3
  maxReplicas: 80
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
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "800"
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 0
      selectPolicy: Max  # Aggressive scale-up
      policies:
      - type: Pods
        value: 15
        periodSeconds: 20
      - type: Percent
        value: 100  # Can double in 20 seconds
        periodSeconds: 20
    scaleDown:
      stabilizationWindowSeconds: 180
      selectPolicy: Min  # Conservative scale-down
      policies:
      - type: Pods
        value: 3
        periodSeconds: 90
      - type: Percent
        value: 5  # Maximum 5% reduction every 90 seconds
        periodSeconds: 90
```

This configuration:

- Responds quickly to traffic spikes (can double capacity in 20 seconds)
- Scales down slowly and carefully (at most 5% every 90 seconds)
- Prevents oscillation from rapid scale-down followed by immediate scale-up

## Using selectPolicy Disabled

The Disabled policy ignores all rate limits and allows HPA to scale directly to the calculated desired replica count:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: unlimited-scaling-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: batch-processor
  minReplicas: 1
  maxReplicas: 200
  metrics:
  - type: Pods
    pods:
      metric:
        name: queue_depth
      target:
        type: AverageValue
        averageValue: "50"
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 30
      selectPolicy: Disabled  # No rate limiting
    scaleDown:
      stabilizationWindowSeconds: 60
      selectPolicy: Disabled  # No rate limiting
```

With Disabled, if queue depth suddenly spikes requiring 150 replicas, HPA scales from 10 to 150 immediately (subject only to maxReplicas and cluster capacity).

Use Disabled carefully. It works well for:

- Batch processing workloads with queue-based metrics
- Development environments where fast iteration matters more than cost
- Workloads with very long startup times where aggressive scaling compensates for startup delays

## Time-Based Policy Selection

Different selectPolicy values for different time periods using multiple HPA resources:

```yaml
# Daytime HPA - aggressive scaling
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: daytime-hpa
  namespace: production
  annotations:
    schedule: "0 6 * * *"  # Activate at 6 AM
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: webapp
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
      selectPolicy: Max
      policies:
      - type: Percent
        value: 100
        periodSeconds: 15
---
# Nighttime HPA - conservative scaling
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: nighttime-hpa
  namespace: production
  annotations:
    schedule: "0 22 * * *"  # Activate at 10 PM
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: webapp
  minReplicas: 3
  maxReplicas: 30
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  behavior:
    scaleUp:
      selectPolicy: Min
      policies:
      - type: Pods
        value: 2
        periodSeconds: 60
```

Use a CronJob to switch between them:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: switch-to-daytime-hpa
  namespace: production
spec:
  schedule: "0 6 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: hpa-manager
          containers:
          - name: kubectl
            image: bitnami/kubectl:latest
            command:
            - /bin/sh
            - -c
            - |
              kubectl delete hpa nighttime-hpa
              kubectl apply -f /config/daytime-hpa.yaml
          restartPolicy: OnFailure
```

## Monitoring Policy Selection

Track which policies are being selected:

```bash
# Watch HPA decisions
kubectl get hpa webapp-hpa -w -o yaml

# Check events
kubectl describe hpa webapp-hpa
```

Look for events like:

```
Events:
  Type    Reason             Age   Message
  ----    ------             ----  -------
  Normal  SuccessfulRescale  2m    New size: 20; reason: cpu resource utilization above target
  Normal  SelectPolicy       2m    Selected scale-up policy: Percent (value: 50, period: 30s)
```

Create alerts for rapid scaling:

```yaml
# Prometheus alert
groups:
- name: hpa
  rules:
  - alert: RapidHPAScaling
    expr: |
      abs(delta(kube_horizontalpodautoscaler_status_current_replicas[2m])) > 20
    for: 5m
    annotations:
      summary: "HPA {{ $labels.horizontalpodautoscaler }} scaling rapidly"
      description: "Replica count changed by more than 20 in 2 minutes"
```

## Best Practices

**Match policy to workload characteristics**: Use Max for latency-sensitive applications that must scale quickly. Use Min for cost-sensitive workloads or those with expensive startup/shutdown operations.

**Consider stabilization windows**: Even with aggressive policies, set appropriate stabilization windows to avoid thrashing. Scale-up can have 0 stabilization, but scale-down should typically wait 2-5 minutes.

**Test policy interactions**: Load test your application to see how policies behave at different replica counts. A policy that works well at 10 replicas might be too aggressive at 100.

**Use Disabled sparingly**: Unlimited scaling can cause cluster resource exhaustion or cost surprises. Reserve Disabled for workloads where you control the metric source (like a message queue) and can prevent unbounded growth.

**Document your choices**: Add annotations explaining why you chose specific policies:

```yaml
metadata:
  annotations:
    scaling-policy-rationale: |
      Max policy on scale-up ensures we respond to traffic spikes within 30 seconds.
      Min policy on scale-down prevents cost optimization from degrading user experience.
```

The selectPolicy field gives you fine-grained control over HPA's scaling behavior. By choosing the right combination of Max, Min, and Disabled policies, you can optimize for performance, cost, or stability depending on your application's needs.
