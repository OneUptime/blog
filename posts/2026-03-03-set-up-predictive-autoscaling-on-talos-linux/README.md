# How to Set Up Predictive Autoscaling on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Predictive Autoscaling, KEDA, Machine Learning, Scaling

Description: Learn how to implement predictive autoscaling on Talos Linux to proactively scale your workloads before demand spikes occur.

---

Traditional autoscaling is reactive. Your application gets hit with traffic, CPU shoots up, and the autoscaler scrambles to add pods. By the time new pods are running and ready, your users have already experienced degraded performance. Predictive autoscaling flips this around by analyzing historical patterns and scaling your workloads before the demand arrives. On Talos Linux, you can implement predictive autoscaling using several approaches, from simple cron-based scheduling to more sophisticated machine learning models.

This guide covers practical strategies for setting up predictive autoscaling on Talos Linux clusters.

## Why Predictive Autoscaling?

Reactive autoscaling has a fundamental problem: latency. When the HPA detects high utilization and decides to scale up, several things need to happen:

1. The HPA evaluation cycle runs (every 15 seconds by default)
2. New pods are created
3. Images are pulled (if not cached)
4. Containers start up
5. Readiness probes pass
6. Traffic starts routing to new pods

This whole process can take anywhere from 30 seconds to several minutes. For applications with sudden traffic spikes, that delay means degraded user experience.

Predictive autoscaling pre-scales your application based on anticipated demand, so the capacity is already in place when the traffic arrives.

## Strategy 1: Cron-Based Predictive Scaling

The simplest form of predictive autoscaling uses known traffic patterns. If your application consistently sees high traffic during business hours and low traffic at night, you can pre-scale accordingly.

### Using KEDA Cron Triggers

```yaml
# predictive-cron.yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: webapp-predictive
spec:
  scaleTargetRef:
    name: webapp
  minReplicaCount: 2
  maxReplicaCount: 50
  triggers:
  # Pre-scale before morning traffic rush (7:45 AM)
  - type: cron
    metadata:
      timezone: America/New_York
      start: 45 7 * * 1-5
      end: 0 9 * * 1-5
      desiredReplicas: "15"
  # Peak hours (9 AM - 5 PM)
  - type: cron
    metadata:
      timezone: America/New_York
      start: 0 9 * * 1-5
      end: 0 17 * * 1-5
      desiredReplicas: "20"
  # Pre-scale before lunch spike
  - type: cron
    metadata:
      timezone: America/New_York
      start: 30 11 * * 1-5
      end: 0 14 * * 1-5
      desiredReplicas: "25"
  # Evening wind-down
  - type: cron
    metadata:
      timezone: America/New_York
      start: 0 17 * * 1-5
      end: 0 20 * * 1-5
      desiredReplicas: "10"
  # Night/weekend minimum
  - type: cron
    metadata:
      timezone: America/New_York
      start: 0 20 * * *
      end: 45 7 * * 1-5
      desiredReplicas: "3"
  # Also scale reactively based on actual metrics
  - type: prometheus
    metadata:
      serverAddress: http://prometheus.monitoring.svc:9090
      query: sum(rate(http_requests_total{deployment="webapp"}[2m]))
      threshold: "100"
```

### Using CronJobs for Direct Scaling

```yaml
# predictive-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: pre-scale-morning
spec:
  schedule: "45 7 * * 1-5"  # 7:45 AM weekdays
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: autoscaler-sa
          containers:
          - name: scaler
            image: bitnami/kubectl:latest
            command: ['sh', '-c']
            args:
            - |
              echo "Pre-scaling webapp for morning traffic"
              kubectl scale deployment webapp --replicas=15
              echo "Scaled to 15 replicas at $(date)"
          restartPolicy: OnFailure
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: scale-down-evening
spec:
  schedule: "0 20 * * *"  # 8 PM every day
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: autoscaler-sa
          containers:
          - name: scaler
            image: bitnami/kubectl:latest
            command: ['sh', '-c']
            args:
            - |
              echo "Scaling down for evening"
              kubectl scale deployment webapp --replicas=3
              echo "Scaled to 3 replicas at $(date)"
          restartPolicy: OnFailure
```

