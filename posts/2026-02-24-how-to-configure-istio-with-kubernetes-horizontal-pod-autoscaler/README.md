# How to Configure Istio with Kubernetes Horizontal Pod Autoscaler

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, HPA, Autoscaling, Performance

Description: How to configure Kubernetes Horizontal Pod Autoscaler to work correctly with Istio, including sidecar resource accounting, custom metrics, and scaling strategies.

---

Kubernetes Horizontal Pod Autoscaler (HPA) and Istio work well together, but there are some gotchas that catch people off guard. The Istio sidecar proxy consumes CPU and memory, which affects the resource metrics that HPA uses for scaling decisions. If you do not account for this, your autoscaling thresholds will be off and your services will either scale too aggressively or not enough.

This guide covers how to configure HPA correctly when your pods have Istio sidecars.

## The Sidecar Resource Problem

When HPA calculates CPU utilization, it considers all containers in a pod. This includes the `istio-proxy` sidecar. If your application container requests 200m CPU and the sidecar requests 100m, the total pod request is 300m. When HPA reports 60% CPU utilization, that is 60% of 300m, not 60% of 200m.

This means the sidecar's resource consumption directly affects when your application scales.

## Setting Sidecar Resource Requests

First, set explicit resource requests for the Istio sidecar. You can do this globally or per-deployment.

Global configuration in the mesh config:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio
spec:
  meshConfig:
    defaultConfig:
      proxyMetadata: {}
  values:
    global:
      proxy:
        resources:
          requests:
            cpu: 50m
            memory: 64Mi
          limits:
            cpu: 200m
            memory: 256Mi
```

Per-deployment configuration through annotations:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/proxyCPU: "100m"
        sidecar.istio.io/proxyCPULimit: "500m"
        sidecar.istio.io/proxyMemory: "128Mi"
        sidecar.istio.io/proxyMemoryLimit: "512Mi"
    spec:
      containers:
      - name: my-app
        resources:
          requests:
            cpu: 200m
            memory: 256Mi
          limits:
            cpu: "1"
            memory: 512Mi
```

## Configuring HPA with Resource Metrics

Here is a basic HPA configuration:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: my-app
  namespace: default
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

With the sidecar included, the 70% threshold applies to the combined CPU of all containers. If your app uses 150m and the sidecar uses 50m, that is 200m out of a 300m total request, which is 67% utilization.

## Using Container-Level Metrics

Starting with Kubernetes 1.27, HPA supports container-level metrics through the `ContainerResource` metric type. This lets you target just your application container and ignore the sidecar:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: my-app
  namespace: default
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: ContainerResource
    containerResource:
      name: cpu
      container: my-app
      target:
        type: Utilization
        averageUtilization: 70
```

Now the 70% threshold only considers CPU usage of the `my-app` container. The sidecar's CPU usage is excluded from the calculation. This is the recommended approach when running Istio.

## Scaling on Istio Metrics

Istio generates Prometheus metrics that you can use for HPA through the Prometheus adapter. This gives you application-level scaling based on request rate, error rate, or latency.

Install the Prometheus adapter:

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus-adapter prometheus-community/prometheus-adapter \
  -n monitoring \
  --set prometheus.url=http://prometheus.istio-system.svc \
  --set prometheus.port=9090
```

Configure custom metrics rules:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-adapter
  namespace: monitoring
data:
  config.yaml: |
    rules:
    - seriesQuery: 'istio_requests_total{destination_workload_namespace!="",destination_workload!=""}'
      resources:
        overrides:
          destination_workload_namespace:
            resource: namespace
          destination_workload:
            resource: pod
      name:
        matches: "^(.*)_total$"
        as: "${1}_per_second"
      metricsQuery: 'sum(rate(<<.Series>>{<<.LabelMatchers>>}[2m])) by (<<.GroupBy>>)'
```

Now create an HPA that scales on request rate:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: my-app
  namespace: default
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: Pods
    pods:
      metric:
        name: istio_requests_per_second
      target:
        type: AverageValue
        averageValue: "100"
```

This scales the deployment to maintain an average of 100 requests per second per pod.

## Handling Scale-Down with Connection Draining

When HPA scales down, pods are terminated. Istio needs time to drain existing connections. Configure a preStop hook and termination grace period:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    spec:
      terminationGracePeriodSeconds: 30
      containers:
      - name: my-app
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 10"]
```

Istio's sidecar automatically handles connection draining during termination, but giving it enough time is important. The default `terminationGracePeriodSeconds` of 30 seconds is usually sufficient.

## Configuring Scale-Down Behavior

HPA v2 lets you control how quickly scaling happens:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: my-app
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  minReplicas: 2
  maxReplicas: 20
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 30
      - type: Pods
        value: 4
        periodSeconds: 30
      selectPolicy: Max
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

This configuration:
- Scales up aggressively (double or add 4 pods every 30 seconds)
- Scales down conservatively (only 10% every 60 seconds, with a 5-minute stabilization window)

Conservative scale-down is important with Istio because sudden capacity reduction can cause traffic spikes on remaining pods.

## Monitoring HPA Decisions

Check HPA status to see what metrics it is using:

```bash
kubectl get hpa my-app -o yaml
```

Look at the `status.conditions` and `status.currentMetrics` fields:

```bash
kubectl describe hpa my-app
```

This shows the current and target metric values, the number of replicas, and any scaling events.

## Testing HPA with Istio

Generate load to trigger scaling:

```bash
kubectl exec -n default deploy/fortio -c fortio -- \
  fortio load -c 50 -qps 500 -t 300s http://my-app:8080/
```

In another terminal, watch the HPA:

```bash
kubectl get hpa my-app -w
```

You should see the replica count increase as the load goes up and decrease after the load stops (with the configured delay).

## Wrapping Up

The key to making HPA work well with Istio is accounting for the sidecar's resource consumption. Use container-level metrics if your Kubernetes version supports it, set explicit sidecar resource requests, and consider scaling on Istio's application-level metrics instead of raw CPU. Configure conservative scale-down policies to avoid traffic disruptions, and always test your autoscaling configuration under realistic load to make sure the thresholds are right.
