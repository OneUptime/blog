# How to Scale Dapr Applications with Kubernetes HPA

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Kubernetes, HPA, Autoscaling, Performance

Description: Configure Kubernetes Horizontal Pod Autoscaler to scale Dapr-enabled services based on CPU, memory, and custom Prometheus metrics from Dapr sidecars.

---

## HPA with Dapr Applications

Kubernetes HPA scales deployments based on resource metrics. Dapr sidecars emit Prometheus metrics that you can use as custom scaling signals alongside standard CPU and memory.

## Basic CPU-Based HPA

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: order-service-hpa
  namespace: default
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: order-service
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

## Setting Resource Requests (Required for HPA)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  selector:
    matchLabels:
      app: order-service
  template:
    metadata:
      labels:
        app: order-service
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "order-service"
        dapr.io/app-port: "8080"
    spec:
      containers:
      - name: order-service
        image: myregistry/order-service:latest
        resources:
          requests:
            cpu: "250m"
            memory: "256Mi"
          limits:
            cpu: "1000m"
            memory: "512Mi"
      # Dapr sidecar is automatically injected - set its resources via annotations
```

## Dapr Sidecar Resource Limits

```yaml
# Apply sidecar resource limits in deployment pod template annotations
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "order-service"
        dapr.io/sidecar-cpu-request: "100m"
        dapr.io/sidecar-memory-request: "128Mi"
        dapr.io/sidecar-cpu-limit: "300m"
        dapr.io/sidecar-memory-limit: "256Mi"
```

## Custom Metrics HPA with Dapr Prometheus Metrics

```bash
# Install Prometheus Adapter
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus-adapter prometheus-community/prometheus-adapter \
  --set prometheus.url=http://prometheus.monitoring.svc.cluster.local \
  -n monitoring
```

```yaml
# prometheus-adapter config for Dapr service invocation request rate
rules:
  custom:
  - seriesQuery: 'dapr_service_invocation_req_sent_total{namespace!="",pod!=""}'
    resources:
      overrides:
        namespace: {resource: "namespace"}
        pod: {resource: "pod"}
    name:
      matches: "^(.*)"
      as: "dapr_requests_per_second"
    metricsQuery: 'rate(dapr_service_invocation_req_sent_total{<<.LabelMatchers>>}[2m])'
```

## HPA Using Custom Dapr Metrics

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: order-service-custom-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: order-service
  minReplicas: 2
  maxReplicas: 50
  metrics:
  - type: Pods
    pods:
      metric:
        name: dapr_requests_per_second
      target:
        type: AverageValue
        averageValue: "100"
```

## Testing the HPA

```bash
# Check HPA status
kubectl get hpa order-service-hpa -w

# Generate load to trigger scaling
kubectl run -i --tty load-generator --rm --image=busybox \
  --restart=Never -- /bin/sh -c \
  "while true; do wget -q -O- http://order-service/; done"

# Watch pod count increase
kubectl get pods -l app=order-service -w
```

## Summary

Kubernetes HPA works seamlessly with Dapr applications. The key requirements are setting resource requests on both the application container and Dapr sidecar, and configuring the Prometheus Adapter if you want to scale on Dapr-specific metrics like request rate or latency. Using custom Dapr metrics gives you more precise scaling signals than raw CPU or memory.
