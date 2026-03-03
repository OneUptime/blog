# How to Forward Talos Linux Logs to Loki

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Logging, Grafana Loki, Observability, Monitoring

Description: Learn how to forward Talos Linux system logs to Grafana Loki for centralized log aggregation and querying with LogQL

---

Grafana Loki has become one of the most popular open-source log aggregation systems, and for good reason. It is lightweight, cost-effective, and integrates beautifully with Grafana for visualization. If you are running a Talos Linux cluster and want a modern logging stack, forwarding your Talos system logs to Loki is an excellent choice. This guide walks you through the complete setup.

## Why Loki for Talos Linux Logs

Loki is designed with a different philosophy than traditional log systems like Elasticsearch. Instead of indexing the full content of every log line, Loki only indexes metadata (labels) and stores the log content in compressed chunks. This makes it significantly cheaper to operate while still providing powerful query capabilities through LogQL.

For Talos Linux clusters, Loki is a natural fit because:

- It is Kubernetes-native and easy to deploy
- It handles the JSON log format from Talos natively
- Grafana integration provides excellent dashboards and alerting
- It scales well from small clusters to large deployments
- Resource requirements are modest compared to alternatives

## Architecture Overview

The typical architecture for forwarding Talos logs to Loki involves three components:

1. **Talos Linux nodes** send logs via the built-in log forwarding mechanism
2. **An intermediary log collector** (like Vector, Promtail, or Fluent Bit) receives the logs and forwards them to Loki
3. **Loki** stores and indexes the logs for querying through Grafana

While Talos cannot send logs directly to Loki's HTTP API, you can use a log collector as the bridge.

## Setting Up Vector as a Bridge

Vector is a high-performance log pipeline that can receive Talos JSON logs and forward them to Loki. First, deploy Vector:

```yaml
# vector-config.yaml - ConfigMap for Vector
apiVersion: v1
kind: ConfigMap
metadata:
  name: vector-config
  namespace: monitoring
data:
  vector.toml: |
    # Receive Talos logs via TCP
    [sources.talos_logs]
    type = "socket"
    address = "0.0.0.0:5514"
    mode = "tcp"
    decoding.codec = "json"

    # Add labels for Loki
    [transforms.add_labels]
    type = "remap"
    inputs = ["talos_logs"]
    source = '''
      .service = del(.talos-service) ?? "unknown"
      .level = del(.talos-level) ?? "info"
      .node = del(.talos-node) ?? "unknown"
    '''

    # Send to Loki
    [sinks.loki]
    type = "loki"
    inputs = ["add_labels"]
    endpoint = "http://loki.monitoring.svc:3100"
    encoding.codec = "json"
    labels.service = "{{ service }}"
    labels.level = "{{ level }}"
    labels.source = "talos"
    labels.node = "{{ node }}"
```

Deploy Vector as a Deployment or DaemonSet:

```yaml
# vector-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vector-talos-bridge
  namespace: monitoring
spec:
  replicas: 2
  selector:
    matchLabels:
      app: vector-talos-bridge
  template:
    metadata:
      labels:
        app: vector-talos-bridge
    spec:
      containers:
      - name: vector
        image: timberio/vector:latest-alpine
        ports:
        - containerPort: 5514
          protocol: TCP
        volumeMounts:
        - name: config
          mountPath: /etc/vector
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 256Mi
      volumes:
      - name: config
        configMap:
          name: vector-config
---
apiVersion: v1
kind: Service
metadata:
  name: vector-talos-bridge
  namespace: monitoring
spec:
  selector:
    app: vector-talos-bridge
  ports:
  - port: 5514
    targetPort: 5514
    protocol: TCP
  type: ClusterIP
```

## Configuring Talos to Send Logs

Now configure your Talos nodes to send logs to the Vector bridge:

```yaml
# Machine configuration for Talos log forwarding to Vector
machine:
  logging:
    destinations:
      - endpoint: "tcp://vector-talos-bridge.monitoring.svc:5514/"
        format: json_lines
```

Apply this configuration to all nodes:

```bash
#!/bin/bash
# Configure all nodes to forward logs

NODES="192.168.1.10 192.168.1.11 192.168.1.12 192.168.1.20 192.168.1.21"
VECTOR_ENDPOINT="tcp://vector-talos-bridge.monitoring.svc:5514/"

for node in $NODES; do
  echo "Configuring $node..."
  talosctl patch machineconfig --nodes "$node" \
    --patch "[{
      \"op\": \"add\",
      \"path\": \"/machine/logging\",
      \"value\": {
        \"destinations\": [{
          \"endpoint\": \"$VECTOR_ENDPOINT\",
          \"format\": \"json_lines\"
        }]
      }
    }]"
done
```

Note: For the Talos nodes to reach the Kubernetes service, you may need to use the service's external IP or a NodePort. An alternative is to run Vector outside the cluster:

```yaml
# If Vector runs outside the cluster, use its IP directly
machine:
  logging:
    destinations:
      - endpoint: "tcp://192.168.1.100:5514/"
        format: json_lines
```

## Installing Loki

If you do not have Loki installed yet, the easiest way is through Helm:

