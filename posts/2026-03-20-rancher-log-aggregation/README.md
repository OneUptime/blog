# How to Configure Log Aggregation Pipelines in Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Log Aggregation, Loki, Fluentd, Observability

Description: Build scalable log aggregation pipelines in Rancher using Fluentd, Fluent Bit, or Vector to collect, process, and forward logs to centralized storage.

## Introduction

Log aggregation centralizes logs from all your Kubernetes workloads for searching, alerting, and compliance. This guide covers building production log pipelines using Fluent Bit (lightweight collection), Fluentd (processing and routing), and the Rancher Logging operator for declarative pipeline management.

## Prerequisites

- Rancher-managed Kubernetes cluster
- Helm 3.x installed
- Loki, Elasticsearch, or another log storage backend
- kubectl access
- jq installed for the validation query in Step 6

## Step 1: Install the Rancher Logging Operator

```bash
# Install from Rancher Apps catalog or via Helm

helm repo add rancher-charts https://charts.rancher.io
helm repo update

helm upgrade --install rancher-logging-crd rancher-charts/rancher-logging-crd \
  --namespace cattle-logging-system \
  --create-namespace \
  --wait

helm upgrade --install rancher-logging rancher-charts/rancher-logging \
  --namespace cattle-logging-system \
  --set logging.enabled=true \
  --wait
```

## Step 2: Configure ClusterFlow and ClusterOutput

```yaml
# cluster-output-loki.yaml - Send shared cluster logs to Loki
apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterOutput
metadata:
  name: loki-output
  namespace: cattle-logging-system
spec:
  loki:
    url: http://loki.observability.svc.cluster.local:3100
    configure_kubernetes_labels: true
    # Buffer configuration
    buffer:
      type: file
      path: /buffers/loki
      flush_mode: interval
      flush_interval: 10s
      retry_max_times: 5
    # Add cluster-level labels to all logs
    labels:
      cluster: rancher-production
      environment: production
---
# cluster-flow-all.yaml - Route cluster logs except namespaces with dedicated flows
apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterFlow
metadata:
  name: shared-logs-to-loki
  namespace: cattle-logging-system
spec:
  filters:
    # Parse JSON logs when the container log line is structured
    - parser:
        remove_key_name_field: true
        reserve_data: true
        emit_invalid_record_to_error: false
        parse:
          type: json
    # Normalize tags for consistent routing
    - tag_normaliser: {}
  match:
    - exclude:
        namespaces:
          - production
    - select: {}
  globalOutputRefs:
    - loki-output
```

## Step 3: Create Namespace-Specific Flows

```yaml
# production-flow.yaml - Production namespace log routing
apiVersion: logging.banzaicloud.io/v1beta1
kind: Flow
metadata:
  name: production-logs
  namespace: production
spec:
  filters:
    # Extract important fields from structured logs
    - parser:
        key_name: log
        reserve_data: true
        remove_key_name_field: true
        emit_invalid_record_to_error: false
        parse:
          type: json
          time_key: timestamp
          time_type: string
          time_format: "%Y-%m-%dT%H:%M:%SZ"
    # Add application labels
    - record_transformer:
        records:
          - app_version: "1.0.0"
            team: "platform"
    # Drop debug logs in production
    - grep:
        exclude:
          - key: level
            pattern: /^DEBUG$/
  # Exclude workloads that are handled by the dedicated critical flow
  match:
    - exclude:
        labels:
          tier: critical
    - select: {}
  globalOutputRefs:
    - loki-output
---
# production-critical-flow.yaml - Route logs from critical-tier workloads
apiVersion: logging.banzaicloud.io/v1beta1
kind: Flow
metadata:
  name: production-critical-logs
  namespace: production
spec:
  match:
    - select:
        labels:
          tier: critical
  localOutputRefs:
    - critical-logs-output
---
# critical-output.yaml - High-priority log output
apiVersion: logging.banzaicloud.io/v1beta1
kind: Output
metadata:
  name: critical-logs-output
  namespace: production
spec:
  elasticsearch:
    host: elasticsearch.observability.svc.cluster.local
    port: 9200
    index_name: critical-logs
    type_name: _doc
    buffer:
      type: file
      path: /buffers/critical
      flush_mode: interval
      flush_interval: 5s
```

