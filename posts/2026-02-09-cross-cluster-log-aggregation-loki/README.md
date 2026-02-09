# How to Set Up Cross-Cluster Log Aggregation with Loki and Promtail

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Loki, Kubernetes, Logging

Description: Configure Loki and Promtail to aggregate logs from multiple Kubernetes clusters into a centralized logging system for unified observability across your infrastructure.

---

Managing multiple Kubernetes clusters is common in modern infrastructure, whether for multi-region deployments, environment separation, or high availability. However, scattered logs across clusters make troubleshooting difficult and create blind spots in observability. Centralized log aggregation solves this by collecting logs from all clusters into a single Loki instance, enabling unified queries and correlation across your entire infrastructure.

This guide shows you how to architect and deploy a cross-cluster log aggregation system using Loki and Promtail.

## Architecture Overview

A cross-cluster log aggregation system consists of:

1. **Promtail agents** in each cluster collecting logs
2. **Central Loki instance** receiving logs from all clusters
3. **Cluster identification labels** for filtering and routing
4. **Shared object storage** for long-term log retention
5. **Load balancer** for high-availability ingestion

The key challenge is maintaining cluster context while avoiding label cardinality issues.

## Deploying Central Loki for Multi-Cluster

Deploy a centralized Loki instance with configuration optimized for multiple clusters:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: loki-config
  namespace: logging
data:
  loki.yaml: |
    auth_enabled: false

    server:
      http_listen_port: 3100
      grpc_listen_port: 9095
      log_level: info

    distributor:
      ring:
        kvstore:
          store: memberlist

    ingester:
      lifecycler:
        ring:
          kvstore:
            store: memberlist
          replication_factor: 3
        final_sleep: 0s
      chunk_idle_period: 5m
      chunk_retain_period: 30s
      max_transfer_retries: 0

    memberlist:
      join_members:
        - loki-gossip-ring.logging.svc.cluster.local:7946

    schema_config:
      configs:
      - from: 2024-01-01
        store: boltdb-shipper
        object_store: s3
        schema: v11
        index:
          prefix: multi_cluster_index_
          period: 24h

    storage_config:
      boltdb_shipper:
        active_index_directory: /loki/index
        cache_location: /loki/cache
        shared_store: s3
      aws:
        s3: s3://us-east-1/loki-multi-cluster
        s3forcepathstyle: true

    limits_config:
      enforce_metric_name: false
      reject_old_samples: true
      reject_old_samples_max_age: 168h
      ingestion_rate_mb: 100
      ingestion_burst_size_mb: 200
      max_label_name_length: 1024
      max_label_value_length: 2048
      max_label_names_per_series: 30

    chunk_store_config:
      max_look_back_period: 720h  # 30 days

    table_manager:
      retention_deletes_enabled: true
      retention_period: 720h

    compactor:
      working_directory: /loki/compactor
      shared_store: s3
      compaction_interval: 10m

    # Accept logs from remote clusters
    frontend:
      max_outstanding_per_tenant: 2048

    query_scheduler:
      max_outstanding_requests_per_tenant: 2048
---
apiVersion: v1
kind: Service
metadata:
  name: loki
  namespace: logging
spec:
  type: LoadBalancer
  ports:
  - name: http
    port: 3100
    targetPort: 3100
  - name: grpc
    port: 9095
    targetPort: 9095
  selector:
    app: loki
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: loki
  namespace: logging
spec:
  serviceName: loki
  replicas: 3
  selector:
    matchLabels:
      app: loki
  template:
    metadata:
      labels:
        app: loki
    spec:
      containers:
      - name: loki
        image: grafana/loki:2.9.0
        args:
        - -config.file=/etc/loki/loki.yaml
        ports:
        - containerPort: 3100
          name: http
        - containerPort: 9095
          name: grpc
        - containerPort: 7946
          name: gossip
        volumeMounts:
        - name: config
          mountPath: /etc/loki
        - name: storage
          mountPath: /loki
        resources:
          limits:
            memory: 4Gi
            cpu: 2
          requests:
            memory: 2Gi
            cpu: 1
      volumes:
      - name: config
        configMap:
          name: loki-config
  volumeClaimTemplates:
  - metadata:
      name: storage
    spec:
      accessModes:
      - ReadWriteOnce
      resources:
        requests:
          storage: 50Gi
