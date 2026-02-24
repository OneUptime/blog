# How to Configure Istio Control Plane Autoscaling

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Autoscaling, HPA, Control Plane, Kubernetes, Performance

Description: How to configure horizontal pod autoscaling for the Istio control plane to dynamically adjust capacity based on mesh load.

---

A fixed number of istiod replicas works until it does not. During normal operation, 3 replicas might be plenty. But during a large deployment rollout where hundreds of pods restart simultaneously, or during a cluster upgrade that triggers mass certificate renewals, those 3 replicas can get overwhelmed. Autoscaling solves this by adding replicas when load increases and removing them when things calm down.

## How Istiod Load Varies

Istiod's workload is not constant. It has clear load patterns:

- **Steady state** - Normal operation with occasional config pushes from individual deployments. CPU and memory usage is moderate.
- **Deployment storms** - When many pods restart at once (cluster upgrades, large rollouts), istiod handles a surge of certificate signing requests and config pushes.
- **Configuration changes** - Applying mesh-wide configuration (like an AuthorizationPolicy in istio-system) triggers pushes to every proxy simultaneously.
- **Scale events** - When HPAs scale your application pods, istiod needs to update endpoint lists across all proxies.

Without autoscaling, you either overprovision for the worst case (wasting resources) or underprovision and accept degraded performance during spikes.

## Basic HPA Configuration

The simplest autoscaling setup uses CPU utilization as the scaling metric:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    pilot:
      k8s:
        replicaCount: 3
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
          limits:
            cpu: 2000m
            memory: 4Gi
        hpaSpec:
          minReplicas: 3
          maxReplicas: 10
          metrics:
          - type: Resource
            resource:
              name: cpu
              target:
                type: Utilization
                averageUtilization: 75
```

This keeps a minimum of 3 replicas and scales up to 10 when average CPU utilization across all istiod pods exceeds 75% of the requested CPU.

Install it:

```bash
istioctl install -f istio-autoscale.yaml
```

Verify the HPA was created:

```bash
kubectl get hpa -n istio-system
```

## Multi-Metric Autoscaling

CPU alone does not always tell the full story. Memory pressure can also indicate that more replicas are needed. Use multiple metrics:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    pilot:
      k8s:
        replicaCount: 3
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
          limits:
            cpu: 2000m
            memory: 4Gi
        hpaSpec:
          minReplicas: 3
          maxReplicas: 10
          metrics:
          - type: Resource
            resource:
              name: cpu
              target:
                type: Utilization
                averageUtilization: 75
          - type: Resource
            resource:
              name: memory
              target:
                type: Utilization
                averageUtilization: 80
```

With multiple metrics, the HPA takes the higher of the two calculated replica counts. So if CPU says you need 5 replicas and memory says you need 7, you get 7.

## Custom Metrics Autoscaling

For the most accurate autoscaling, use Istio-specific metrics like the number of connected proxies or config push rate. This requires the Prometheus adapter to expose custom metrics to the HPA.

First, set up the Prometheus adapter to expose Istio metrics:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: adapter-config
  namespace: monitoring
data:
  config.yaml: |
    rules:
    - seriesQuery: 'pilot_xds{type="ads"}'
      resources:
        overrides:
          namespace: {resource: "namespace"}
          pod: {resource: "pod"}
      name:
        matches: "^(.*)$"
        as: "pilot_connected_proxies"
      metricsQuery: 'sum(pilot_xds{type="ads"}) by (<<.GroupBy>>)'
    - seriesQuery: 'pilot_xds_pushes'
      resources:
        overrides:
          namespace: {resource: "namespace"}
          pod: {resource: "pod"}
      name:
        matches: "^(.*)$"
        as: "pilot_push_rate"
      metricsQuery: 'sum(rate(pilot_xds_pushes[5m])) by (<<.GroupBy>>)'
```

Then reference the custom metric in your HPA:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: istiod
  namespace: istio-system
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: istiod
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 75
  - type: Pods
    pods:
      metric:
        name: pilot_connected_proxies
      target:
        type: AverageValue
        averageValue: "200"
```

This scales based on both CPU and the number of connected proxies per istiod replica. When each replica handles more than 200 proxies on average, a new replica is added.

