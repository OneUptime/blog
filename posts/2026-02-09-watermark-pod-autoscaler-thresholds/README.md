# How to Use Watermark Pod Autoscaler for More Granular Scaling Thresholds

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Autoscaling, Performance

Description: Learn how to deploy and configure Watermark Pod Autoscaler to enable more precise autoscaling with separate high and low watermark thresholds for better resource utilization.

---

Standard HPA uses a single target utilization value. When utilization exceeds this target, HPA scales up. When it drops below, HPA scales down. This creates oscillation near the threshold. Watermark Pod Autoscaler (WPA) solves this by using separate high and low watermarks, creating a buffer zone that prevents thrashing.

## Understanding Watermark Scaling

Traditional HPA with a 70% target:

- At 71%: Scale up
- After scaling, drops to 68%: Scale down
- Rises to 71% again: Scale up
- Result: Constant scaling oscillation

WPA with high watermark 80% and low watermark 60%:

- At 81%: Scale up
- After scaling, drops to 68%: No action (still above low watermark)
- Continues to drop to 59%: Scale down
- Result: Stable operation between 60-80%

This buffer zone reduces unnecessary scaling operations and cost.

## Installing Watermark Pod Autoscaler

WPA is a DataDog project. Deploy it using the Helm chart:

```bash
# Add DataDog Helm repository
helm repo add datadog https://helm.datadoghq.com
helm repo update

# Install WPA
helm install watermarkpodautoscaler datadog/watermarkpodautoscaler \
  --namespace kube-system \
  --create-namespace \
  --set clusterAgent.enabled=false
```

Verify installation:

```bash
kubectl get deployment -n kube-system watermarkpodautoscaler
kubectl get crd | grep watermark
```

You should see the `watermarkpodautoscalers.datadoghq.com` CRD.

## Configuring Basic WPA Resource

Create a WatermarkPodAutoscaler for CPU-based scaling:

```yaml
apiVersion: datadoghq.com/v1alpha1
kind: WatermarkPodAutoscaler
metadata:
  name: webapp-wpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: webapp-deployment
  minReplicas: 3
  maxReplicas: 30
  metrics:
  - type: Resource
    resource:
      name: cpu
      metricSelector:
        matchLabels:
          app: webapp
      highWatermark: "800m"  # Scale up when CPU exceeds 800 millicores
      lowWatermark: "400m"   # Scale down when CPU drops below 400 millicores
  scaleUpLimitFactor: 2.0      # Can double replicas in one scaling event
  scaleDownLimitFactor: 0.5    # Can halve replicas in one scaling event
  tolerance: 0.1               # 10% tolerance band around watermarks
  readinessDelaySeconds: 30    # Wait 30s after pod becomes ready
  downscaleForbiddenWindowSeconds: 300  # Prevent scale-down for 5 minutes after scale-up
  upscaleForbiddenWindowSeconds: 60     # Prevent scale-up for 1 minute after scale-down
```

This configuration creates a buffer zone between 400m and 800m CPU where no scaling occurs.

## Understanding Watermark Metrics

WPA supports percentage-based watermarks using utilization:

```yaml
apiVersion: datadoghq.com/v1alpha1
kind: WatermarkPodAutoscaler
metadata:
  name: memory-wpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: cache-deployment
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: memory
      highWatermark: "85"  # Percentage of memory request
      lowWatermark: "50"   # Percentage of memory request
  tolerance: 0.05
  scaleUpLimitFactor: 1.5
  scaleDownLimitFactor: 0.75
```

With this config:

- Each pod has memory request: 2Gi
- High watermark: 85% of 2Gi = 1.7Gi
- Low watermark: 50% of 2Gi = 1Gi
- Scaling happens only outside the 1Gi-1.7Gi range

## Using External Metrics with Watermarks

Scale based on external metrics like queue depth:

```yaml
apiVersion: datadoghq.com/v1alpha1
kind: WatermarkPodAutoscaler
metadata:
  name: queue-worker-wpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: queue-worker
  minReplicas: 5
  maxReplicas: 50
  metrics:
  - type: External
    external:
      metricName: sqs_queue_depth
      metricSelector:
        matchLabels:
          queue: processing-queue
      highWatermark: "1000"  # Scale up when queue > 1000 messages
      lowWatermark: "200"    # Scale down when queue < 200 messages
  scaleUpLimitFactor: 2.0
  scaleDownLimitFactor: 0.5
  downscaleForbiddenWindowSeconds: 600  # Wait 10 minutes before scaling down
```

This prevents scaling oscillation when queue depth fluctuates around a threshold.

## Combining Multiple Metrics

Use multiple watermarks for different resources:

```yaml
apiVersion: datadoghq.com/v1alpha1
kind: WatermarkPodAutoscaler
metadata:
  name: multi-metric-wpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  minReplicas: 3
  maxReplicas: 40
  metrics:
  # CPU watermarks
  - type: Resource
    resource:
      name: cpu
      highWatermark: "75"
      lowWatermark: "40"
  # Memory watermarks
  - type: Resource
    resource:
      name: memory
      highWatermark: "80"
      lowWatermark: "50"
  # Custom metric: request rate
  - type: Pods
    pods:
      metricName: http_requests_per_second
      highWatermark: "1200"
      lowWatermark: "400"
  algorithm: "average"  # Use average of all metrics (options: average, max, absolute)
  tolerance: 0.1
  scaleUpLimitFactor: 1.5
  scaleDownLimitFactor: 0.5
```

