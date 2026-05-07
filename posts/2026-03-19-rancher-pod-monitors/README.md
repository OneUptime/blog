# How to Configure PodMonitors in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Monitoring, Prometheus, PodMonitor

Description: A practical guide to configuring PodMonitors in Rancher for scraping metrics directly from pods without a Kubernetes Service.

PodMonitors are similar to ServiceMonitors but target pods directly rather than going through a Kubernetes Service. They are useful when your application pods expose metrics but do not have a corresponding Service, or when you need to scrape sidecar containers. This guide covers creating and configuring PodMonitors in Rancher.

## Prerequisites

- Rancher v2.6 or later with the Monitoring chart installed.
- Pods that expose Prometheus-compatible metrics on an HTTP endpoint.
- Cluster admin or namespace-level permissions.

## Understanding PodMonitors vs ServiceMonitors

- **ServiceMonitor**: Selects Kubernetes Services by labels and scrapes the underlying pods through the service.
- **PodMonitor**: Selects pods directly by labels, bypassing the Service layer.

Use PodMonitors when:
- Pods do not have an associated Service (batch jobs, DaemonSets with host-level metrics).
- You need to scrape individual pod IPs directly.
- You want to monitor sidecar containers that expose metrics on a different port than the main service.

## Step 1: Verify Pod Metrics Endpoint

Check that your pod exposes metrics:

```bash
kubectl get pod my-app-pod -n my-namespace -o jsonpath='{.status.podIP}'
# Note the pod IP

kubectl exec -it another-pod -n my-namespace -- curl http://<pod-ip>:9090/metrics
```

## Step 2: Create a Basic PodMonitor

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: my-app-pod-monitor
  namespace: my-namespace
  labels:
    release: rancher-monitoring
spec:
  selector:
    matchLabels:
      app: my-app
  podMetricsEndpoints:
    - port: metrics
      path: /metrics
      interval: 30s
```

Key differences from ServiceMonitor:
- Uses `podMetricsEndpoints` instead of `endpoints`.
- Uses `port` which refers to a named container port, not a service port.
- Selects pods directly via `selector.matchLabels`.

Apply:

```bash
kubectl apply -f my-app-podmonitor.yaml
```

The examples in this guide use `release: rancher-monitoring` because Rancher Monitoring is commonly configured to select PodMonitors by that label. If your Prometheus `podMonitorSelector` is customized, use labels that match that selector instead.

## Step 3: Ensure Pods Have Named Container Ports

When you use `port`, PodMonitors reference container ports by name. Your pod spec should include named ports:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: my-namespace
spec:
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          image: my-app:latest
          ports:
            - name: http
              containerPort: 8080
            - name: metrics
              containerPort: 9090
```

## Step 4: Configure PodMonitor for DaemonSets

DaemonSets often expose host-level metrics. Here is an example for monitoring a custom DaemonSet:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: custom-daemonset-monitor
  namespace: kube-system
  labels:
    release: rancher-monitoring
spec:
  selector:
    matchLabels:
      app: custom-exporter
  podMetricsEndpoints:
    - port: metrics
      path: /metrics
      interval: 60s
      honorLabels: true
```

The `honorLabels: true` setting preserves labels from the metrics endpoint instead of overwriting them with Kubernetes-derived labels.

## Step 5: Monitor Sidecar Containers

When an application pod has a metrics sidecar, create a PodMonitor targeting the sidecar port:

```yaml
# Pod with sidecar

apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-with-sidecar
  namespace: my-namespace
spec:
  selector:
    matchLabels:
      app: my-app
      has-metrics-sidecar: "true"
  template:
    metadata:
      labels:
        app: my-app
        has-metrics-sidecar: "true"
    spec:
      containers:
        - name: main-app
          image: my-app:latest
          ports:
            - name: http
              containerPort: 8080
        - name: metrics-sidecar
          image: prom/statsd-exporter:latest
          ports:
            - name: metrics
              containerPort: 9102
---
# PodMonitor targeting the sidecar
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: sidecar-metrics-monitor
  namespace: my-namespace
  labels:
    release: rancher-monitoring
spec:
  selector:
    matchLabels:
      has-metrics-sidecar: "true"
  podMetricsEndpoints:
    - port: metrics
      path: /metrics
      interval: 30s
