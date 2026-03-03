# How to Monitor Pod Resource Usage on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Pod Monitoring, Resource Usage, Prometheus, Grafana

Description: Learn how to track and optimize pod CPU, memory, and storage resource usage on Talos Linux Kubernetes clusters.

---

One of the most common operational challenges on Kubernetes is getting resource requests and limits right. Set them too low and your pods get throttled or killed. Set them too high and you waste expensive cluster capacity. On Talos Linux, where the OS is minimal and every resource counts, understanding pod resource usage is especially important. This guide shows you how to monitor pod-level resource consumption, identify waste, and right-size your workloads on Talos Linux.

## The Resource Management Problem

Every pod in Kubernetes can specify resource requests (the minimum guaranteed resources) and limits (the maximum allowed resources). In practice, most teams either guess at these values or copy them from examples. The result is clusters where some pods are severely over-provisioned and others are constantly hitting their limits.

Without monitoring, you have no way to know which category your pods fall into. You need data showing actual usage over time compared to the configured requests and limits.

## Step 1: Install Metrics Server

Metrics Server is the basic resource metrics API for Kubernetes. It powers `kubectl top` commands and provides real-time CPU and memory usage data.

```bash
# Install Metrics Server using Helm
helm repo add metrics-server https://kubernetes-sigs.github.io/metrics-server/
helm repo update

helm install metrics-server metrics-server/metrics-server \
  --namespace kube-system \
  --set args[0]="--kubelet-insecure-tls"
```

The `--kubelet-insecure-tls` flag is needed on Talos Linux because the kubelet uses self-signed certificates by default.

Verify it is working:

```bash
# Check that metrics-server is running
kubectl get pods -n kube-system -l app.kubernetes.io/name=metrics-server

# Test the metrics API
kubectl top nodes
kubectl top pods --all-namespaces
```

## Step 2: Deploy cAdvisor Metrics via Prometheus

While Metrics Server gives you point-in-time data, Prometheus collects historical data that lets you see trends. The kubelet on each node includes cAdvisor, which exposes container-level metrics.

If you are using kube-prometheus-stack, these metrics are already being collected. Verify with a PromQL query:

```promql
# CPU usage per pod
sum(rate(container_cpu_usage_seconds_total{container!="", pod!=""}[5m])) by (namespace, pod)

# Memory usage per pod
sum(container_memory_working_set_bytes{container!="", pod!=""}) by (namespace, pod)
```

If you do not see data, ensure the kubelet ServiceMonitor is configured:

```yaml
# kubelet-service-monitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: kubelet
  namespace: monitoring
  labels:
    release: prometheus-stack
spec:
  endpoints:
    - bearerTokenFile: /var/run/secrets/kubernetes.io/serviceaccount/token
      honorLabels: true
      interval: 30s
      port: https-metrics
      scheme: https
      tlsConfig:
        insecureSkipVerify: true
    - bearerTokenFile: /var/run/secrets/kubernetes.io/serviceaccount/token
      honorLabels: true
      interval: 30s
      path: /metrics/cadvisor
      port: https-metrics
      scheme: https
      tlsConfig:
        insecureSkipVerify: true
  namespaceSelector:
    matchNames:
      - kube-system
  selector:
    matchLabels:
      app.kubernetes.io/name: kubelet
```

## Step 3: Build Resource Usage Dashboards

Create a Grafana dashboard that compares actual usage against requests and limits:

```yaml
# pod-resources-dashboard.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: pod-resources-dashboard
  namespace: monitoring
  labels:
    grafana_dashboard: "1"
data:
  pod-resources.json: |
    {
      "dashboard": {
        "title": "Pod Resource Usage - Talos Linux",
        "templating": {
          "list": [
            {
              "name": "namespace",
              "type": "query",
              "query": "label_values(kube_pod_info, namespace)"
            },
            {
              "name": "pod",
              "type": "query",
              "query": "label_values(kube_pod_info{namespace=\"$namespace\"}, pod)"
            }
          ]
        },
        "panels": [
          {
            "title": "CPU: Usage vs Request vs Limit",
            "type": "timeseries",
            "targets": [
              {
                "expr": "sum(rate(container_cpu_usage_seconds_total{namespace=\"$namespace\", pod=\"$pod\", container!=\"\"}[5m])) by (container)",
                "legendFormat": "Usage - {{ container }}"
              },
              {
                "expr": "sum(kube_pod_container_resource_requests{namespace=\"$namespace\", pod=\"$pod\", resource=\"cpu\"}) by (container)",
                "legendFormat": "Request - {{ container }}"
              },
              {
                "expr": "sum(kube_pod_container_resource_limits{namespace=\"$namespace\", pod=\"$pod\", resource=\"cpu\"}) by (container)",
                "legendFormat": "Limit - {{ container }}"
              }
            ]
          },
          {
            "title": "Memory: Usage vs Request vs Limit",
            "type": "timeseries",
            "targets": [
              {
                "expr": "sum(container_memory_working_set_bytes{namespace=\"$namespace\", pod=\"$pod\", container!=\"\"}) by (container)",
                "legendFormat": "Usage - {{ container }}"
              },
              {
                "expr": "sum(kube_pod_container_resource_requests{namespace=\"$namespace\", pod=\"$pod\", resource=\"memory\"}) by (container)",
                "legendFormat": "Request - {{ container }}"
              },
              {
                "expr": "sum(kube_pod_container_resource_limits{namespace=\"$namespace\", pod=\"$pod\", resource=\"memory\"}) by (container)",
                "legendFormat": "Limit - {{ container }}"
              }
            ]
          }
        ]
      }
    }
```

