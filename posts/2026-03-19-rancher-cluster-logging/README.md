# How to Configure Cluster-Level Logging in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Logging

Description: Learn how to configure cluster-wide logging in Rancher using ClusterOutputs and ClusterFlows to collect logs from all namespaces.

Cluster-level logging in Rancher captures logs from all namespaces and workloads across the entire cluster. This is the recommended approach for centralized log management, security auditing, and compliance. This guide covers configuring ClusterOutputs and ClusterFlows to route all cluster logs to your preferred destination.

## Prerequisites

- Rancher v2.6 or later with the Logging chart installed.
- Cluster admin permissions.
- A log storage destination (Elasticsearch, Loki, Splunk, etc.).

## Understanding Cluster-Level vs Project-Level Logging

- **ClusterOutput + ClusterFlow**: Collects logs from all namespaces. Only cluster admins can create these resources. They must be created in the `cattle-logging-system` namespace.
- **Output + Flow**: Collects logs from a specific namespace. Project owners can create these in their own namespaces, while project members can only view them.

## Step 1: Create a ClusterOutput

A ClusterOutput defines where logs are sent. Here is an example for Elasticsearch:

```yaml
apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterOutput
metadata:
  name: elasticsearch-output
  namespace: cattle-logging-system
spec:
  elasticsearch:
    host: elasticsearch.logging.svc.cluster.local
    port: 9200
    scheme: https
    ssl_verify: true
    ssl_version: TLSv1_2
    user: elastic
    password:
      valueFrom:
        secretKeyRef:
          name: elasticsearch-credentials
          key: password
    index_name: kubernetes-logs
    type_name: "_doc"
    buffer:
      type: file
      path: /buffers/elasticsearch
      chunk_limit_size: 8MB
      total_limit_size: 2GB
      flush_interval: 5s
      flush_thread_count: 2
      retry_max_interval: 30s
      retry_forever: true
```

Create the credentials secret first:

```bash
kubectl create secret generic elasticsearch-credentials \
  --namespace cattle-logging-system \
  --from-literal=password='your-elasticsearch-password'
```

## Step 2: Create a ClusterFlow

A ClusterFlow defines which logs to collect and how to process them before sending to the output:

```yaml
apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterFlow
metadata:
  name: all-cluster-logs
  namespace: cattle-logging-system
spec:
  globalOutputRefs:
    - elasticsearch-output
```

This basic ClusterFlow sends all logs from all namespaces to the Elasticsearch output.

## Step 3: Filter Logs by Namespace

To collect logs only from specific namespaces:

```yaml
apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterFlow
metadata:
  name: production-logs
  namespace: cattle-logging-system
spec:
  match:
    - select:
        namespaces:
          - production
          - staging
    - exclude:
        namespaces:
          - kube-system
          - cattle-system
  globalOutputRefs:
    - elasticsearch-output
```

## Step 4: Filter Logs by Labels

Filter logs based on pod labels:

```yaml
apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterFlow
metadata:
  name: app-logs
  namespace: cattle-logging-system
spec:
  match:
    - select:
        labels:
          app.kubernetes.io/part-of: my-application
  globalOutputRefs:
    - elasticsearch-output
```

## Step 5: Add Log Processing Filters

Add filters to parse, transform, or enrich logs:

```yaml
apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterFlow
metadata:
  name: processed-logs
  namespace: cattle-logging-system
spec:
  filters:
    # Parse JSON logs
    - parser:
        parse:
          type: json
        key_name: log
        reserve_data: true
        remove_key_name_field: true

    # Add custom metadata
    - record_transformer:
        records:
          - cluster_name: "production-cluster"
            environment: "production"

    # Remove sensitive fields
    - record_transformer:
        remove_keys: "$.kubernetes.pod_id,$.kubernetes.docker_id"

    # Exclude health check logs
    - grep:
        exclude:
          - key: log
            pattern: "GET /healthz"
          - key: log
            pattern: "GET /readyz"

  globalOutputRefs:
    - elasticsearch-output
```

## Step 6: Route Different Logs to Different Outputs

Send different types of logs to different destinations:

```yaml
# Security logs to a dedicated index

apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterFlow
metadata:
  name: security-logs
  namespace: cattle-logging-system
spec:
  match:
    - select:
        namespaces:
          - kube-system
        labels:
          component: kube-apiserver
  globalOutputRefs:
    - security-elasticsearch-output
---
# Application logs to a general index
apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterFlow
metadata:
  name: application-logs
  namespace: cattle-logging-system
spec:
  match:
    - select:
        namespaces:
          - production
          - staging
    - exclude:
        namespaces:
          - kube-system
  globalOutputRefs:
    - app-elasticsearch-output
```

## Step 7: Configure Buffer Settings

Proper buffer configuration prevents log loss during destination outages:

```yaml
spec:
  elasticsearch:
    buffer:
      type: file
      path: /buffers/es
      chunk_limit_size: 8MB
      total_limit_size: 5GB
      flush_interval: 5s
      flush_thread_count: 4
      retry_max_interval: 60s
      retry_forever: true
      overflow_action: block
      flush_at_shutdown: true
```

Key buffer parameters:
- **chunk_limit_size**: Maximum size of each buffer chunk.
- **total_limit_size**: Maximum total buffer size on disk.
- **flush_interval**: How often to flush buffered logs.
- **retry_forever**: Keep retrying if the destination is down.
- **overflow_action**: What to do when the buffer is full (block, throw_exception, drop_oldest_chunk).

## Step 8: Verify Cluster Logging

Check that logs are flowing:

```bash
# Check ClusterOutput status
kubectl get clusteroutputs -n cattle-logging-system

# Check ClusterFlow status
kubectl get clusterflows -n cattle-logging-system

# Check Fluentd logs for errors
kubectl logs -n cattle-logging-system -l app.kubernetes.io/name=fluentd -c fluentd | tail -50

# Check Fluent Bit for collection issues
kubectl logs -n cattle-logging-system -l app.kubernetes.io/name=fluentbit | tail -50
```

## Step 9: Monitor Logging Health

After enabling logging metrics and ServiceMonitors, create Prometheus alerts for logging issues:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: logging-alerts
  namespace: cattle-monitoring-system
  labels:
    app: rancher-monitoring
    release: rancher-monitoring
spec:
  groups:
    - name: logging-alerts
      rules:
        - alert: FluentdNodeDown
          expr: |
            up{job=~".*-fluentd-metrics", namespace="cattle-logging-system"} == 0
          for: 10m
          labels:
            severity: critical
          annotations:
            summary: "Prometheus cannot scrape Fluentd"

        - alert: FluentbitTooManyErrors
          expr: |
            rate(fluentbit_output_retries_failed_total{job=~".*-fluentbit-metrics", namespace="cattle-logging-system"}[10m]) > 0
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Fluent Bit output retries are failing"
```

## Summary

Cluster-level logging in Rancher uses ClusterOutputs and ClusterFlows to collect and route logs from all namespaces. Configure output destinations with appropriate buffer settings for reliability, add filters to parse and transform logs, and use match rules to route different log types to different destinations. Always monitor the health of the logging pipeline itself to ensure no logs are being dropped.
