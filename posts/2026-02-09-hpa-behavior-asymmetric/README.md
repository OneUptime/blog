# How to configure HPA with behavior policies for asymmetric scaling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, HPA, Autoscaling

Description: Learn how to configure HPA behavior policies to implement asymmetric scaling patterns with different rates for scaling up and down.

---

The Horizontal Pod Autoscaler's behavior policies allow you to control exactly how your applications scale in response to changing load. Asymmetric scaling, where scale-up and scale-down happen at different rates, is a critical pattern for maintaining availability while optimizing costs. Rapid scale-up ensures you meet demand spikes quickly, while conservative scale-down prevents thrashing and maintains capacity for brief dips in traffic. This guide shows you how to configure sophisticated scaling behaviors using HPA policies.

## Understanding HPA Behavior Policies

Before Kubernetes 1.18, HPA scaling was relatively rigid. You could only configure the scale-down stabilization window and had limited control over scaling rates. The behavior field introduced in v2 HPA gives you fine-grained control over:

- How fast to scale up or down (rate of change)
- How to select between multiple scaling policies
- How long to wait before making scaling decisions (stabilization)
- Different behaviors for scale-up versus scale-down

This enables asymmetric scaling patterns that match real-world operational requirements.

## Basic Behavior Policy Structure

The behavior section has two main components: scaleUp and scaleDown:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web-app-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-app
  minReplicas: 2
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
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 15
      - type: Pods
        value: 4
        periodSeconds: 15
      selectPolicy: Max
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
      selectPolicy: Min
```

This configuration implements aggressive scale-up and conservative scale-down.

## Scaling Policy Types

HPA supports two policy types:

### Percent Policies

Percent policies specify scaling as a percentage of current replicas:

```yaml
policies:
- type: Percent
  value: 100
  periodSeconds: 15
```

This doubles the replica count every 15 seconds. If you have 2 replicas, it scales to 4, then 8, then 16. Percent policies are effective for rapid exponential growth but can overshoot on large deployments.

### Pods Policies

Pods policies specify an absolute number of replicas to add or remove:

```yaml
policies:
- type: Pods
  value: 5
  periodSeconds: 30
```

This adds 5 pods every 30 seconds. Pods policies give predictable linear scaling and work well when you know your capacity needs precisely.

## Policy Selection Strategies

When multiple policies apply, selectPolicy determines which one wins:

### Max Selection (Aggressive Scaling)

```yaml
selectPolicy: Max
```

Uses the policy that results in the most aggressive change. For scale-up, this takes the policy that adds the most replicas. For scale-down, it takes the policy that removes the most replicas.

### Min Selection (Conservative Scaling)

```yaml
selectPolicy: Min
```

Uses the policy that results in the least aggressive change. For scale-up, this takes the policy that adds the fewest replicas. For scale-down, it takes the policy that removes the fewest replicas.

### Disabled

```yaml
selectPolicy: Disabled
```

Prevents scaling in that direction entirely. Useful for maintenance windows or when you want manual control over scale-down.

## Asymmetric Scaling Pattern 1: Fast Up, Slow Down

This is the most common pattern. Scale up quickly to handle load spikes, but scale down slowly to avoid thrashing:

```yaml
behavior:
  scaleUp:
    stabilizationWindowSeconds: 0
    policies:
    - type: Percent
      value: 100
      periodSeconds: 15
    - type: Pods
      value: 4
      periodSeconds: 15
    selectPolicy: Max
  scaleDown:
    stabilizationWindowSeconds: 300
    policies:
    - type: Percent
      value: 10
      periodSeconds: 60
    selectPolicy: Min
```

Scale-up behavior:
- No stabilization (reacts immediately)
- Doubles capacity every 15 seconds OR adds 4 pods, whichever is more
- Chooses the most aggressive option

Scale-down behavior:
- Waits 5 minutes before scaling down
- Removes at most 10% of replicas per minute
- Chooses the least aggressive option

## Asymmetric Scaling Pattern 2: Burst Scaling

Handle sudden traffic bursts with immediate capacity, then gradually scale down:

```yaml
behavior:
  scaleUp:
    stabilizationWindowSeconds: 0
    policies:
    - type: Pods
      value: 10
      periodSeconds: 10
    - type: Percent
      value: 200
      periodSeconds: 10
    selectPolicy: Max
  scaleDown:
    stabilizationWindowSeconds: 600
    policies:
    - type: Pods
      value: 1
      periodSeconds: 120
```

This configuration:
- Adds up to 10 pods or triples capacity every 10 seconds during scale-up
- Waits 10 minutes after load decreases before scaling down
- Removes only 1 pod every 2 minutes during scale-down

Perfect for applications with bursty traffic patterns like promotional campaigns or viral content.

## Asymmetric Scaling Pattern 3: Business Hours Optimization

Different behavior for expected high-traffic periods:

```yaml
# Primary HPA for business hours
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-business-hours-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
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
        averageUtilization: 60
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 30
      policies:
      - type: Percent
        value: 50
        periodSeconds: 30
    scaleDown:
      stabilizationWindowSeconds: 900
      policies:
      - type: Percent
        value: 5
        periodSeconds: 60
```

Combine this with a CronJob that adjusts minReplicas based on time of day:

```go
package main