## Step 4: Deploy Fluent Bit as DaemonSet (Alternative)

```yaml
# fluent-bit-values.yaml - Fluent Bit configuration
config:
  service: |
    [SERVICE]
      Flush         5
      Log_Level     info
      Daemon        off
      HTTP_Server   On
      HTTP_Listen   0.0.0.0
      HTTP_Port     2020

  inputs: |
    [INPUT]
        Name              tail
        Tag               kube.*
        Path              /var/log/containers/*.log
        multiline.parser  docker, cri
        DB                /var/log/flb_kube.db
        Mem_Buf_Limit     50MB
        Skip_Long_Lines   On
        Refresh_Interval  10

  filters: |
    # Kubernetes metadata enrichment
    [FILTER]
        Name                kubernetes
        Match               kube.*
        Kube_URL            https://kubernetes.default.svc:443
        Kube_CA_File        /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
        Kube_Token_File     /var/run/secrets/kubernetes.io/serviceaccount/token
        Merge_Log           On
        Keep_Log            Off
        K8S-Logging.Parser  On
        K8S-Logging.Exclude On

    # Add cluster label
    [FILTER]
        Name    record_modifier
        Match   kube.*
        Record  cluster rancher-production

  outputs: |
    # Send to Loki
    [OUTPUT]
        Name             loki
        Match            kube.*
        Host             loki.observability.svc.cluster.local
        Port             3100
        Labels           job=fluentbit,cluster=rancher-production
        Label_Keys       $kubernetes['namespace_name'],$kubernetes['pod_name'],$kubernetes['container_name']
        Line_Format      json
        Retry_Limit      5

    # Optional secondary output to Elasticsearch
    [OUTPUT]
        Name            es
        Match           kube.*
        Host            elasticsearch.observability.svc.cluster.local
        Port            9200
        Index           k8s-errors
        Retry_Limit     False
```

```bash
# Install Fluent Bit
helm repo add fluent https://fluent.github.io/helm-charts
helm install fluent-bit fluent/fluent-bit \
  --namespace cattle-logging-system \
  --create-namespace \
  --values fluent-bit-values.yaml \
  --wait
```

## Step 5: Configure Log Rotation and Retention

```yaml
# loki-values.yaml - Enable retention in the Loki Helm chart
loki:
  compactor:
    retention_enabled: true
    delete_request_store: filesystem # Use the same backend type configured for Loki storage
    working_directory: /var/loki/retention
  limits_config:
    # Default: 14 days
    retention_period: 336h
    retention_stream:
      # Production logs: 30 days
      - selector: '{namespace="production"}'
        priority: 1
        period: 720h
      # Development logs: 7 days
      - selector: '{namespace="development"}'
        priority: 1
        period: 168h

compactor:
  replicas: 1
  persistence:
    enabled: true
```

## Step 6: Test the Log Pipeline

```bash
# Generate test logs
kubectl run test-logger --image=busybox \
  --restart=Never \
  -n production \
  -- sh -c 'for i in $(seq 1 100); do echo "{\"level\":\"info\",\"msg\":\"test message $i\",\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}"; done'

# Wait for logs to be collected
sleep 30

# Query Loki for the test logs
kubectl port-forward -n observability svc/loki 3100:3100 &
curl -G -s 'http://localhost:3100/loki/api/v1/query' \
  --data-urlencode 'query={namespace="production",pod="test-logger"}' \
  --data-urlencode 'limit=10' | jq '.data.result[0].values'
```

## Conclusion

Log aggregation pipelines in Rancher provide centralized, searchable log storage across all your workloads. The Rancher Logging operator provides the most elegant Kubernetes-native approach with CRD-based pipeline configuration. For high-volume environments, use Fluent Bit (lightweight) for collection and Fluentd for complex routing and transformation. Always configure buffering and retry logic to handle backend outages, and set appropriate retention policies to control storage costs.