## Scaling Behavior Configuration

Kubernetes HPA v2 lets you control how fast scaling happens:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: istiod
  namespace: istio-system
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: istiod
  minReplicas: 3
  maxReplicas: 10
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Pods
        value: 2
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Pods
        value: 1
        periodSeconds: 120
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 75
```

This configuration:
- **Scale up**: Adds at most 2 pods per minute, with a 60-second stabilization window
- **Scale down**: Removes at most 1 pod every 2 minutes, with a 5-minute stabilization window

Scale down should always be slower than scale up. You want to react quickly to load increases but slowly to load decreases, to avoid thrashing.

## Autoscaling the Ingress Gateway

Do not forget to autoscale the ingress gateway too:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    ingressGateways:
    - name: istio-ingressgateway
      enabled: true
      k8s:
        replicaCount: 3
        resources:
          requests:
            cpu: 500m
            memory: 256Mi
        hpaSpec:
          minReplicas: 3
          maxReplicas: 20
          metrics:
          - type: Resource
            resource:
              name: cpu
              target:
                type: Utilization
                averageUtilization: 70
```

The gateway often needs to scale more aggressively than the control plane because it handles actual traffic, not just configuration.

## Monitoring Autoscaling Events

Watch HPA events to understand scaling decisions:

```bash
kubectl describe hpa istiod -n istio-system
```

Check HPA status:

```bash
kubectl get hpa -n istio-system -w
```

The `-w` flag watches for changes in real time.

For Prometheus-based monitoring:

```promql
# Current replica count
kube_horizontalpodautoscaler_status_current_replicas{
  namespace="istio-system",
  horizontalpodautoscaler="istiod"
}

# Desired replica count
kube_horizontalpodautoscaler_status_desired_replicas{
  namespace="istio-system",
  horizontalpodautoscaler="istiod"
}
```

Set up alerts for autoscaling issues:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: istiod-hpa-alerts
spec:
  groups:
  - name: istiod-autoscaling
    rules:
    - alert: IstiodHPAMaxedOut
      expr: |
        kube_horizontalpodautoscaler_status_current_replicas{
          namespace="istio-system",
          horizontalpodautoscaler="istiod"
        }
        ==
        kube_horizontalpodautoscaler_spec_max_replicas{
          namespace="istio-system",
          horizontalpodautoscaler="istiod"
        }
      for: 15m
      labels:
        severity: warning
      annotations:
        summary: "Istiod HPA has reached maximum replicas"

    - alert: IstiodHPAScalingFailed
      expr: |
        kube_horizontalpodautoscaler_status_condition{
          namespace="istio-system",
          horizontalpodautoscaler="istiod",
          condition="ScalingActive",
          status="false"
        } == 1
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Istiod HPA is unable to scale"
```

## Testing Autoscaling

Simulate a load spike to verify autoscaling works:

```bash
# Watch HPA in one terminal
kubectl get hpa -n istio-system -w

# In another terminal, create a burst of pods
kubectl create deployment load-test --image=nginx --replicas=200 -n default

# Watch istiod scale up
kubectl get pods -n istio-system -l app=istiod -w

# Clean up
kubectl delete deployment load-test -n default
```

## KEDA as an Alternative

If you need more sophisticated autoscaling triggers, KEDA (Kubernetes Event-driven Autoscaling) can scale istiod based on Prometheus queries directly:

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: istiod-scaler
  namespace: istio-system
spec:
  scaleTargetRef:
    name: istiod
  minReplicaCount: 3
  maxReplicaCount: 10
  triggers:
  - type: prometheus
    metadata:
      serverAddress: http://prometheus.monitoring:9090
      metricName: pilot_push_rate
      query: sum(rate(pilot_xds_pushes[5m]))
      threshold: "100"
```

## Summary

Autoscaling the Istio control plane ensures you have enough capacity during load spikes without wasting resources during calm periods. Start with CPU-based HPA as a baseline, add memory metrics for better accuracy, and consider custom metrics based on proxy connections for the most responsive scaling. Configure scaling behavior to scale up quickly and down slowly. Monitor HPA events and set up alerts for when the autoscaler hits its maximum to know when you need to increase limits.
