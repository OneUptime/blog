# How to Set Up Centralized Logging for a Talos Linux Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Centralized Logging, Kubernetes, Loki, Observability

Description: Step-by-step guide to building a centralized logging pipeline for your Talos Linux Kubernetes cluster.

---

Running a Kubernetes cluster on Talos Linux means you are working with an immutable, minimal operating system that does not give you traditional shell access. Logs are not sitting in files you can browse on disk. Instead, machine-level logs come through the Talos API and container logs follow the standard Kubernetes logging model. Setting up centralized logging brings all of these log streams together in one place where you can search, filter, and alert on them.

This guide walks through building a complete centralized logging stack for a Talos Linux cluster using Grafana Loki as the log storage backend and Promtail as the log collector.

## Architecture Overview

A centralized logging setup for Talos Linux has three main components. First, you need a log collector that runs on every node and gathers both container logs and machine-level logs. Second, you need a log aggregation backend that stores and indexes the logs. Third, you need a query interface where operators can search and visualize the data.

For this setup, we will use Promtail as the collector, Loki as the backend, and Grafana as the query interface. This stack is lightweight, cost-effective, and integrates well with Kubernetes-native workflows.

## Deploying Loki

Loki is a log aggregation system designed by Grafana Labs. Unlike Elasticsearch, Loki does not index the full content of every log line. Instead, it indexes metadata labels, which makes it much cheaper to operate at scale.

Install Loki using Helm:

```bash
# Add the Grafana Helm repository
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

# Create a namespace for the logging stack
kubectl create namespace logging

# Install Loki in single-binary mode for simplicity
helm install loki grafana/loki \
  --namespace logging \
  --set loki.auth_enabled=false \
  --set singleBinary.replicas=1 \
  --set monitoring.selfMonitoring.enabled=false \
  --set monitoring.selfMonitoring.grafanaAgent.installOperator=false \
  --set test.enabled=false
```

For production clusters, you should use the distributed deployment mode with separate read and write paths, along with object storage like S3 for long-term retention. But the single-binary mode works well for getting started.

## Deploying Promtail

Promtail runs as a DaemonSet on every node. It reads container log files from the node filesystem and ships them to Loki. On Talos Linux, container logs are stored at `/var/log/pods/`, which is the standard Kubernetes log path.

```bash
# Install Promtail configured for Talos Linux
helm install promtail grafana/promtail \
  --namespace logging \
  --set config.clients[0].url=http://loki-gateway.logging.svc:80/loki/api/v1/push \
  --set tolerations[0].operator=Exists \
  --set tolerations[0].effect=NoSchedule
```

The tolerations ensure Promtail runs on control plane nodes as well, which is important for collecting API server and etcd logs.

For more control, create a custom values file:

```yaml
# promtail-values.yaml
# Promtail configuration optimized for Talos Linux
config:
  clients:
    - url: http://loki-gateway.logging.svc:80/loki/api/v1/push
      tenant_id: talos-cluster

  snippets:
    # Add Talos-specific labels to all logs
    extraRelabelConfigs:
      - source_labels: [__meta_kubernetes_node_name]
        target_label: node
      - source_labels: [__meta_kubernetes_namespace]
        target_label: namespace
      - source_labels: [__meta_kubernetes_pod_name]
        target_label: pod

tolerations:
  - operator: Exists
    effect: NoSchedule

# Mount the correct paths for Talos Linux
extraVolumes:
  - name: pods
    hostPath:
      path: /var/log/pods
  - name: run
    hostPath:
      path: /run/containerd

extraVolumeMounts:
  - name: pods
    mountPath: /var/log/pods
    readOnly: true
  - name: run
    mountPath: /run/containerd
    readOnly: true
```

Apply the custom configuration:

```bash
# Upgrade Promtail with Talos-specific settings
helm upgrade promtail grafana/promtail \
  --namespace logging \
  -f promtail-values.yaml
```

## Collecting Talos Machine Logs

Container logs only cover what runs inside Kubernetes. To get a complete picture, you also need Talos machine-level logs. These cover system services like `machined`, `apid`, `trustd`, and `etcd`.

Configure Talos to forward machine logs to a collector:

```yaml
# talos-logging-patch.yaml
# Forward Talos machine logs to a centralized collector
machine:
  logging:
    destinations:
      - endpoint: "tcp://vector-machine-logs.logging.svc:5140"
        format: json_lines
```