## Strategy 2: Prometheus-Based Trend Analysis

Use Prometheus queries that analyze trends rather than current values to predict upcoming demand:

```yaml
# predictive-prometheus.yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: webapp-trend-scaler
spec:
  scaleTargetRef:
    name: webapp
  minReplicaCount: 2
  maxReplicaCount: 40
  triggers:
  # Scale based on rate of change (derivative)
  # If traffic is increasing rapidly, scale up preemptively
  - type: prometheus
    metadata:
      serverAddress: http://prometheus.monitoring.svc:9090
      # Look at the rate of change over the last 10 minutes
      query: |
        max(
          deriv(
            sum(rate(http_requests_total{deployment="webapp"}[5m]))[10m:1m]
          )
        ) * 60
      threshold: "10"   # Scale if traffic is growing by 10 req/s per minute
      metricName: traffic_growth_rate
  # Also react to current load
  - type: prometheus
    metadata:
      serverAddress: http://prometheus.monitoring.svc:9090
      query: sum(rate(http_requests_total{deployment="webapp"}[2m]))
      threshold: "100"
      metricName: current_request_rate
```

## Strategy 3: Day-of-Week Pattern Matching

If your traffic varies by day of the week, use Prometheus to compare against historical patterns:

```yaml
# day-pattern-scaler.yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: webapp-pattern-scaler
spec:
  scaleTargetRef:
    name: webapp
  minReplicaCount: 2
  maxReplicaCount: 30
  triggers:
  - type: prometheus
    metadata:
      serverAddress: http://prometheus.monitoring.svc:9090
      # Use last week's same-hour traffic as a predictor
      # Add 20% buffer for growth
      query: |
        sum(rate(http_requests_total{deployment="webapp"}[1h] offset 7d)) * 1.2
      threshold: "80"
      metricName: predicted_load
```

## Strategy 4: Custom Predictive Controller

For more sophisticated prediction, build a custom controller that analyzes historical data and sets pod counts:

```yaml
# predictive-controller.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: predictive-autoscaler
  namespace: kube-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: predictive-autoscaler
  template:
    metadata:
      labels:
        app: predictive-autoscaler
    spec:
      serviceAccountName: predictive-autoscaler-sa
      containers:
      - name: controller
        image: predictive-autoscaler:latest
        env:
        - name: PROMETHEUS_URL
          value: "http://prometheus.monitoring.svc:9090"
        - name: TARGET_DEPLOYMENT
          value: "webapp"
        - name: TARGET_NAMESPACE
          value: "default"
        - name: MIN_REPLICAS
          value: "2"
        - name: MAX_REPLICAS
          value: "30"
        - name: PREDICTION_WINDOW_MINUTES
          value: "15"
        - name: HISTORY_DAYS
          value: "14"
```

Here is a Python script that implements the prediction logic:

