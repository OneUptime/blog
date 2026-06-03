# How to Use Watermark Pod Autoscaler for More Granular Scaling Thresholds

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Autoscaling, Performance

Description: Learn how to deploy and configure Watermark Pod Autoscaler to enable more precise autoscaling with separate high and low watermark thresholds for better resource utilization.

---

Standard HPA uses a target utilization value. When utilization exceeds this target, HPA scales up. When it drops below, HPA scales down, with tolerance and stabilization windows helping reduce flapping. Watermark Pod Autoscaler (WPA) adds separate high and low watermarks, creating a buffer zone that prevents thrashing.

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

WPA is a Datadog project. Deploy it using the Helm chart from the WPA repository:

```bash
# Clone the WPA repository
git clone https://github.com/DataDog/watermarkpodautoscaler.git
cd watermarkpodautoscaler

# Install WPA
kubectl create namespace datadog
helm install wpacontroller -n datadog ./chart/watermarkpodautoscaler
```

Verify installation:

```bash
kubectl get deployment -n datadog wpacontroller-watermarkpodautoscaler
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
      highWatermark: "800m"  # Scale up when average CPU exceeds 800 millicores
      lowWatermark: "400m"   # Scale down when average CPU drops below 400 millicores
  scaleUpLimitFactor: 100      # Can add up to 100% more replicas in one scaling event
  scaleDownLimitFactor: 50     # Can remove up to 50% of replicas in one scaling event
  tolerance: "0.1"             # 10% tolerance band around watermarks
  readinessDelaySeconds: 30    # Wait 30s after pod becomes ready
  downscaleForbiddenWindowSeconds: 300  # Prevent scale-down for 5 minutes after scale-up
  upscaleForbiddenWindowSeconds: 60     # Prevent scale-up for 1 minute after scale-down
```

This configuration creates a buffer zone between 400m and 800m CPU where no scaling occurs.

## Understanding Watermark Metrics

WPA watermarks are Kubernetes quantities. For memory-based scaling, set high and low watermarks as memory quantities:

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
      highWatermark: "1700Mi"  # Scale up when average memory exceeds 1700Mi
      lowWatermark: "1Gi"      # Scale down when average memory drops below 1Gi
  tolerance: "0.05"
  scaleUpLimitFactor: 50
  scaleDownLimitFactor: 25
```

With this config:

- High watermark: 1700Mi
- Low watermark: 1Gi
- Scaling happens only outside the 1Gi-1700Mi range

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
  scaleUpLimitFactor: 100
  scaleDownLimitFactor: 50
  downscaleForbiddenWindowSeconds: 600  # Wait 10 minutes before scaling down
```

This prevents scaling oscillation when queue depth fluctuates around a threshold.

## Combining Multiple Metrics

WPA officially supports one metric per WPA. If you need to protect the same workload with more than one signal, create separate WPA objects and use `External` or `Resource` metrics:

```yaml
apiVersion: datadoghq.com/v1alpha1
kind: WatermarkPodAutoscaler
metadata:
  name: api-server-cpu-wpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  minReplicas: 3
  maxReplicas: 40
  metrics:
  - type: Resource
    resource:
      name: cpu
      highWatermark: "750m"
      lowWatermark: "400m"
  algorithm: "absolute"
  tolerance: "0.1"
  scaleUpLimitFactor: 50
  scaleDownLimitFactor: 50
---
apiVersion: datadoghq.com/v1alpha1
kind: WatermarkPodAutoscaler
metadata:
  name: api-server-rps-wpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  minReplicas: 3
  maxReplicas: 40
  metrics:
  - type: External
    external:
      metricName: http_requests_per_second
      highWatermark: "1200"
      lowWatermark: "400"
  algorithm: "average"
  tolerance: "0.1"
  scaleUpLimitFactor: 50
  scaleDownLimitFactor: 50
```

The `algorithm` field determines how a metric is converted to a replica recommendation:

- **average**: Treat the metric as a total load metric and calculate replicas as metric value divided by the relevant watermark
- **absolute**: Treat the metric as already correlated with replica count and calculate replicas from current replicas multiplied by metric value divided by the relevant watermark

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
      highWatermark: "700m"
      lowWatermark: "300m"
  tolerance: "0.15"  # 15% tolerance
```

With 15% tolerance on a 700m high watermark:

- Actual scale-up threshold: 700m × 1.15 = 805m
- Actual scale-down threshold: 300m × 0.85 = 255m

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
  - type: External
    external:
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
    message: "the last scaling time was sufficiently old as to warrant a new scale"
    reason: ReadyForScale
    status: "True"
    type: AbleToScale
```

The chart exposes Prometheus metrics on the controller pod's `/metrics` endpoint on port 8383. If you use the Prometheus Operator, create a Service and ServiceMonitor for the controller:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: watermarkpodautoscaler-metrics
  namespace: datadog
  labels:
    app: watermarkpodautoscaler
spec:
  selector:
    app.kubernetes.io/name: watermarkpodautoscaler
  ports:
  - name: metrics
    port: 8383
    targetPort: 8383
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: watermarkpodautoscaler
  namespace: datadog
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
# Effective replica recommendation over time
wpa_controller_replicas_scaling_effective{wpa_name="webapp-wpa"}

# Metric values
wpa_controller_value{wpa_name="webapp-wpa",metric_name="cpu"}

# Scaling changes
rate(wpa_controller_upscale_replicas_total{wpa_name="webapp-wpa"}[10m])
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
      highWatermark: "800m"
      lowWatermark: "600m"
  tolerance: "0.05"
  downscaleForbiddenWindowSeconds: 300
EOF

# Delete HPA and create WPA
kubectl delete hpa webapp-hpa
kubectl apply -f wpa.yaml
```

## Best Practices

**Choose watermark spread based on workload variability**: Highly variable workloads need wider spreads, such as 400m-800m CPU. Steady workloads can use narrower spreads, such as 600m-750m CPU.

**Set lower watermark above minimum sustainable level**: Don't set low watermark at 30% if your application performs poorly below 50% utilization. The buffer zone should contain acceptable performance levels.

**Use forbidden windows for slow-starting applications**: Applications that take 2-3 minutes to warm up should have forbidden windows of 5-10 minutes to prevent premature scale-down.

**Monitor actual utilization patterns**: Track how often utilization sits in the buffer zone vs. triggering scaling:

```promql
# Time spent in buffer zone
(
  wpa_controller_value{metric_name="cpu"} > 600 and  # Above low watermark
  wpa_controller_value{metric_name="cpu"} < 800      # Below high watermark
) / wpa_controller_value{metric_name="cpu"}
```

**Test watermark settings under load**: Load test to find optimal watermarks. Too narrow creates oscillation, too wide wastes resources.

Watermark Pod Autoscaler provides more sophisticated scaling logic than standard HPA. By separating scale-up and scale-down thresholds, it reduces oscillation and creates more stable autoscaling behavior for production workloads.
