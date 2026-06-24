# How to Set Up Multi-Cluster Logging in Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Logging, Multi-Cluster, Observability

Description: Configure centralized multi-cluster logging in Rancher using Rancher Logging (Fluentd/Fluentbit) to aggregate logs from all clusters to a central log storage system.

## Introduction

Multi-cluster logging centralizes logs from all your Kubernetes clusters into a single searchable location, enabling cross-cluster correlation, auditing, and alerting. Rancher Logging (based on the Logging operator with Fluent Bit collectors and Fluentd forwarders) provides a Kubernetes-native approach to configuring log pipelines across all clusters managed by Rancher.

## Architecture

```mermaid
graph LR
    C1[Cluster 1 Fluent Bit] -->|ship logs| Agg[Central Fluentd / OpenSearch]
    C2[Cluster 2 Fluent Bit] -->|ship logs| Agg
    C3[Cluster 3 Fluent Bit] -->|ship logs| Agg
    Agg --> Storage[OpenSearch / Elasticsearch / S3 / Loki]
```

## Step 1: Install Rancher Logging on Each Cluster

```bash
# Add Rancher charts repo

helm repo add rancher-charts https://charts.rancher.io
helm repo update

# Install Rancher Logging CRDs first when using Helm CLI
helm install rancher-logging-crd rancher-charts/rancher-logging-crd \
  -n cattle-logging-system \
  --create-namespace

# Install Rancher Logging on a downstream cluster
helm install rancher-logging rancher-charts/rancher-logging \
  -n cattle-logging-system \
  --set logging.enabled=true

# Install via Rancher UI: Cluster → Apps → Logging
```

## Step 2: Create a ClusterFlow and ClusterOutput for OpenSearch

```yaml
# opensearch-output.yaml - defines where to ship logs
apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterOutput
metadata:
  name: opensearch-output
  namespace: cattle-logging-system
spec:
  opensearch:
    host: opensearch.logging.svc.cluster.local
    port: 9200
    scheme: https
    ssl_verify: true
    user: admin
    password:
      valueFrom:
        secretKeyRef:
          name: opensearch-credentials
          key: password
    logstash_format: true
    logstash_prefix: k8s-logs
    suppress_type_name: true
    # Buffer configuration for reliability
    buffer:
      chunk_limit_size: 8M
      total_limit_size: 512M
      overflow_action: drop_oldest_chunk
      retry_max_interval: 30s
```

```yaml
# cluster-flow.yaml - defines what logs to collect and how to process them
apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterFlow
metadata:
  name: all-logs
  namespace: cattle-logging-system
spec:
  # Collect logs from all namespaces (except system noise)
  match:
    - exclude:
        namespaces:
          - kube-system
          - cattle-logging-system
    - select: {}    # Empty select = all remaining namespaces
  filters:
    # Add cluster name tag to every log record
    - record_transformer:
        records:
          - cluster_name: my-cluster-name
            environment: production
    # Parse JSON logs from structured applications
    - parser:
        parse:
          type: json
        key_name: log
        reserve_data: true
        remove_key_name_field: false
  globalOutputRefs:
    - opensearch-output
```

## Step 3: Ship to Multiple Outputs

```yaml
# multi-output-flow.yaml - ship to both OpenSearch and S3 for archive
apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterFlow
metadata:
  name: all-logs-multi-output
  namespace: cattle-logging-system
spec:
  match:
    - select: {}
  filters:
    - record_transformer:
        records:
          - cluster_name: my-cluster
  globalOutputRefs:
    - opensearch-output    # Live search
    - s3-archive-output    # Long-term archive
---
apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterOutput
metadata:
  name: s3-archive-output
  namespace: cattle-logging-system
spec:
  s3:
    aws_key_id:
      valueFrom:
        secretKeyRef:
          name: aws-s3-credentials
          key: access_key_id
    aws_sec_key:
      valueFrom:
        secretKeyRef:
          name: aws-s3-credentials
          key: secret_access_key
    s3_bucket: my-log-archive-bucket
    s3_region: us-east-1
    path: "k8s-logs/%Y/%m/%d/"
    buffer:
      timekey: 1h
      timekey_wait: 10m
      timekey_use_utc: true
    store_as: gzip
```

## Step 4: Configure Per-Namespace Flows

```yaml
# application-flow.yaml - collect only application logs in the production namespace
apiVersion: logging.banzaicloud.io/v1beta1
kind: Flow
metadata:
  name: production-app-logs
  namespace: production
spec:
  match:
    - select:
        labels:
          app: myapp   # Only collect logs from myapp pods
  filters:
    - parser:
        parse:
          type: json
        key_name: log
        reserve_data: true
    - tag_normaliser:
        format: "${namespace_name}.${pod_name}.${container_name}"
  localOutputRefs:
    - app-specific-output
```

## Step 5: Apply Logging Config via Fleet (GitOps)

```yaml
# gitops/logging/fleet.yaml
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: cluster-logging
  namespace: fleet-default
spec:
  repo: https://github.com/my-org/cluster-config
  branch: main
  paths:
    - logging/
  targets:
    - clusterSelector: {}   # Apply to all clusters
```

```text
logging/
├── cluster-output-opensearch.yaml    # Shared output config
├── cluster-flow-production.yaml      # Production log flow
├── cluster-flow-audit.yaml           # Audit log flow
└── kustomization.yaml
```

## Step 6: Set Up Log Alerting

```json
{
  "name": "High Error Rate Alert",
  "type": "monitor",
  "monitor_type": "query_level_monitor",
  "enabled": true,
  "schedule": {
    "period": {
      "interval": 5,
      "unit": "MINUTES"
    }
  },
  "inputs": [{
    "search": {
      "indices": ["k8s-logs-*"],
      "query": {
        "size": 0,
        "query": {
          "bool": {
            "filter": [
              {"range": {"@timestamp": {"gte": "{{period_end}}||-5m", "lte": "{{period_end}}", "format": "epoch_millis"}}},
              {"match_phrase": {"level": "ERROR"}}
            ]
          }
        }
      }
    }
  }],
  "triggers": [{
    "name": "ErrorCount > 100",
    "severity": "1",
    "condition": {
      "script": {
        "source": "ctx.results[0].hits.total.value > 100",
        "lang": "painless"
      }
    },
    "actions": [{
      "name": "Slack Alert",
      "destination_id": "<slack-destination-id>",
      "message_template": {
        "source": "Monitor {{ctx.monitor.name}} detected {{ctx.results.0.hits.total.value}} ERROR logs in the last 5 minutes."
      },
      "subject_template": {
        "source": "High error rate detected"
      }
    }]
  }]
}
```

## Conclusion

Multi-cluster logging with Rancher Logging provides a consistent, Kubernetes-native approach to centralizing logs from all clusters in your fleet. By deploying ClusterFlows and ClusterOutputs through Fleet's GitOps pipeline, every cluster automatically ships its logs to central storage with appropriate cluster metadata tags, enabling cross-cluster log correlation and long-term archival for compliance requirements.