import (
    "context"
    "log"
    "time"

    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/rest"
)

func adjustHPAForBusinessHours(clientset *kubernetes.Clientset) {
    ctx := context.Background()
    hour := time.Now().Hour()

    var minReplicas int32

    // Business hours: 8 AM - 8 PM
    if hour >= 8 && hour < 20 {
        minReplicas = 10
    } else {
        minReplicas = 3
    }

    hpa, err := clientset.AutoscalingV2().HorizontalPodAutoscalers("default").Get(ctx, "api-business-hours-hpa", metav1.GetOptions{})
    if err != nil {
        log.Printf("Error getting HPA: %v", err)
        return
    }

    if *hpa.Spec.MinReplicas != minReplicas {
        hpa.Spec.MinReplicas = &minReplicas
        _, err = clientset.AutoscalingV2().HorizontalPodAutoscalers("default").Update(ctx, hpa, metav1.UpdateOptions{})
        if err != nil {
            log.Printf("Error updating HPA: %v", err)
            return
        }
        log.Printf("Updated HPA minReplicas to %d", minReplicas)
    }
}

func main() {
    config, err := rest.InClusterConfig()
    if err != nil {
        log.Fatal(err)
    }

    clientset, err := kubernetes.NewForConfig(config)
    if err != nil {
        log.Fatal(err)
    }

    ticker := time.NewTicker(15 * time.Minute)
    defer ticker.Stop()

    for {
        adjustHPAForBusinessHours(clientset)
        <-ticker.C
    }
}
```

## Asymmetric Scaling Pattern 4: Cost-Optimized Scaling

Minimize costs by scaling down aggressively during low traffic, but maintain availability:

```yaml
behavior:
  scaleUp:
    stabilizationWindowSeconds: 60
    policies:
    - type: Percent
      value: 100
      periodSeconds: 30
    selectPolicy: Max
  scaleDown:
    stabilizationWindowSeconds: 180
    policies:
    - type: Percent
      value: 25
      periodSeconds: 30
    - type: Pods
      value: 5
      periodSeconds: 30
    selectPolicy: Max
```

This configuration scales down more aggressively than typical patterns. Use it for:
- Development/staging environments
- Batch processing workloads
- Non-critical services with relaxed latency requirements

## Combining Multiple Metrics with Asymmetric Behavior

Use different behaviors for different metrics:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: multi-metric-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: worker-pool
  minReplicas: 2
  maxReplicas: 30
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
        name: queue_depth
      target:
        type: AverageValue
        averageValue: "100"
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 15
      - type: Pods
        value: 3
        periodSeconds: 15
      selectPolicy: Max
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Pods
        value: 1
        periodSeconds: 60
```

HPA evaluates all metrics and scales based on whichever requires the most replicas, but the behavior policies apply uniformly to all scaling decisions.

## Monitoring Scaling Behavior

Track HPA behavior with these Prometheus queries:

```promql
# Rate of scale-up events
rate(kube_hpa_status_current_replicas[5m]) > 0

# Time since last scaling event
time() - kube_hpa_status_last_scale_time

# Scaling velocity (replicas added per hour)
rate(kube_hpa_status_current_replicas[1h]) * 3600
```

Create alerts for anomalous scaling:

```yaml
groups:
- name: hpa_behavior
  rules:
  - alert: HPAScalingTooFrequent
    expr: changes(kube_hpa_status_current_replicas[5m]) > 3
    annotations:
      summary: "HPA {{ $labels.hpa }} scaling too frequently"

  - alert: HPANotScaling
    expr: kube_hpa_status_desired_replicas != kube_hpa_status_current_replicas
    for: 10m
    annotations:
      summary: "HPA {{ $labels.hpa }} not reaching desired state"
```

## Stabilization Window Tuning

The stabilization window is critical for preventing thrashing. It defines how long HPA looks back when making scaling decisions:

```yaml
stabilizationWindowSeconds: 300
```

With a 300-second window, HPA uses the highest metric value observed in the last 5 minutes for scale-up decisions, and the lowest value for scale-down decisions. This prevents rapid scaling cycles caused by temporary metric fluctuations.

Guidelines for tuning:
- Shorter windows (0-60s): Highly responsive, risk of thrashing
- Medium windows (60-300s): Balanced for most applications
- Longer windows (300-600s): Very stable, slower to react

## Testing Scaling Behavior

Validate your behavior policies with load testing:

```bash
# Generate load
kubectl run load-generator --image=busybox --restart=Never -- /bin/sh -c "while true; do wget -q -O- http://web-app.default.svc.cluster.local; done"

# Watch HPA behavior
kubectl get hpa web-app-hpa --watch

# Track scaling events
kubectl get events --field-selector involvedObject.name=web-app-hpa --watch
```

Measure the scaling response time and replica count to ensure policies work as expected.

## Conclusion

Asymmetric scaling with HPA behavior policies gives you precise control over how your applications respond to load changes. Fast scale-up ensures availability during demand spikes, while conservative scale-down prevents thrashing and reduces costs. Configure stabilization windows, combine percent and pods policies, and use selectPolicy to create scaling behaviors that match your operational requirements. Monitor scaling metrics to validate your configuration and adjust based on observed application behavior.