```

## Configuring Promtail for Remote Clusters

Deploy Promtail in each cluster with configuration to send logs to the central Loki:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: promtail-config
  namespace: logging
data:
  promtail.yaml: |
    server:
      http_listen_port: 9080
      grpc_listen_port: 0
      log_level: info

    positions:
      filename: /tmp/positions.yaml

    clients:
      - url: https://loki.central.example.com/loki/api/v1/push
        tls_config:
          insecure_skip_verify: false
        backoff_config:
          min_period: 1s
          max_period: 5m
          max_retries: 10
        timeout: 30s
        batch_wait: 1s
        batch_size: 1048576  # 1MB

    scrape_configs:
      - job_name: kubernetes-pods
        kubernetes_sd_configs:
          - role: pod

        pipeline_stages:
          # Add cluster identifier
          - static_labels:
              cluster: production-us-east-1  # Set this per cluster
              region: us-east-1
              environment: production

        relabel_configs:
          # Standard Kubernetes labels
          - source_labels: [__meta_kubernetes_pod_node_name]
            target_label: node

          - source_labels: [__meta_kubernetes_namespace]
            target_label: namespace

          - source_labels: [__meta_kubernetes_pod_name]
            target_label: pod

          - source_labels: [__meta_kubernetes_pod_container_name]
            target_label: container

          - source_labels: [__meta_kubernetes_pod_label_app]
            target_label: app

          # Add deployment/statefulset name
          - source_labels: [__meta_kubernetes_pod_controller_name]
            target_label: workload

          - source_labels: [__meta_kubernetes_pod_controller_kind]
            target_label: workload_type

          # Drop pods without labels
          - source_labels: [__meta_kubernetes_pod_label_app]
            regex: ^$
            action: drop
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: promtail
  namespace: logging
spec:
  selector:
    matchLabels:
      app: promtail
  template:
    metadata:
      labels:
        app: promtail
    spec:
      serviceAccountName: promtail
      containers:
      - name: promtail
        image: grafana/promtail:2.9.0
        args:
        - -config.file=/etc/promtail/promtail.yaml
        env:
        - name: HOSTNAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        volumeMounts:
        - name: config
          mountPath: /etc/promtail
        - name: varlog
          mountPath: /var/log
          readOnly: true
        - name: varlibdockercontainers
          mountPath: /var/lib/docker/containers
          readOnly: true
        - name: positions
          mountPath: /tmp
        resources:
          limits:
            memory: 200Mi
          requests:
            cpu: 100m
            memory: 100Mi
      volumes:
      - name: config
        configMap:
          name: promtail-config
      - name: varlog
        hostPath:
          path: /var/log
      - name: varlibdockercontainers
        hostPath:
          path: /var/lib/docker/containers
      - name: positions
        hostPath:
          path: /tmp/promtail-positions
```

## Using ConfigMap for Cluster-Specific Configuration

Create a template for cluster configuration that you can customize per cluster:

```yaml
# promtail-cluster-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: promtail-cluster-labels
  namespace: logging
data:
  cluster_name: "${CLUSTER_NAME}"
  cluster_region: "${CLUSTER_REGION}"
  cluster_environment: "${CLUSTER_ENV}"
  loki_endpoint: "${LOKI_ENDPOINT}"
```

Deploy with environment-specific values:

```bash
# Deploy to production-us-east-1
export CLUSTER_NAME="production-us-east-1"
export CLUSTER_REGION="us-east-1"
export CLUSTER_ENV="production"
export LOKI_ENDPOINT="https://loki.central.example.com"

envsubst < promtail-cluster-config.yaml | kubectl apply -f -
```

## Implementing TLS for Secure Log Transmission

Secure log transmission between clusters using TLS:

```yaml
# Generate certificates for Loki
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: loki-tls
  namespace: logging
spec:
  secretName: loki-tls-secret
  issuer:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
  - loki.central.example.com
---
# Update Loki to use TLS
apiVersion: v1
kind: ConfigMap
metadata:
  name: loki-config
  namespace: logging
data:
  loki.yaml: |
    server:
      http_listen_port: 3100
      grpc_listen_port: 9095
      http_tls_config:
        cert_file: /etc/tls/tls.crt
        key_file: /etc/tls/tls.key
      grpc_tls_config:
        cert_file: /etc/tls/tls.crt
        key_file: /etc/tls/tls.key
    # ... rest of config
```

Update Promtail to use TLS client authentication:

```yaml
clients:
  - url: https://loki.central.example.com/loki/api/v1/push
    tls_config:
      ca_file: /etc/tls/ca.crt
      cert_file: /etc/tls/client.crt
      key_file: /etc/tls/client.key
      insecure_skip_verify: false
```

## Querying Across Multiple Clusters

Query logs from specific clusters or across all clusters:

