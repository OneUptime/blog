# How to Monitor Pod Resource Consumption in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Monitoring, Prometheus, Grafana

Description: A guide to monitoring pod-level CPU, memory, and network metrics in Rancher using the UI, Grafana dashboards, and PromQL.

Understanding how individual pods consume cluster resources is essential for right-sizing workloads, identifying performance bottlenecks, and preventing resource contention. Rancher provides multiple ways to monitor pod resource consumption. This guide covers using the Rancher UI, Grafana dashboards, PromQL queries, and alerts for pod-level monitoring.

## Prerequisites

- Rancher v2.6 or later with the Monitoring chart installed.
- Kubernetes Metrics Server deployed if you want to use the Rancher usage columns or the `kubectl top` commands in Step 8.
- Cluster view or project member permissions.

## Step 1: View Pod Resources in the Rancher UI

1. Navigate to your cluster in the Rancher UI.
2. Go to **Workload > Pods** or navigate through **Workload > Deployments** and click into a specific deployment.
3. If resource metrics are available, each pod shows its current CPU and memory usage alongside its requests and limits.
4. Click on a pod name to see detailed resource metrics, container statuses, and events.

## Step 2: Use the Grafana Pod Dashboard

1. Open Grafana from **Monitoring > Grafana**.
2. Navigate to **Dashboards > Browse**.
3. Select **Kubernetes / Compute Resources / Pod**.
4. Use the namespace and pod dropdowns at the top to select the pod you want to monitor.

This dashboard displays:
- CPU usage vs requests and limits
- Memory usage (working set) vs requests and limits
- Network receive and transmit bandwidth
- Network receive and transmit packets
- Storage I/O

## Step 3: Query Pod CPU Metrics

Use these PromQL queries in the Prometheus UI or Grafana explore view:

### Pod CPU Usage

```promql
sum(rate(container_cpu_usage_seconds_total{container!="", pod!=""}[5m])) by (namespace, pod)
```

### Top 10 CPU Consuming Pods

```promql
topk(10, sum(rate(container_cpu_usage_seconds_total{container!="", pod!=""}[5m])) by (namespace, pod))
```

### Pod CPU Usage vs Requests

```promql
sum(rate(container_cpu_usage_seconds_total{container!="", namespace="my-namespace", pod="my-pod"}[5m])) by (namespace, pod)
/
sum(kube_pod_container_resource_requests{resource="cpu", namespace="my-namespace", pod="my-pod"}) by (namespace, pod)
```

### Pods Exceeding CPU Requests

```promql
(
  sum(rate(container_cpu_usage_seconds_total{container!=""}[5m])) by (namespace, pod)
  /
  sum(kube_pod_container_resource_requests{resource="cpu"}) by (namespace, pod)
) > 1
```

## Step 4: Query Pod Memory Metrics

### Pod Memory Working Set

```promql
sum(container_memory_working_set_bytes{container!="", pod!=""}) by (namespace, pod)
```

### Top 10 Memory Consuming Pods

```promql
topk(10, sum(container_memory_working_set_bytes{container!="", pod!=""}) by (namespace, pod))
```

### Pods Near Memory Limits

```promql
(
  sum(container_memory_working_set_bytes{container!=""}) by (namespace, pod)
  /
  sum(kube_pod_container_resource_limits{resource="memory"}) by (namespace, pod)
) > 0.8
```

### Pods Without Memory Limits

```promql
count by (namespace, pod) (
  kube_pod_container_info{container!=""}
  unless on (namespace, pod, container)
  kube_pod_container_resource_limits{resource="memory", container!=""}
)
```

## Step 5: Monitor Pod Network Metrics

### Pod Network Receive Bandwidth

```promql
sum(rate(container_network_receive_bytes_total{pod!=""}[5m])) by (namespace, pod)
```

### Pod Network Transmit Bandwidth

```promql
sum(rate(container_network_transmit_bytes_total{pod!=""}[5m])) by (namespace, pod)
```

### Pods with Network Errors

```promql
sum(rate(container_network_receive_errors_total{pod!=""}[5m])) by (namespace, pod) > 0
```

