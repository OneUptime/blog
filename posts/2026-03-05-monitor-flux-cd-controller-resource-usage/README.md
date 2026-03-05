# How to Monitor Flux CD Controller Resource Usage

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Monitoring, Resource Usage, Prometheus, Grafana

Description: Learn how to monitor CPU, memory, and other resource consumption of Flux CD controllers to ensure your GitOps infrastructure remains healthy and properly sized.

---

Flux CD runs several controllers inside your Kubernetes cluster -- source-controller, kustomize-controller, helm-controller, and notification-controller. Each consumes CPU and memory, and as your GitOps workload grows, these controllers may need more resources. Monitoring their resource usage helps you right-size resource requests and limits, prevent OOM kills, and keep reconciliations running smoothly.

## Prerequisites

- Kubernetes cluster with Flux CD installed
- Prometheus with kube-state-metrics and cAdvisor (included in kube-prometheus-stack)
- Grafana for visualization

## Understanding Flux CD Controller Resource Patterns

Flux CD controllers each have different resource profiles:

- **source-controller** -- Fetches Git repositories, Helm charts, and OCI artifacts. Memory usage scales with repository size and the number of sources.
- **kustomize-controller** -- Applies Kustomize overlays. CPU usage spikes during reconciliation of large manifests.
- **helm-controller** -- Renders and applies Helm charts. Memory usage can spike for charts with many templates.
- **notification-controller** -- Lightweight, handles event forwarding.

## Step 1: Ensure Metrics Are Available

The standard Kubernetes metrics for pod resource usage come from cAdvisor and kube-state-metrics. Verify they are available:

```bash
# Check that kube-state-metrics is running
kubectl get pods -n monitoring -l app.kubernetes.io/name=kube-state-metrics

# Check that Flux controller pods are running
kubectl get pods -n flux-system
```

## Step 2: Query CPU Usage in Prometheus

Use PromQL to observe CPU usage across Flux CD controllers. The following query shows the CPU usage rate per controller pod:

```yaml
# PromQL query for Flux controller CPU usage (cores)
# Paste this into your Prometheus or Grafana query editor
# rate(container_cpu_usage_seconds_total{namespace="flux-system", container!="POD", container!=""}[5m])
#
# Example Grafana dashboard panel configuration:
apiVersion: v1
kind: ConfigMap
metadata:
  name: flux-cpu-dashboard
  namespace: monitoring
data:
  flux-cpu.json: |
    {
      "panels": [
        {
          "title": "Flux Controller CPU Usage",
          "type": "timeseries",
          "targets": [
            {
              "expr": "rate(container_cpu_usage_seconds_total{namespace=\"flux-system\", container!=\"POD\", container!=\"\"}[5m])",
              "legendFormat": "{{ container }}"
            }
          ]
        }
      ]
    }
```

## Step 3: Query Memory Usage

Memory is often the more critical resource for Flux controllers, especially source-controller when handling large repositories:

```yaml
# PromQL queries for Flux controller memory usage
# Working set memory (what the kernel considers in-use):
# container_memory_working_set_bytes{namespace="flux-system", container!="POD", container!=""}
#
# Grafana panel configuration for memory monitoring:
apiVersion: v1
kind: ConfigMap
metadata:
  name: flux-memory-dashboard
  namespace: monitoring
data:
  flux-memory.json: |
    {
      "panels": [
        {
          "title": "Flux Controller Memory Usage vs Limits",
          "type": "timeseries",
          "targets": [
            {
              "expr": "container_memory_working_set_bytes{namespace=\"flux-system\", container!=\"POD\", container!=\"\"}",
              "legendFormat": "{{ container }} - usage"
            },
            {
              "expr": "kube_pod_container_resource_limits{namespace=\"flux-system\", resource=\"memory\"}",
              "legendFormat": "{{ container }} - limit"
            }
          ]
        }
      ]
    }
```

## Step 4: Set Up Resource Usage Alerts

Create PrometheusRules that fire when Flux controllers approach their resource limits:

```yaml
# flux-resource-alerts.yaml - Alert when controllers are near resource limits
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: flux-resource-usage-alerts
  namespace: flux-system
spec:
  groups:
    - name: flux-resource-usage
      rules:
        # Alert when memory usage exceeds 80% of the limit
        - alert: FluxControllerMemoryHigh
          expr: |
            (
              container_memory_working_set_bytes{namespace="flux-system", container!="POD", container!=""}
              /
              kube_pod_container_resource_limits{namespace="flux-system", resource="memory"}
            ) > 0.8
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Flux controller {{ $labels.container }} memory usage above 80%"
            description: >
              Container {{ $labels.container }} in pod {{ $labels.pod }}
              is using {{ $value | humanizePercentage }} of its memory limit.

        # Alert when CPU throttling is detected
        - alert: FluxControllerCPUThrottling
          expr: |
            rate(container_cpu_cfs_throttled_periods_total{namespace="flux-system", container!="POD", container!=""}[5m])
            /
            rate(container_cpu_cfs_periods_total{namespace="flux-system", container!="POD", container!=""}[5m])
            > 0.25
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Flux controller {{ $labels.container }} is CPU throttled"
            description: >
              Container {{ $labels.container }} is being CPU throttled
              more than 25% of the time.

        # Alert on OOMKilled containers
        - alert: FluxControllerOOMKilled
          expr: |
            kube_pod_container_status_last_terminated_reason{namespace="flux-system", reason="OOMKilled"} == 1
          for: 0m
          labels:
            severity: critical
          annotations:
            summary: "Flux controller {{ $labels.container }} was OOMKilled"
            description: >
              Container {{ $labels.container }} in pod {{ $labels.pod }}
              was terminated due to out-of-memory.
```

Apply the alerts:

```bash
# Apply resource usage alerts
kubectl apply -f flux-resource-alerts.yaml
```

## Step 5: Right-Size Controller Resources

After collecting baseline data, update Flux CD controller resource requests and limits. You can patch the Flux deployments using Kustomize:

```yaml
# kustomization.yaml - Patch Flux controller resources
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
patches:
  - target:
      kind: Deployment
      name: source-controller
      namespace: flux-system
    patch: |
      - op: replace
        path: /spec/template/spec/containers/0/resources
        value:
          requests:
            cpu: 100m
            memory: 256Mi
          limits:
            cpu: 1000m
            memory: 1Gi
  - target:
      kind: Deployment
      name: kustomize-controller
      namespace: flux-system
    patch: |
      - op: replace
        path: /spec/template/spec/containers/0/resources
        value:
          requests:
            cpu: 100m
            memory: 256Mi
          limits:
            cpu: 1000m
            memory: 1Gi
  - target:
      kind: Deployment
      name: helm-controller
      namespace: flux-system
    patch: |
      - op: replace
        path: /spec/template/spec/containers/0/resources
        value:
          requests:
            cpu: 100m
            memory: 256Mi
          limits:
            cpu: 1000m
            memory: 1Gi
```

## Step 6: Monitor with Grafana Dashboard

Import the Flux CD Grafana dashboard (ID: 16714) which includes controller resource panels, or build a custom dashboard with the queries above:

```bash
# Port-forward Grafana to access the dashboard
kubectl port-forward -n monitoring svc/grafana 3000:80
```

Navigate to `http://localhost:3000`, go to Dashboards > Import, and enter dashboard ID **16714**. This community dashboard includes panels for controller resource consumption alongside reconciliation metrics.

## Summary

Monitoring Flux CD controller resource usage requires tracking container-level CPU and memory metrics via Prometheus, setting up alerts for high memory utilization and CPU throttling, and using that data to right-size resource requests and limits. As your GitOps workload scales -- more repositories, more Kustomizations, more HelmReleases -- controller resource needs will change. A platform like OneUptime can centralize these resource metrics alongside your application monitoring, giving you a unified view of infrastructure health.