```bash
kubectl apply -f pod-resources-dashboard.yaml
```

## Step 4: Identify Over-Provisioned Pods

Use PromQL to find pods that are requesting far more resources than they actually use:

```promql
# CPU over-provisioning ratio (request / actual usage)
# Values above 2 indicate the pod is requesting more than double what it uses
sum by (namespace, pod) (kube_pod_container_resource_requests{resource="cpu"})
/
sum by (namespace, pod) (rate(container_cpu_usage_seconds_total{container!=""}[24h]))

# Memory over-provisioning ratio
sum by (namespace, pod) (kube_pod_container_resource_requests{resource="memory"})
/
sum by (namespace, pod) (container_memory_working_set_bytes{container!=""})
```

You can create a Grafana table panel showing the most over-provisioned pods:

```promql
# Top 10 most over-provisioned pods by CPU
topk(10,
  sum by (namespace, pod) (kube_pod_container_resource_requests{resource="cpu"})
  /
  sum by (namespace, pod) (rate(container_cpu_usage_seconds_total{container!=""}[24h]))
)
```

## Step 5: Identify Under-Provisioned Pods

Equally important is finding pods that are hitting their limits:

```promql
# Pods with CPU throttling
sum by (namespace, pod) (rate(container_cpu_cfs_throttled_periods_total[5m]))
/
sum by (namespace, pod) (rate(container_cpu_cfs_periods_total[5m]))

# Pods approaching memory limits (above 90% of limit)
sum by (namespace, pod) (container_memory_working_set_bytes{container!=""})
/
sum by (namespace, pod) (kube_pod_container_resource_limits{resource="memory"})
> 0.9
```

## Step 6: Set Up Resource Usage Alerts

Create alerting rules to catch resource problems early:

```yaml
# pod-resource-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: pod-resource-alerts
  namespace: monitoring
  labels:
    release: prometheus-stack
spec:
  groups:
    - name: pod-resources
      rules:
        # Alert when pods are near their memory limit
        - alert: PodMemoryNearLimit
          expr: |
            sum by (namespace, pod, container) (container_memory_working_set_bytes{container!=""})
            /
            sum by (namespace, pod, container) (kube_pod_container_resource_limits{resource="memory"})
            > 0.9
          for: 15m
          labels:
            severity: warning
          annotations:
            summary: "Pod {{ $labels.namespace }}/{{ $labels.pod }} memory near limit"
            description: "Container {{ $labels.container }} in pod {{ $labels.pod }} is using {{ $value | humanizePercentage }} of its memory limit."

        # Alert on excessive CPU throttling
        - alert: PodCPUThrottling
          expr: |
            sum by (namespace, pod, container) (rate(container_cpu_cfs_throttled_periods_total[5m]))
            /
            sum by (namespace, pod, container) (rate(container_cpu_cfs_periods_total[5m]))
            > 0.5
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Pod {{ $labels.namespace }}/{{ $labels.pod }} is heavily CPU throttled"
            description: "Container {{ $labels.container }} is throttled {{ $value | humanizePercentage }} of the time. Consider increasing CPU limits."

        # Alert when pods are OOM killed
        - alert: PodOOMKilled
          expr: kube_pod_container_status_last_terminated_reason{reason="OOMKilled"} == 1
          for: 0m
          labels:
            severity: critical
          annotations:
            summary: "Pod {{ $labels.namespace }}/{{ $labels.pod }} was OOM killed"
            description: "Container {{ $labels.container }} was terminated due to OOM. Increase memory limits."
```

```bash
kubectl apply -f pod-resource-alerts.yaml
```

## Step 7: Use Vertical Pod Autoscaler for Recommendations

The Vertical Pod Autoscaler (VPA) can analyze resource usage and provide recommendations:

```bash
# Install VPA
kubectl apply -f https://github.com/kubernetes/autoscaler/releases/latest/download/vertical-pod-autoscaler.yaml
```

Create a VPA in recommendation-only mode:

```yaml
# vpa-recommendation.yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: my-app-vpa
  namespace: default
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  updatePolicy:
    # Recommendation only - do not auto-update
    updateMode: "Off"
```

Check recommendations:

```bash
kubectl describe vpa my-app-vpa
```

## Quick Commands for Daily Monitoring

Here are some useful commands for day-to-day pod resource monitoring on Talos Linux:

```bash
# See resource usage for all pods sorted by CPU
kubectl top pods --all-namespaces --sort-by=cpu

# See resource usage for all pods sorted by memory
kubectl top pods --all-namespaces --sort-by=memory

# Check resource requests and limits for pods in a namespace
kubectl get pods -n default -o custom-columns=\
"NAME:.metadata.name,\
CPU_REQ:.spec.containers[*].resources.requests.cpu,\
CPU_LIM:.spec.containers[*].resources.limits.cpu,\
MEM_REQ:.spec.containers[*].resources.requests.memory,\
MEM_LIM:.spec.containers[*].resources.limits.memory"

# Use talosctl for node-level resource view
talosctl stats --nodes 10.0.0.10
```

## Conclusion

Monitoring pod resource usage on Talos Linux is essential for running an efficient cluster. By combining Metrics Server for real-time data, Prometheus for historical trends, and Grafana for visualization, you get a complete picture of how your workloads consume resources. Use this data to right-size your pods, catch problems before they cause outages, and make informed decisions about cluster capacity. The investment in proper resource monitoring pays for itself quickly through reduced waste and fewer resource-related incidents.