```python
# predictive_scaler.py
import requests
import time
import subprocess
import json
from datetime import datetime

PROMETHEUS_URL = "http://prometheus.monitoring.svc:9090"
DEPLOYMENT = "webapp"
NAMESPACE = "default"
MIN_REPLICAS = 2
MAX_REPLICAS = 30

def get_historical_traffic(hours_ahead=0.25):
    """Query Prometheus for same time last week, adjusted for growth."""
    query = f'''
    sum(rate(http_requests_total{{deployment="{DEPLOYMENT}"}}[5m]
        offset {int(168 - hours_ahead * 60)}m))
    '''
    response = requests.get(f"{PROMETHEUS_URL}/api/v1/query", params={"query": query})
    result = response.json()

    if result["data"]["result"]:
        return float(result["data"]["result"][0]["value"][1])
    return 0

def get_current_traffic():
    """Get current request rate."""
    query = f'sum(rate(http_requests_total{{deployment="{DEPLOYMENT}"}}[2m]))'
    response = requests.get(f"{PROMETHEUS_URL}/api/v1/query", params={"query": query})
    result = response.json()

    if result["data"]["result"]:
        return float(result["data"]["result"][0]["value"][1])
    return 0

def calculate_desired_replicas(predicted_traffic, current_traffic):
    """Calculate desired replicas based on prediction."""
    # Use the higher of current and predicted traffic
    target_traffic = max(predicted_traffic * 1.2, current_traffic)  # 20% buffer

    # Assume each pod handles 50 requests per second
    requests_per_pod = 50
    desired = int(target_traffic / requests_per_pod) + 1

    # Clamp to min/max
    return max(MIN_REPLICAS, min(MAX_REPLICAS, desired))

def scale_deployment(replicas):
    """Scale the deployment using kubectl."""
    subprocess.run([
        "kubectl", "scale", "deployment", DEPLOYMENT,
        f"--replicas={replicas}", f"--namespace={NAMESPACE}"
    ], check=True)

# Main loop
while True:
    predicted = get_historical_traffic(hours_ahead=0.25)
    current = get_current_traffic()
    desired = calculate_desired_replicas(predicted, current)

    print(f"Current: {current:.1f} req/s, Predicted: {predicted:.1f} req/s, Desired: {desired} replicas")
    scale_deployment(desired)

    time.sleep(60)  # Run every minute
```

## Combining Predictive and Reactive Scaling

The best approach combines predictive and reactive scaling:

```yaml
# combined-scaling.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: webapp-reactive-hpa
  annotations:
    # This HPA acts as a floor, ensuring reactive scaling works
    autoscaling.alpha.kubernetes.io/behavior: '{"scaleUp":{"stabilizationWindowSeconds":30}}'
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: webapp
  minReplicas: 2
  maxReplicas: 50
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 60
---
# The CronJob sets a higher baseline during predicted peak times
apiVersion: batch/v1
kind: CronJob
metadata:
  name: predictive-baseline
spec:
  schedule: "*/15 * * * *"  # Every 15 minutes
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: autoscaler-sa
          containers:
          - name: predictor
            image: bitnami/kubectl:latest
            command: ['sh', '-c']
            args:
            - |
              HOUR=$(date +%H)
              DAY=$(date +%u)  # 1=Monday, 7=Sunday

              # Weekday business hours
              if [ "$DAY" -le 5 ] && [ "$HOUR" -ge 8 ] && [ "$HOUR" -lt 18 ]; then
                MIN=10
              # Weekday morning ramp-up
              elif [ "$DAY" -le 5 ] && [ "$HOUR" -ge 7 ] && [ "$HOUR" -lt 8 ]; then
                MIN=8
              # Everything else
              else
                MIN=2
              fi

              # Update HPA minReplicas
              kubectl patch hpa webapp-reactive-hpa --type merge \
                -p "{\"spec\":{\"minReplicas\":${MIN}}}"

              echo "Set HPA minReplicas to ${MIN} (hour=${HOUR}, day=${DAY})"
          restartPolicy: OnFailure
```

## Monitoring Predictive Scaling

Track the accuracy of your predictions:

```bash
# Compare predicted vs actual traffic
# In Prometheus, create a recording rule:
# predicted_traffic = sum(rate(http_requests_total[5m] offset 7d)) * 1.2
# actual_traffic = sum(rate(http_requests_total[5m]))

# Check how often the HPA hits max replicas (prediction was too low)
kubectl get events --field-selector reason=SuccessfulRescale --sort-by='.lastTimestamp'

# Monitor scaling latency
kubectl describe hpa webapp-reactive-hpa | grep -A 5 "Events:"
```

## Wrapping Up

Predictive autoscaling on Talos Linux helps you stay ahead of demand instead of reacting to it. Start with cron-based scaling for workloads with well-known traffic patterns, then layer on trend analysis with Prometheus queries for more dynamic prediction. The most effective setup combines predictive scaling (to set a baseline) with reactive scaling (to handle unexpected spikes). Track your prediction accuracy over time and adjust your models as your traffic patterns evolve.