## Step 6: Monitor Pod Restarts and Status

### Pod Restart Count

```promql
sum(kube_pod_container_status_restarts_total) by (namespace, pod)
```

### Pods in CrashLoopBackOff

```promql
kube_pod_container_status_waiting_reason{reason="CrashLoopBackOff"} > 0
```

### Pods Not Ready

```promql
kube_pod_status_ready{condition="false"} == 1
and on (namespace, pod)
kube_pod_status_phase{phase=~"Pending|Running|Unknown"} == 1
```

### OOMKilled Containers

```promql
kube_pod_container_status_last_terminated_reason{reason="OOMKilled"} == 1
```

## Step 7: Set Up Pod-Level Alerts

Create PrometheusRules for pod resource alerts:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: pod-resource-alerts
  namespace: cattle-monitoring-system
  labels:
    app: rancher-monitoring
    release: rancher-monitoring
spec:
  groups:
    - name: pod-resource-alerts
      rules:
        - alert: PodHighMemoryUsage
          expr: |
            (
              sum(container_memory_working_set_bytes{container!=""}) by (namespace, pod)
              /
              sum(kube_pod_container_resource_limits{resource="memory"}) by (namespace, pod)
            ) > 0.9
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Pod {{ $labels.namespace }}/{{ $labels.pod }} memory usage above 90%"
            description: "Pod is using {{ $value | humanizePercentage }} of its memory limit."

        - alert: PodFrequentRestart
          expr: |
            sum(increase(kube_pod_container_status_restarts_total[1h])) by (namespace, pod) > 5
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Pod {{ $labels.namespace }}/{{ $labels.pod }} is restarting frequently"
            description: "Pod has restarted {{ $value }} times in the last hour."

        - alert: PodCrashLooping
          expr: |
            kube_pod_container_status_waiting_reason{reason="CrashLoopBackOff"} == 1
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Pod {{ $labels.namespace }}/{{ $labels.pod }} is crash looping"
            description: "Container {{ $labels.container }} in pod {{ $labels.pod }} is in CrashLoopBackOff state."

        - alert: PodOOMKilled
          expr: |
            kube_pod_container_status_last_terminated_reason{reason="OOMKilled"} == 1
          for: 0m
          labels:
            severity: warning
          annotations:
            summary: "Pod {{ $labels.namespace }}/{{ $labels.pod }} was OOMKilled"
            description: "Container {{ $labels.container }} was terminated due to OOM. Consider increasing memory limits."

        - alert: PodNotReady
          expr: |
            kube_pod_status_ready{condition="false"} == 1
            and on (namespace, pod)
            kube_pod_status_phase{phase=~"Pending|Running|Unknown"} == 1
          for: 15m
          labels:
            severity: warning
          annotations:
            summary: "Pod {{ $labels.namespace }}/{{ $labels.pod }} is not ready"
            description: "Pod has been not ready for more than 15 minutes."
```

Apply the rules:

```bash
kubectl apply -f pod-resource-alerts.yaml
```

## Step 8: Use kubectl for Quick Checks

```bash
# Top CPU consuming pods

kubectl top pods --all-namespaces --sort-by=cpu | head -20

# Top memory consuming pods
kubectl top pods --all-namespaces --sort-by=memory | head -20

# Pod resource requests and limits
kubectl get pods -n my-namespace -o custom-columns=\
NAME:.metadata.name,\
CPU_REQ:.spec.containers[*].resources.requests.cpu,\
CPU_LIM:.spec.containers[*].resources.limits.cpu,\
MEM_REQ:.spec.containers[*].resources.requests.memory,\
MEM_LIM:.spec.containers[*].resources.limits.memory
```

## Summary

Pod resource monitoring in Rancher combines the UI for quick overviews, Grafana dashboards for visualization, PromQL queries for deep analysis, and PrometheusRules for automated alerting. Focus on key metrics like memory usage relative to limits, restart counts, and OOMKill events to catch issues early. Regular monitoring helps with right-sizing workloads and maintaining cluster stability.
