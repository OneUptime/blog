# How to Debug Kubernetes Horizontal Pod Autoscaler Not Scaling from Missing Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Autoscaling, Metrics

Description: Learn how to debug Kubernetes HorizontalPodAutoscaler that fails to scale due to missing metrics, including metrics server issues, custom metrics problems, and API configuration errors.

---

Horizontal Pod Autoscaler not scaling despite increasing load frustrates operators and leaves applications under-provisioned. When HPA can't retrieve metrics, it can't make scaling decisions, leaving replica counts static regardless of actual resource usage. Missing metrics from metrics server failures, misconfigured custom metrics, or API registration problems prevent autoscaling from functioning.

This guide covers diagnosing metric collection failures, fixing metrics server issues, configuring custom metrics correctly, and ensuring HPA can scale workloads appropriately.

## Understanding HPA Metrics Dependencies

HPA makes scaling decisions based on metrics. Resource metrics like CPU and memory come from metrics-server. Custom metrics come from custom metrics APIs backed by adapters like Prometheus Adapter. External metrics come from external metrics APIs for cloud provider or third-party metrics.

When metrics are unavailable, HPA shows "unknown" for current metrics and won't scale. The controller needs baseline metrics to calculate target replica counts. Without metrics, it assumes the safest action is no action, leaving replica counts unchanged even as load increases.

## Identifying Missing Metrics

Check HPA status to confirm metrics are missing.

```bash
# List HPAs
kubectl get hpa -A

# Output showing unknown metrics:
# NAMESPACE   NAME       REFERENCE          TARGETS         MINPODS   MAXPODS   REPLICAS   AGE
# default     myapp-hpa  Deployment/myapp   <unknown>/80%   2         10        2          10m

# Get detailed HPA status
kubectl describe hpa myapp-hpa -n default
```

The Events section shows why metrics are unavailable.

```bash
# Common error messages:
# Warning  FailedGetResourceMetric  2m  horizontal-pod-autoscaler
#   failed to get cpu utilization: unable to get metrics for resource cpu:
#   no metrics returned from resource metrics API
# Warning  FailedComputeMetricsReplicas  2m  horizontal-pod-autoscaler
#   invalid metrics (1 invalid out of 1), first error is:
#   failed to get custom metric: unable to get custom metric
```

Check if metrics-server is running.

```bash
# Check metrics-server deployment
kubectl get deployment metrics-server -n kube-system

# Check metrics-server pods
kubectl get pods -n kube-system -l k8s-app=metrics-server

# If pods are missing or not ready, metrics-server isn't functioning
```

## Installing and Fixing Metrics Server

Install metrics-server if it's missing.

```bash
# Install metrics-server
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Verify installation
kubectl get deployment metrics-server -n kube-system
kubectl wait --for=condition=available deployment/metrics-server -n kube-system --timeout=300s
```

For self-signed certificates or test environments, configure metrics-server to skip TLS verification.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: metrics-server
  namespace: kube-system
spec:
  template:
    spec:
      containers:
      - name: metrics-server
        image: registry.k8s.io/metrics-server/metrics-server:v0.6.4
        args:
        - --cert-dir=/tmp
        - --secure-port=4443
        - --kubelet-preferred-address-types=InternalIP,ExternalIP,Hostname
        - --kubelet-use-node-status-port
        - --metric-resolution=15s
        # For development/test environments only
        - --kubelet-insecure-tls
```

Check metrics-server logs for errors.

```bash
# View metrics-server logs
kubectl logs -n kube-system deployment/metrics-server --tail=50

# Common errors:
# unable to fetch node metrics: Get "https://node-1:10250/stats/summary": x509: certificate signed by unknown authority
# unable to fetch pod metrics: no metrics known for pod
```

## Verifying Resource Metrics

Test if metrics-server provides metrics correctly.

```bash
# Check node metrics
kubectl top nodes

# Should show:
# NAME       CPU(cores)   CPU%   MEMORY(bytes)   MEMORY%
# worker-1   500m         25%    4Gi             50%

# Check pod metrics
kubectl top pods -n default

# Should show:
# NAME                     CPU(cores)   MEMORY(bytes)
# myapp-6f8d9c7b5-abc      50m          256Mi

# If these commands work, metrics-server is functioning
```

Check if the metrics API is registered.

```bash
# List API services
kubectl get apiservices | grep metrics

# Should show:
# v1beta1.metrics.k8s.io   kube-system/metrics-server   True   5d

# If Status is False, check the service
kubectl get apiservice v1beta1.metrics.k8s.io -o yaml
```

## Fixing HPA Resource Requests

HPA requires pods to have resource requests defined. Without requests, HPA can't calculate utilization percentages.

```bash
# Check if deployment has resource requests
kubectl get deployment myapp -n default -o jsonpath='{.spec.template.spec.containers[0].resources}'

# If output is empty or missing requests, add them
```

Add resource requests to the deployment.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  template:
    spec:
      containers:
      - name: app
        image: myapp:v1.0
        resources:
          requests:
            cpu: "100m"      # Required for CPU-based HPA
            memory: "128Mi"  # Required for memory-based HPA
          limits:
            cpu: "500m"
            memory: "512Mi"
```

Apply the changes.

```bash
kubectl apply -f deployment.yaml

# Wait for pods to restart with new resource configuration
kubectl rollout status deployment myapp -n default

# Check HPA status again
kubectl get hpa myapp-hpa -n default
```