```logql
# Logs from specific cluster
{cluster="production-us-east-1", namespace="api"}

# Logs from all production clusters
{environment="production", namespace="api"}

# Logs from all clusters with specific app
{app="payment-service"}

# Compare error rates across clusters
sum by (cluster) (
  rate({level="error"} [5m])
)

# Cross-cluster correlation
{cluster=~"production-.*", trace_id="abc123"}
```

## Managing Label Cardinality Across Clusters

Prevent label cardinality explosion with cluster labels:

```yaml
pipeline_stages:
  # Drop high-cardinality labels from remote clusters
  - labeldrop:
      - pod_ip
      - host_ip
      - pod_uid

  # Aggregate node labels
  - template:
      source: node_zone
      template: '{{ regexReplaceAll ".*-([a-z]+)$" .node "$1" }}'

  - labels:
      node_zone:

  - labeldrop:
      - node  # Drop full node name, keep zone

  # Limit workload label length
  - template:
      source: workload_short
      template: '{{ if gt (len .workload) 50 }}{{ .workload | trunc 50 }}{{ else }}{{ .workload }}{{ end }}'

  - labels:
      workload_short: workload

  - labeldrop:
      - workload_short
```

## Implementing Log Routing Based on Cluster

Route logs from different clusters to different storage tiers:

```yaml
# Loki multi-tenancy configuration
auth_enabled: true

limits_config:
  per_tenant_override_config: /etc/loki/overrides.yaml

# overrides.yaml
overrides:
  production-us-east-1:
    ingestion_rate_mb: 50
    retention_period: 2160h  # 90 days

  staging-us-east-1:
    ingestion_rate_mb: 20
    retention_period: 720h   # 30 days

  development-us-west-2:
    ingestion_rate_mb: 10
    retention_period: 168h   # 7 days
```

Configure Promtail to send tenant headers:

```yaml
clients:
  - url: https://loki.central.example.com/loki/api/v1/push
    tenant_id: production-us-east-1
```

## Monitoring Cross-Cluster Log Pipeline

Deploy monitoring for the aggregation pipeline:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-rules
  namespace: logging
data:
  loki-rules.yaml: |
    groups:
      - name: cross-cluster-logging
        interval: 1m
        rules:
          # Alert on cluster not sending logs
          - alert: ClusterNotReportingLogs
            expr: |
              absent_over_time(
                count by (cluster) ({job="kubernetes-pods"})[10m]
              )
            for: 10m
            labels:
              severity: critical
            annotations:
              summary: "Cluster {{ $labels.cluster }} not reporting logs"

          # Alert on high ingestion lag
          - alert: HighIngestionLag
            expr: |
              loki_ingester_memory_chunks > 10000
            for: 5m
            labels:
              severity: warning

          # Alert on failed log pushes
          - alert: PromtailPushFailures
            expr: |
              rate(promtail_sent_entries_total{status="failed"}[5m]) > 0
            for: 5m
            labels:
              severity: warning
            annotations:
              summary: "Promtail failing to push logs from {{ $labels.cluster }}"
```

## Optimizing Network Costs

Reduce cross-cluster network costs with compression:

```yaml
# Enable compression in Promtail
clients:
  - url: https://loki.central.example.com/loki/api/v1/push
    backoff_config:
      min_period: 1s
      max_period: 5m
      max_retries: 10
    # Larger batches reduce requests
    batch_wait: 5s
    batch_size: 2097152  # 2MB
    # Enable gzip compression
    headers:
      Content-Encoding: gzip
```

Use local filtering to reduce log volume:

```yaml
pipeline_stages:
  # Drop debug logs from remote clusters
  - match:
      selector: '{level="debug"}'
      action: drop

  # Drop health check logs
  - match:
      selector: '{path=~"/health|/metrics"}'
      action: drop
```

## Disaster Recovery for Centralized Loki

Implement backup and disaster recovery:

```yaml
# Backup Loki index to S3
apiVersion: batch/v1
kind: CronJob
metadata:
  name: loki-backup
  namespace: logging
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: amazon/aws-cli:latest
            command:
            - /bin/sh
            - -c
            - |
              aws s3 sync /loki/index s3://loki-backups/index-$(date +%Y%m%d)/
          volumeMounts:
          - name: loki-storage
            mountPath: /loki
          volumes:
          - name: loki-storage
            persistentVolumeClaim:
              claimName: loki-storage
```

## Conclusion

Cross-cluster log aggregation with Loki and Promtail provides unified observability across your Kubernetes infrastructure. The key to success is thoughtful label design that maintains cluster context without exploding cardinality, secure and reliable log transmission, and monitoring the aggregation pipeline itself. Start with a pilot cluster, validate the configuration, and gradually roll out to additional clusters while monitoring network costs and ingestion performance.