Deploy Vector as an intermediary that receives Talos machine logs and pushes them to Loki:

```yaml
# vector-machine-logs.yaml
# Vector deployment for receiving Talos machine logs
apiVersion: v1
kind: ConfigMap
metadata:
  name: vector-machine-config
  namespace: logging
data:
  vector.toml: |
    [sources.talos_machine]
    type = "socket"
    address = "0.0.0.0:5140"
    mode = "tcp"
    decoding.codec = "json"

    [transforms.add_labels]
    type = "remap"
    inputs = ["talos_machine"]
    source = '''
    .source = "talos-machine"
    '''

    [sinks.loki]
    type = "loki"
    inputs = ["add_labels"]
    endpoint = "http://loki-gateway.logging.svc:80"
    encoding.codec = "json"
    labels.source = "talos-machine"
    labels.service = "{{ talos-service }}"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vector-machine-logs
  namespace: logging
spec:
  replicas: 2
  selector:
    matchLabels:
      app: vector-machine-logs
  template:
    metadata:
      labels:
        app: vector-machine-logs
    spec:
      containers:
        - name: vector
          image: timberio/vector:0.34.1-distroless-libc
          ports:
            - containerPort: 5140
          volumeMounts:
            - name: config
              mountPath: /etc/vector
      volumes:
        - name: config
          configMap:
            name: vector-machine-config
---
apiVersion: v1
kind: Service
metadata:
  name: vector-machine-logs
  namespace: logging
spec:
  ports:
    - port: 5140
      targetPort: 5140
  selector:
    app: vector-machine-logs
```

Apply the resources:

```bash
# Deploy Vector for machine log collection
kubectl apply -f vector-machine-logs.yaml

# Apply the logging patch to all Talos nodes
talosctl apply-config --nodes 192.168.1.10,192.168.1.20 --patch @talos-logging-patch.yaml
```

## Deploying Grafana

Grafana provides the visual interface for searching and exploring your logs. If you already have Grafana running in your cluster, you just need to add Loki as a data source.

```bash
# Install Grafana
helm install grafana grafana/grafana \
  --namespace logging \
  --set adminPassword=your-secure-password \
  --set service.type=LoadBalancer \
  --set datasources."datasources\.yaml".apiVersion=1 \
  --set datasources."datasources\.yaml".datasources[0].name=Loki \
  --set datasources."datasources\.yaml".datasources[0].type=loki \
  --set datasources."datasources\.yaml".datasources[0].url=http://loki-gateway.logging.svc:80 \
  --set datasources."datasources\.yaml".datasources[0].access=proxy
```

## Creating Useful Log Queries

Once everything is connected, here are some LogQL queries to get you started in Grafana:

```logql
# View all logs from a specific namespace
{namespace="kube-system"}

# Filter for error-level logs across the cluster
{namespace=~".+"} |= "error" | logfmt | level="error"

# Search Talos machine logs for a specific service
{source="talos-machine", service="etcd"}

# Find OOM kills across all nodes
{namespace="kube-system"} |= "OOMKilled"

# View API server audit events
{pod=~"kube-apiserver.*"} | json | verb="delete"
```

## Setting Up Alerts

Create alert rules in Grafana that notify you when important events happen:

```yaml
# loki-alert-rules.yaml
# Alert rules for Talos cluster logging
apiVersion: 1
groups:
  - name: talos-alerts
    rules:
      - alert: HighErrorRate
        expr: |
          sum(rate({namespace=~".+"} |= "error" [5m])) > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected in cluster logs"
```

## Retention and Storage Planning

Plan your log retention based on your compliance and debugging needs. Loki supports retention policies through its configuration:

```yaml
# loki-retention-config.yaml
# Configure log retention periods
loki:
  limits_config:
    retention_period: 720h  # 30 days
  compactor:
    retention_enabled: true
```

For a cluster generating around 50GB of logs per day, expect to need roughly 500GB to 1TB of storage for 30 days of retention with Loki's compression.

Centralized logging on Talos Linux requires a bit more planning than traditional setups because you need to handle both Kubernetes-level and machine-level logs separately. But once the pipeline is running, you get the same powerful log search and alerting capabilities you would have on any other platform, with the added security benefits that come from Talos Linux's immutable design.