```

## Step 6: Configure Metric Relabeling

Filter and transform metrics just like with ServiceMonitors:

```yaml
spec:
  podMetricsEndpoints:
    - port: metrics
      metricRelabelings:
        # Keep only specific metrics
        - sourceLabels: [__name__]
          regex: "http_requests_total|http_request_duration.*|process_.*"
          action: keep

        # Drop high-cardinality labels
        - regex: "trace_id"
          action: labeldrop

      relabelings:
        # Add pod annotations as labels
        - sourceLabels: [__meta_kubernetes_pod_annotation_team]
          targetLabel: team

        # Add node name as a label
        - sourceLabels: [__meta_kubernetes_pod_node_name]
          targetLabel: node
```

## Step 7: Cross-Namespace PodMonitors

Monitor pods across multiple namespaces:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: cross-namespace-pod-monitor
  namespace: cattle-monitoring-system
  labels:
    release: rancher-monitoring
spec:
  namespaceSelector:
    matchNames:
      - production
      - staging
      - development
  selector:
    matchLabels:
      metrics-enabled: "true"
  podMetricsEndpoints:
    - port: metrics
      interval: 30s
```

Or monitor all namespaces:

```yaml
spec:
  namespaceSelector:
    any: true
```

## Step 8: Monitor Batch Jobs

PodMonitors are particularly useful for Kubernetes Jobs and CronJobs that do not have Services:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: batch-job-monitor
  namespace: batch-processing
  labels:
    release: rancher-monitoring
spec:
  selector:
    matchLabels:
      job-type: data-processing
  podMetricsEndpoints:
    - port: metrics
      path: /metrics
      # Use a shorter scrape interval for short-lived pods.
      interval: 15s
  # Use the Job's pod label as the Prometheus `job` label.
  jobLabel: batch.kubernetes.io/job-name
```

For the CronJob:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: data-processor
  namespace: batch-processing
spec:
  schedule: "*/30 * * * *"
  jobTemplate:
    spec:
      template:
        metadata:
          labels:
            job-type: data-processing
        spec:
          containers:
            - name: processor
              image: data-processor:latest
              ports:
                - name: metrics
                  containerPort: 9090
          restartPolicy: OnFailure
```

## Step 9: Verify PodMonitor Discovery

Check that Prometheus discovered the PodMonitor:

```bash
# List all PodMonitors
kubectl get podmonitors --all-namespaces

# Check Prometheus targets
kubectl port-forward -n cattle-monitoring-system svc/rancher-monitoring-prometheus 9090:9090
```

Open `http://localhost:9090/targets` and look for entries from your PodMonitor.

If targets are not appearing:

```bash
# Check Prometheus Operator logs
kubectl logs -n cattle-monitoring-system -l app=rancher-monitoring-operator | grep -i podmonitor

# Verify the PodMonitor labels match what Prometheus expects
kubectl get podmonitor my-app-pod-monitor -n my-namespace -o yaml | grep -A5 labels
```

## Step 10: Troubleshoot Common Issues

**Pods not discovered**: Verify the PodMonitor selector labels match pod labels.

```bash
# Check pod labels
kubectl get pods -n my-namespace -l app=my-app --show-labels
```

**Port not found**: Ensure the container port name matches the PodMonitor port name.

```bash
kubectl get pods -n my-namespace -o jsonpath='{.items[*].spec.containers[*].ports[*].name}'
```

**Selector label mismatch**: If your Rancher Monitoring Prometheus is configured to select PodMonitors by Helm release label, include `release: rancher-monitoring`. Otherwise, ensure the PodMonitor labels match `podMonitorSelector`.

**Namespace not watched**: Check Prometheus `podMonitorNamespaceSelector` configuration.

## Summary

PodMonitors in Rancher allow you to scrape Prometheus metrics directly from pods without requiring a Kubernetes Service. They are ideal for DaemonSets, sidecar containers, batch jobs, and any workload where service-based discovery is not appropriate. If your Rancher Monitoring installation selects PodMonitors by Helm release label, include `release: rancher-monitoring`; otherwise, make sure the PodMonitor labels match your Prometheus `podMonitorSelector`. When you use `port`, verify that pod container ports are named correctly.