```bash
# Add the Grafana Helm repository
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

# Install Loki
helm install loki grafana/loki-stack \
  --namespace monitoring \
  --create-namespace \
  --set loki.persistence.enabled=true \
  --set loki.persistence.size=50Gi
```

For a more customized installation:

```yaml
# loki-values.yaml
loki:
  persistence:
    enabled: true
    size: 100Gi
  config:
    limits_config:
      retention_period: 720h  # 30 days
    chunk_store_config:
      max_look_back_period: 720h

grafana:
  enabled: true
  persistence:
    enabled: true
```

```bash
helm install loki grafana/loki-stack \
  --namespace monitoring \
  --create-namespace \
  -f loki-values.yaml
```

## Using Promtail as an Alternative Bridge

Instead of Vector, you can use Promtail (Loki's native log collector) to receive Talos logs:

```yaml
# promtail-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: promtail-talos
  namespace: monitoring
data:
  promtail.yaml: |
    server:
      http_listen_port: 9080

    positions:
      filename: /tmp/positions.yaml

    clients:
      - url: http://loki.monitoring.svc:3100/loki/api/v1/push

    scrape_configs:
      - job_name: talos
        syslog:
          listen_address: 0.0.0.0:5514
          labels:
            source: talos
        relabel_configs:
          - source_labels: [__syslog_message_hostname]
            target_label: node
          - source_labels: [__syslog_message_app_name]
            target_label: service
```

## Querying Talos Logs in Grafana

Once logs are flowing into Loki, you can query them through Grafana using LogQL:

```logql
# All Talos logs
{source="talos"}

# Logs from a specific service
{source="talos", service="kubelet"}

# Logs from a specific node
{source="talos", node="192.168.1.10"}

# Error-level logs only
{source="talos", level="error"}

# Search for specific content
{source="talos"} |= "failed"

# Parse JSON and filter
{source="talos"} | json | talos_service="etcd" | talos_level="error"

# Count errors per service over time
count_over_time({source="talos", level="error"}[5m]) by (service)
```

## Creating a Grafana Dashboard

Create a dedicated dashboard for Talos Linux logs:

```json
{
  "dashboard": {
    "title": "Talos Linux Logs",
    "panels": [
      {
        "title": "Log Volume by Service",
        "type": "timeseries",
        "targets": [
          {
            "expr": "count_over_time({source=\"talos\"}[5m])",
            "legendFormat": "{{ service }}"
          }
        ]
      },
      {
        "title": "Error Logs",
        "type": "logs",
        "targets": [
          {
            "expr": "{source=\"talos\", level=\"error\"}"
          }
        ]
      },
      {
        "title": "Recent Talos Events",
        "type": "logs",
        "targets": [
          {
            "expr": "{source=\"talos\"} | json"
          }
        ]
      }
    ]
  }
}
```

## Setting Up Alerts

Configure Loki ruler to alert on important Talos events:

```yaml
# loki-alert-rules.yaml
groups:
  - name: talos-alerts
    rules:
      - alert: TalosServiceError
        expr: count_over_time({source="talos", level="error"}[5m]) > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate in Talos service {{ $labels.service }}"
          description: "More than 10 errors in 5 minutes from {{ $labels.service }} on {{ $labels.node }}"

      - alert: TalosEtcdErrors
        expr: count_over_time({source="talos", service="etcd", level="error"}[5m]) > 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "etcd errors detected on {{ $labels.node }}"
```

## Handling Log Volume

Talos Linux generates a moderate amount of logs, but during events like upgrades or node restarts, the volume can spike. Here are some strategies:

```toml
# Vector configuration with rate limiting
[transforms.rate_limit]
type = "throttle"
inputs = ["add_labels"]
threshold = 1000
window_secs = 1

[sinks.loki]
type = "loki"
inputs = ["rate_limit"]
endpoint = "http://loki.monitoring.svc:3100"
```

You can also filter out noisy log sources:

```toml
# Filter out debug-level logs
[transforms.filter_debug]
type = "filter"
inputs = ["add_labels"]
condition = '.level != "debug"'
```

## Verifying the Pipeline

After setting everything up, verify the entire pipeline:

```bash
# Generate some test logs by restarting a service
talosctl service kubelet restart --nodes 192.168.1.20

# Wait a moment for logs to propagate
sleep 10

# Query Loki to verify logs arrived
curl -s "http://loki.monitoring.svc:3100/loki/api/v1/query" \
  --data-urlencode 'query={source="talos"}' | jq .
```

## Best Practices

- Use Vector or Promtail as a bridge between Talos and Loki, since Talos cannot push directly to Loki's HTTP API.
- Add meaningful labels (node, service, level) for efficient querying in LogQL.
- Set appropriate retention periods in Loki to manage storage costs.
- Create Grafana dashboards for visualizing Talos log data.
- Set up alerts for critical events like etcd errors or service failures.
- Monitor the log pipeline itself to ensure logs are flowing.
- Use rate limiting in the log collector to protect Loki from log spikes.
- Run multiple Vector/Promtail replicas for high availability.
- Separate Talos system logs from Kubernetes application logs for cleaner organization.

Forwarding Talos Linux logs to Loki gives you a powerful, cost-effective centralized logging solution. Combined with Grafana dashboards and alerts, it provides the observability you need to operate your cluster confidently.
