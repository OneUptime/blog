# How to Deploy Prometheus Adapter for Custom Metrics HPA with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Prometheus Adapter, Custom Metrics, HPA, Kubernetes, GitOps, Autoscaling

Description: Learn how to deploy Prometheus Adapter to expose custom metrics for HPA using Flux CD, enabling Prometheus-powered pod autoscaling.

---

## Introduction

Prometheus Adapter implements the Kubernetes custom metrics API by translating Prometheus queries into metric values that HPA can use for scaling decisions. It acts as a bridge between the rich metric data in Prometheus and the Kubernetes autoscaling system. Deploying and configuring Prometheus Adapter via Flux CD ensures the adapter and its metric rules are version-controlled alongside HPA resources.

## Prerequisites

- Prometheus running in the cluster (via kube-prometheus-stack)
- Flux CD bootstrapped
- Applications exposing Prometheus metrics
- kubectl and flux CLI

## Step 1: Deploy Prometheus Adapter via Flux HelmRelease

```yaml
# clusters/production/infrastructure/prometheus-adapter.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: prometheus-community
  namespace: flux-system
spec:
  interval: 1h
  url: https://prometheus-community.github.io/helm-charts
---
apiVersion: helm.toolkit.fluxcd.io/v2beta2
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
      url: http://kube-prometheus-stack-prometheus.monitoring.svc.cluster.local
      port: 9090
      path: ""
    replicas: 2  # HA deployment
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        cpu: 500m
        memory: 512Mi
    # Custom metric rules
    rules:
      default: true  # Include default resource metric rules
      custom:
        # Queue depth metric
        - seriesQuery: 'myapp_queue_depth{namespace!="",pod!=""}'
          resources:
            overrides:
              namespace:
                resource: namespace
              pod:
                resource: pod
          name:
            matches: "myapp_queue_depth"
            as: "queue_depth"
          metricsQuery: 'avg(<<.Series>>{<<.LabelMatchers>>})'

        # Active connections metric
        - seriesQuery: 'myapp_active_connections{namespace!="",pod!=""}'
          resources:
            overrides:
              namespace:
                resource: namespace
              pod:
                resource: pod
          name:
            as: "active_connections"
          metricsQuery: 'avg(<<.Series>>{<<.LabelMatchers>>})'

        # HTTP request rate from NGINX ingress
        - seriesQuery: 'nginx_ingress_controller_requests{namespace!="",ingress!=""}'
          resources:
            overrides:
              namespace:
                resource: namespace
              ingress:
                resource: ingress
          name:
            as: "nginx_request_rate"
          metricsQuery: 'rate(<<.Series>>{<<.LabelMatchers>>}[2m])'
      external: []
```

## Step 2: Understand the Rule Configuration

Each rule in Prometheus Adapter has four parts:

```yaml
# Rule anatomy
- seriesQuery: 'metric_name{label_filters}'
  # Which Prometheus metric to adapt
  
  resources:
    overrides:
      prometheus_label:
        resource: kubernetes_resource_type
  # Map Prometheus labels to Kubernetes API groups
  
  name:
    matches: "original_name"
    as: "new_name"  # Name exposed in custom metrics API
  
  metricsQuery: 'promql_query{<<.LabelMatchers>>}'
  # The actual PromQL query to execute
```

## Step 3: HPA Using the Adapted Metrics

```yaml
# apps/myapp/hpa-custom.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: myapp-hpa
  namespace: myapp
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp
  minReplicas: 2
  maxReplicas: 20
  metrics:
    # Use the queue_depth custom metric
    - type: Pods
      pods:
        metric:
          name: queue_depth
        target:
          type: AverageValue
          averageValue: "10"  # 10 items per pod
    # Combined with CPU
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

## Step 4: Deploy with Flux and Correct Ordering

```yaml
# clusters/production/infrastructure/prometheus-adapter-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: prometheus-adapter
  namespace: flux-system
spec:
  interval: 1h
  path: ./infrastructure/prometheus-adapter
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  dependsOn:
    - name: kube-prometheus-stack  # Prometheus must be running first
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: prometheus-adapter
      namespace: monitoring
  timeout: 5m
```

## Step 5: Debug Prometheus Adapter Rules

```bash
# Check if Prometheus Adapter is running
kubectl get pods -n monitoring | grep prometheus-adapter

# List available custom metrics
kubectl get --raw "/apis/custom.metrics.k8s.io/v1beta1/" | python3 -m json.tool

# Get a specific metric value
kubectl get --raw \
  "/apis/custom.metrics.k8s.io/v1beta1/namespaces/myapp/pods/*/queue_depth" \
  | python3 -m json.tool

# Check adapter logs for rule evaluation errors
kubectl logs -n monitoring deployment/prometheus-adapter --tail=50

# Test the PromQL query directly in Prometheus
# Navigate to Prometheus UI and run:
# avg(myapp_queue_depth{namespace="myapp"})
```

## Step 6: Configure External Metrics Rules

```yaml
# External metrics (cluster-wide metrics not tied to pods)
rules:
  external:
    - seriesQuery: 'aws_sqs_approximate_number_of_messages_visible'
      resources:
        overrides:
          queue_name:
            resource: "externaldns.k8s.io/v1alpha1.dnsendpoints"  # Arbitrary mapping
      name:
        as: "sqs_queue_depth"
      metricsQuery: 'avg(<<.Series>>{queue_name="{{.MetricLabel.queue_name}}"})'
```

## Best Practices

- Validate all PromQL queries in the Prometheus UI before adding them to Prometheus Adapter rules.
- Use `avg()` in metricsQuery for pod-level metrics to get per-pod averages that align with HPA's `AverageValue` target.
- Deploy Prometheus Adapter with at least 2 replicas for HA; a single adapter instance creates an autoscaling single point of failure.
- Add adapter rules incrementally and verify each with `kubectl get --raw` before adding more.
- Set cache TTLs appropriately in adapter configuration; short TTLs increase Prometheus query load.
- Consider KEDA for simpler external metrics integration; Prometheus Adapter is better for complex PromQL-based custom metrics.

## Conclusion

Prometheus Adapter deployed via Flux CD extends Kubernetes autoscaling to any metric available in Prometheus, enabling sophisticated scaling policies based on application behavior rather than just infrastructure utilization. The adapter's PromQL-based rule system provides maximum flexibility for translating business metrics into scaling decisions, while managing it through Flux CD ensures all metric rules are versioned and auditable.
