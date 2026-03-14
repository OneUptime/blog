# How to Configure HPA Based on Custom Metrics with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, HPA, Custom Metrics, Kubernetes, Autoscaling, GitOps, Prometheus Adapter

Description: Learn how to configure Kubernetes HPA with the custom metrics API using Flux CD, enabling scaling based on application-specific metrics like request queue depth.

---

## Introduction

Custom metrics HPA allows scaling based on any metric your application exposes—request queue depth, active connections, pending jobs, cache hit ratio, or business-specific KPIs. The custom metrics API is an extension of the Kubernetes metrics API, and it requires an adapter (like Prometheus Adapter) to translate Prometheus metrics into the Kubernetes custom metrics format.

## Prerequisites

- Kubernetes cluster with Prometheus installed
- Flux CD bootstrapped
- Prometheus Adapter installed and configured
- An application exposing custom Prometheus metrics

## Step 1: Application Exposes Custom Metrics

Your application must expose metrics in Prometheus format:

```go
// Example: Go application exposing queue depth metric
import (
    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promauto"
)

var queueDepth = promauto.NewGauge(prometheus.GaugeOpts{
    Name: "myapp_job_queue_depth",
    Help: "Current number of jobs waiting in the processing queue",
})
```

Expose via `/metrics` endpoint (automatically scraped by Prometheus).

## Step 2: Configure Prometheus to Scrape the Application

```yaml
# Via PodMonitor (if using Prometheus Operator)
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: myapp
  namespace: myapp
spec:
  selector:
    matchLabels:
      app: myapp
  podMetricsEndpoints:
    - port: metrics
      interval: 15s
```

## Step 3: Install Prometheus Adapter via Flux

```yaml
# clusters/production/infrastructure/prometheus-adapter.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: prometheus-adapter
  namespace: monitoring
spec:
  interval: 1h
  chart:
    spec:
      chart: prometheus-adapter
      version: "4.10.x"
      sourceRef:
        kind: HelmRepository
        name: prometheus-community
  values:
    prometheus:
      url: http://prometheus.monitoring.svc.cluster.local
      port: 9090
    rules:
      custom:
        - seriesQuery: 'myapp_job_queue_depth{namespace!="",pod!=""}'
          resources:
            overrides:
              namespace:
                resource: namespace
              pod:
                resource: pod
          name:
            matches: "myapp_job_queue_depth"
            as: "job_queue_depth"  # Name exposed in custom metrics API
          metricsQuery: 'avg(myapp_job_queue_depth{<<.LabelMatchers>>})'
```

## Step 4: Configure HPA with Custom Metric

```yaml
# apps/myapp/hpa-custom.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: myapp-queue-hpa
  namespace: myapp
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp-worker
  minReplicas: 1
  maxReplicas: 50
  metrics:
    - type: Pods
      pods:
        metric:
          name: job_queue_depth  # Must match the name in Prometheus Adapter rules
        target:
          type: AverageValue
          averageValue: "10"  # Scale to maintain 10 jobs per worker pod
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 30  # Scale up quickly for queue depth
      policies:
        - type: Percent
          value: 200   # Can triple the pods in one scale-up
          periodSeconds: 30
    scaleDown:
      stabilizationWindowSeconds: 300
```

## Step 5: Verify Custom Metrics Are Available

```bash
# Check custom metrics API is working
kubectl get --raw "/apis/custom.metrics.k8s.io/v1beta1" | python3 -m json.tool

# Check the specific metric is available
kubectl get --raw \
  "/apis/custom.metrics.k8s.io/v1beta1/namespaces/myapp/pods/*/job_queue_depth" \
  | python3 -m json.tool

# Check HPA is using the custom metric
kubectl describe hpa myapp-queue-hpa -n myapp

# Watch scaling in action
kubectl get hpa myapp-queue-hpa -n myapp --watch
```

## Step 6: Add the Flux Kustomization

```yaml
# clusters/production/apps/myapp-autoscaling.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: myapp-autoscaling
  namespace: flux-system
spec:
  interval: 5m
  path: ./apps/myapp
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  dependsOn:
    - name: prometheus-adapter  # Custom metrics API must be available
```

## Best Practices

- Test the custom metric query in Prometheus UI before configuring Prometheus Adapter; adapter configuration errors are difficult to debug.
- Use `kubectl get --raw` to verify metrics are available in the custom metrics API before creating the HPA.
- Set the `averageValue` target conservatively initially; tune based on observed worker throughput.
- Add CPU-based HPA as a fallback: use a combined HPA with both custom metric and CPU targets.
- Monitor Prometheus Adapter health and resource usage; it adds latency to metric queries.
- Consider KEDA as a simpler alternative for event-driven scaling from queues and message brokers.

## Conclusion

Custom metrics HPA enables sophisticated autoscaling based on application-specific behavior rather than generic infrastructure metrics. Managing the HPA resource through Flux CD keeps the scaling policy in Git, but the full configuration also requires Prometheus, Prometheus Adapter, and proper metric naming—all of which should also be managed via Flux for a complete GitOps approach to autoscaling.