## Configuring Custom Metrics

For custom metrics-based HPA, install and configure Prometheus Adapter.

```bash
# Install Prometheus Adapter with Helm
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm install prometheus-adapter prometheus-community/prometheus-adapter \
  --namespace monitoring \
  --set prometheus.url=http://prometheus-server.monitoring.svc \
  --set prometheus.port=80
```

Configure custom metrics rules.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: adapter-config
  namespace: monitoring
data:
  config.yaml: |
    rules:
    - seriesQuery: 'http_requests_total{namespace!="",pod!=""}'
      resources:
        overrides:
          namespace: {resource: "namespace"}
          pod: {resource: "pod"}
      name:
        matches: "^(.*)_total"
        as: "${1}_per_second"
      metricsQuery: 'sum(rate(<<.Series>>{<<.LabelMatchers>>}[2m])) by (<<.GroupBy>>)'
```

Verify custom metrics are available.

```bash
# Check custom metrics API
kubectl get apiservices | grep custom.metrics

# Should show:
# v1beta1.custom.metrics.k8s.io   monitoring/prometheus-adapter   True   5d

# List available custom metrics
kubectl get --raw /apis/custom.metrics.k8s.io/v1beta1 | jq

# Query specific metric
kubectl get --raw "/apis/custom.metrics.k8s.io/v1beta1/namespaces/default/pods/*/http_requests_per_second" | jq
```

## Creating HPA with Custom Metrics

Configure HPA to use custom metrics.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: myapp-hpa
  namespace: default
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp
  minReplicas: 2
  maxReplicas: 10
  metrics:
  # Resource metrics
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
  # Custom metrics
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "1000"
```

Apply and verify.

```bash
kubectl apply -f hpa.yaml

# Check HPA status
kubectl get hpa myapp-hpa -n default -w

# Should show metrics:
# NAME        REFERENCE          TARGETS                                  MINPODS   MAXPODS   REPLICAS
# myapp-hpa   Deployment/myapp   500/1000 (http_requests), 45%/70% (cpu)  2         10        3
```

## Troubleshooting External Metrics

External metrics from cloud providers require additional configuration.

```bash
# For GCP external metrics
kubectl apply -f https://raw.githubusercontent.com/GoogleCloudPlatform/k8s-stackdriver/master/custom-metrics-stackdriver-adapter/deploy/production/adapter.yaml

# For AWS CloudWatch metrics
kubectl apply -f https://github.com/kubernetes/kube-state-metrics/tree/main/examples/standard

# Verify external metrics API
kubectl get apiservices | grep external.metrics
```

Configure HPA with external metrics.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: myapp-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: External
    external:
      metric:
        name: pubsub.googleapis.com|subscription|num_undelivered_messages
        selector:
          matchLabels:
            resource.labels.subscription_id: myapp-queue
      target:
        type: AverageValue
        averageValue: "30"
```

## Implementing HPA Monitoring

Create alerts for HPA metric failures.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-alerts
  namespace: monitoring
data:
  alerts.yaml: |
    groups:
    - name: hpa
      rules:
      - alert: HPAMissingMetrics
        expr: |
          kube_horizontalpodautoscaler_status_condition{condition="ScalingLimited",status="true"} > 0
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "HPA {{ $labels.namespace }}/{{ $labels.horizontalpodautoscaler }} missing metrics"

      - alert: HPAScalingDisabled
        expr: |
          kube_horizontalpodautoscaler_status_desired_replicas == kube_horizontalpodautoscaler_spec_min_replicas
          and rate(kube_horizontalpodautoscaler_status_desired_replicas[30m]) == 0
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "HPA not scaling despite potential need"

      - alert: MetricsServerDown
        expr: |
          absent(up{job="metrics-server"}) or up{job="metrics-server"} == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Metrics server is down"
```

Create a dashboard showing HPA metrics and scaling activity.

```bash
# Query HPA status
kubectl get hpa -A -o json | \
  jq -r '.items[] | "\(.metadata.namespace)/\(.metadata.name): \(.status.currentReplicas)/\(.spec.maxReplicas)"'

# Monitor scaling events
kubectl get events -A --field-selector reason=ScalingReplicaSet --watch
```

## Testing HPA Scaling

Generate load to verify HPA scales correctly.

```bash
# Create load generator
kubectl run load-generator -it --rm --restart=Never --image=busybox -- sh

# Inside the pod, generate requests
while true; do
  wget -q -O- http://myapp.default.svc.cluster.local
done

# In another terminal, watch HPA scale
kubectl get hpa myapp-hpa -n default -w

# Should see replica count increase as load rises
```

Verify scaling events.

```bash
# Check HPA events
kubectl describe hpa myapp-hpa -n default | grep -A 10 Events

# Should show:
# Events:
#   Normal  SuccessfulRescale  2m  horizontal-pod-autoscaler
#     New size: 4; reason: cpu resource utilization above target
```

HPA failing to scale from missing metrics leaves applications unable to handle load increases automatically. By ensuring metrics-server functions correctly, configuring resource requests on workloads, setting up custom metrics when needed, and monitoring metrics API health, you enable reliable autoscaling. Combined with proper testing and alerting, these practices create responsive autoscaling that adapts to actual workload demands.