The `algorithm` field determines how multiple metrics combine:

- **average**: Scale if average metric crosses watermark
- **max**: Scale if any metric crosses watermark (most conservative)
- **absolute**: Use replica calculation from metric that suggests most replicas

## Configuring Tolerance Bands

The tolerance parameter prevents minor fluctuations from triggering scaling:

```yaml
apiVersion: datadoghq.com/v1alpha1
kind: WatermarkPodAutoscaler
metadata:
  name: tolerant-wpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: worker
  minReplicas: 5
  maxReplicas: 30
  metrics:
  - type: Resource
    resource:
      name: cpu
      highWatermark: "70"
      lowWatermark: "30"
  tolerance: 0.15  # 15% tolerance
```

With 15% tolerance on a 70% high watermark:

- Actual scale-up threshold: 70% × 1.15 = 80.5%
- Actual scale-down threshold: 30% × 0.85 = 25.5%

This creates even more stability around the watermarks.

## Using Forbidden Windows

Forbidden windows prevent scaling too soon after a previous scaling event:

```yaml
apiVersion: datadoghq.com/v1alpha1
kind: WatermarkPodAutoscaler
metadata:
  name: forbidden-windows-wpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: batch-processor
  minReplicas: 2
  maxReplicas: 25
  metrics:
  - type: Pods
    pods:
      metricName: queue_depth
      highWatermark: "500"
      lowWatermark: "100"
  # After scaling up, wait 10 minutes before allowing scale-down
  downscaleForbiddenWindowSeconds: 600
  # After scaling down, wait 2 minutes before allowing scale-up
  upscaleForbiddenWindowSeconds: 120
  # Wait 60 seconds after pods become ready before considering metrics
  readinessDelaySeconds: 60
```

These windows prevent:

- Scaling down immediately after scaling up (thrashing)
- Making decisions on metrics from pods that aren't fully initialized

## Monitoring WPA Decisions

Check WPA status:

```bash
kubectl get wpa -n production
kubectl describe wpa webapp-wpa -n production
```

Status output shows current state:

```yaml
status:
  currentMetrics:
  - resource:
      current:
        averageUtilization: 65
        averageValue: 650m
      name: cpu
    type: Resource
  currentReplicas: 8
  desiredReplicas: 8
  lastScaleTime: "2026-02-09T10:15:00Z"
  conditions:
  - lastTransitionTime: "2026-02-09T10:15:00Z"
    message: "Current utilization 65% is within watermarks (40%-75%)"
    reason: WithinWatermarks
    status: "False"
    type: AbleToScale
```

Create Prometheus metrics to track WPA behavior:

```yaml
# ServiceMonitor for WPA controller
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: watermarkpodautoscaler
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: watermarkpodautoscaler
  endpoints:
  - port: metrics
    interval: 30s
```

Query WPA metrics:

```promql
# Replica count over time
wpa_status_replicas{wpa="webapp-wpa"}

# Metric values
wpa_status_metric{wpa="webapp-wpa",metric="cpu"}

# Scaling events
rate(wpa_scaling_events_total{wpa="webapp-wpa"}[10m])
```

## Migrating from HPA to WPA

Convert an existing HPA to WPA:

```bash
# Export existing HPA
kubectl get hpa webapp-hpa -o yaml > hpa.yaml

# Create equivalent WPA
cat > wpa.yaml <<EOF
apiVersion: datadoghq.com/v1alpha1
kind: WatermarkPodAutoscaler
metadata:
  name: webapp-wpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: webapp-deployment
  minReplicas: 3
  maxReplicas: 30
  metrics:
  - type: Resource
    resource:
      name: cpu
      # HPA target was 70%, create buffer around it
      highWatermark: "80"   # +10%
      lowWatermark: "60"    # -10%
  tolerance: 0.05
  downscaleForbiddenWindowSeconds: 300
EOF

# Delete HPA and create WPA
kubectl delete hpa webapp-hpa
kubectl apply -f wpa.yaml
```

## Best Practices

**Choose watermark spread based on workload variability**: Highly variable workloads need wider spreads (40%-80%). Steady workloads can use narrower spreads (60%-75%).

**Set lower watermark above minimum sustainable level**: Don't set low watermark at 30% if your application performs poorly below 50% utilization. The buffer zone should contain acceptable performance levels.

**Use forbidden windows for slow-starting applications**: Applications that take 2-3 minutes to warm up should have forbidden windows of 5-10 minutes to prevent premature scale-down.

**Monitor actual utilization patterns**: Track how often utilization sits in the buffer zone vs. triggering scaling:

```promql
# Time spent in buffer zone
(
  wpa_status_metric{metric="cpu"} > 600 and  # Above low watermark
  wpa_status_metric{metric="cpu"} < 800      # Below high watermark
) / wpa_status_metric{metric="cpu"}
```

**Test watermark settings under load**: Load test to find optimal watermarks. Too narrow creates oscillation, too wide wastes resources.

Watermark Pod Autoscaler provides more sophisticated scaling logic than standard HPA. By separating scale-up and scale-down thresholds, it reduces oscillation and creates more stable autoscaling behavior for production workloads.
