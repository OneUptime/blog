# How to Configure Scale-Down Policies on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Autoscaling, Scale-Down Policies, HPA, Resource Management

Description: Learn how to configure scale-down policies for the Horizontal Pod Autoscaler on Talos Linux to prevent aggressive scaling and ensure application stability.

---

Scaling up is the easy part. When demand increases, adding more pods is relatively safe. Scaling down is where things get tricky. Remove pods too quickly and you risk service disruption. Remove them too slowly and you waste resources. On Talos Linux, configuring proper scale-down policies for the Horizontal Pod Autoscaler (HPA) ensures your applications stay stable while still releasing resources when they are no longer needed.

This guide dives deep into HPA scale-down behavior configuration on Talos Linux.

## Why Scale-Down Policies Matter

Without proper scale-down configuration, the HPA can exhibit problematic behavior:

- **Flapping**: The HPA scales up, then immediately scales down, then scales up again. This thrashing wastes resources and can cause connection drops.
- **Premature scale-down**: Traffic drops briefly (maybe during a deployment or a brief lull), the HPA removes pods, and then traffic returns to normal, causing degraded performance until the HPA scales back up.
- **Aggressive pod removal**: Removing too many pods at once can overwhelm the remaining pods and cause a cascading failure.

## Default Scale-Down Behavior

By default, the HPA uses these scale-down settings:

- Stabilization window: 300 seconds (5 minutes)
- Policy: Allow scaling down to 100% of the desired replica count per 15 seconds

This means the HPA waits 5 minutes after the last scale-up event before considering scale-down, but once it decides to scale down, it can remove all excess pods at once. For many workloads, this is too aggressive.

## Configuring the Behavior Field

The `behavior` field in the HPA spec gives you fine-grained control over scaling:

```yaml
# hpa-with-scaledown.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: webapp-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: webapp
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 60
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Pods
        value: 2
        periodSeconds: 60
      selectPolicy: Min
```

Let us break down each field:

### stabilizationWindowSeconds

This tells the HPA to look at the desired replica count over the past N seconds and use the highest value. It prevents scaling down based on a momentary dip in metrics.

```yaml
scaleDown:
  # Look at the last 5 minutes of recommendations
  # Use the highest recommended value from that window
  stabilizationWindowSeconds: 300
```

A longer window means more conservative scale-down behavior. For production web applications, 300-600 seconds is typical.

### Policies

Policies define the rate at which scaling can happen. You can specify limits in terms of absolute pod count or percentage:

```yaml
scaleDown:
  policies:
  # Remove at most 2 pods per 60 seconds
  - type: Pods
    value: 2
    periodSeconds: 60
  # Or remove at most 10% of current pods per 60 seconds
  - type: Percent
    value: 10
    periodSeconds: 60
```

### selectPolicy

When multiple policies are defined, `selectPolicy` determines which one to use:

- `Max` - Use the policy that allows the most change (more aggressive)
- `Min` - Use the policy that allows the least change (more conservative)
- `Disabled` - Disable scaling in this direction entirely

```yaml
scaleDown:
  policies:
  - type: Pods
    value: 2
    periodSeconds: 60
  - type: Percent
    value: 10
    periodSeconds: 60
  # Use the MORE conservative of the two policies
  selectPolicy: Min
```

## Common Scale-Down Configurations

### Conservative: Slow and Steady

For applications where stability is critical:

```yaml
# conservative-scaledown.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: critical-app-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: critical-app
  minReplicas: 3
  maxReplicas: 30
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 50
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 30
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleDown:
      # Wait 10 minutes before scaling down
      stabilizationWindowSeconds: 600
      policies:
      # Remove at most 1 pod per 2 minutes
      - type: Pods
        value: 1
        periodSeconds: 120
```

### Moderate: Balanced Approach

For most web applications:

```yaml
# moderate-scaledown.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: webapp-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: webapp
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 60
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Pods
        value: 4
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Pods
        value: 2
        periodSeconds: 60
      - type: Percent
        value: 10
        periodSeconds: 60
      selectPolicy: Min
```

### Aggressive: Fast Resource Recovery

For non-critical workloads where you want to free resources quickly:

```yaml
# aggressive-scaledown.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: batch-processor-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
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
        averageUtilization: 70
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 30
    scaleDown:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
```

### Prevent Scale-Down Entirely

Sometimes you want to scale up but never automatically scale down:

```yaml
# no-scaledown.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: webapp-no-scaledown
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: webapp
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 60
  behavior:
    scaleDown:
      selectPolicy: Disabled
```

This is useful during known high-traffic events (like product launches or sales) where you want capacity to only increase.

## Working with Pod Disruption Budgets

Scale-down operations respect Pod Disruption Budgets (PDBs). Create PDBs to ensure minimum availability during scale-down:

```yaml
# pdb.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: webapp-pdb
spec:
  minAvailable: "50%"
  selector:
    matchLabels:
      app: webapp
```

This ensures at least 50% of webapp pods are always available, even during scale-down operations.

## Monitoring Scale-Down Behavior

Track how your scale-down policies perform:

```bash
# Watch HPA decisions in real time
kubectl get hpa webapp-hpa -w

# View scale-down events
kubectl describe hpa webapp-hpa | grep -A 20 "Events:"

# Check the current vs desired replica count
kubectl get hpa webapp-hpa -o jsonpath='{.status.currentReplicas}/{.status.desiredReplicas}'

# Monitor over time with timestamps
while true; do
  CURRENT=$(kubectl get hpa webapp-hpa -o jsonpath='{.status.currentReplicas}')
  DESIRED=$(kubectl get hpa webapp-hpa -o jsonpath='{.status.desiredReplicas}')
  CPU=$(kubectl get hpa webapp-hpa -o jsonpath='{.status.currentMetrics[0].resource.current.averageUtilization}')
  echo "$(date +%H:%M:%S) Replicas: ${CURRENT}/${DESIRED} CPU: ${CPU}%"
  sleep 15
done
```

## Tuning Tips

1. **Start conservative and loosen.** Begin with a long stabilization window (600s) and slow scale-down rate (1 pod per 2 minutes). After observing behavior, gradually make it more aggressive.

2. **Match scale-down speed to your traffic patterns.** If your traffic has sudden drops followed by returns to normal, use a longer stabilization window. If drops are gradual and sustained, you can use a shorter window.

3. **Consider your application's startup time.** If pods take 5 minutes to become ready, your stabilization window should be at least that long. Otherwise, you might scale down and then be unable to scale back up fast enough.

4. **Use percentage-based policies for large deployments.** Removing "10%" is more appropriate than removing "2 pods" when you have 100 replicas.

5. **Test with realistic traffic patterns.** Use load testing tools to simulate your actual traffic curves and verify the scale-down behavior matches your expectations.

```bash
# Simulate a traffic spike followed by a gradual decline
# Watch how the HPA responds with your configured policies
kubectl run load-test --image=busybox:1.36 --restart=Never -- /bin/sh -c \
  "for i in $(seq 1 300); do wget -q -O- http://webapp.default.svc/; done; sleep 600"
```

## Wrapping Up

Scale-down policies on Talos Linux are your safety net against overly aggressive autoscaling. The stabilization window prevents knee-jerk reactions to brief metric dips, and rate-limiting policies ensure pods are removed gradually. Start conservative, monitor the behavior, and adjust until you find the right balance between resource efficiency and application stability. Remember that the cost of scaling down too aggressively - service disruption - is usually higher than the cost of keeping a few extra pods running for a few minutes longer.
