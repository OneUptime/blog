# How to Deploy Loki on Kubernetes with Helm

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana Loki, Kubernetes, Helm, Log Management, Observability, Promtail, Cloud Native

Description: A comprehensive guide to deploying Grafana Loki on Kubernetes using Helm charts, covering the loki-stack, single binary, and distributed deployments with production-ready configurations.

---

Grafana Loki is a horizontally scalable, highly available log aggregation system designed for cloud-native environments. Deploying Loki on Kubernetes with Helm provides a streamlined, repeatable deployment process that can scale from development clusters to production workloads. This guide covers everything from basic loki-stack deployments to advanced distributed configurations.

## Prerequisites

Before starting, ensure you have:

- Kubernetes cluster (1.21+) with kubectl configured
- Helm 3.8 or later installed
- At least 4GB of available memory in your cluster
- Storage class configured for persistent volumes
- Basic understanding of Kubernetes concepts

## Adding the Grafana Helm Repository

First, add the Grafana Helm repository:

```bash
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update
```

Verify the repository was added:

```bash
helm search repo grafana/loki
```

You should see available Loki charts:

```
NAME                            CHART VERSION   APP VERSION
grafana/loki                    5.47.1          2.9.4
grafana/loki-stack              2.10.1          v2.9.3
grafana/loki-distributed        0.78.3          2.9.4
grafana/loki-simple-scalable    1.8.11          2.6.1
```

## Option 1 - Loki Stack (Quick Start)

The loki-stack chart deploys Loki along with Promtail and optionally Grafana. This is ideal for development and small-scale production environments.

### Basic Installation

```bash
helm install loki grafana/loki-stack \
  --namespace loki \
  --create-namespace
```

### Loki Stack with Custom Values

Create a `loki-stack-values.yaml` file:

```yaml
loki:
  enabled: true
  persistence:
    enabled: true
    size: 50Gi
    storageClassName: standard
  config:
    auth_enabled: false
    server:
      http_listen_port: 3100
    common:
      path_prefix: /loki
      replication_factor: 1
    schema_config:
      configs:
        - from: 2020-10-24
          store: tsdb
          object_store: filesystem
          schema: v13
          index:
            prefix: index_
            period: 24h
    limits_config:
      reject_old_samples: true
      reject_old_samples_max_age: 168h
      ingestion_rate_mb: 16
      ingestion_burst_size_mb: 24
      max_streams_per_user: 10000
    table_manager:
      retention_deletes_enabled: true
      retention_period: 720h
  resources:
    requests:
      cpu: 100m
      memory: 256Mi
    limits:
      cpu: 1000m
      memory: 1Gi

promtail:
  enabled: true
  config:
    clients:
      - url: http://loki:3100/loki/api/v1/push
    snippets:
      pipelineStages:
        - cri: {}
        - json:
            expressions:
              level: level
              msg: msg
        - labels:
            level:
  resources:
    requests:
      cpu: 50m
      memory: 64Mi
    limits:
      cpu: 200m
      memory: 128Mi

grafana:
  enabled: true
  persistence:
    enabled: true
    size: 10Gi
  adminPassword: admin
  datasources:
    datasources.yaml:
      apiVersion: 1
      datasources:
        - name: Loki
          type: loki
          url: http://loki:3100
          isDefault: true

test_pod:
  enabled: false
```

Install with custom values:

```bash
helm install loki grafana/loki-stack \
  --namespace loki \
  --create-namespace \
  -f loki-stack-values.yaml
```

## Option 2 - Single Binary Mode

For medium-scale deployments, the main Loki chart in single binary mode provides more configuration options:

Create `loki-single-values.yaml`:

```yaml
loki:
  auth_enabled: false

  commonConfig:
    path_prefix: /var/loki
    replication_factor: 1

  schemaConfig:
    configs:
      - from: 2024-01-01
        store: tsdb
        object_store: filesystem
        schema: v13
        index:
          prefix: loki_index_
          period: 24h

  storage:
    type: filesystem

  limits_config:
    reject_old_samples: true
    reject_old_samples_max_age: 168h
    ingestion_rate_mb: 32
    ingestion_burst_size_mb: 48
    max_streams_per_user: 10000
    max_line_size: 256kb
    max_entries_limit_per_query: 5000
    max_query_series: 500

deploymentMode: SingleBinary

singleBinary:
  replicas: 1
  persistence:
    enabled: true
    size: 100Gi
    storageClass: standard
  resources:
    requests:
      cpu: 500m
      memory: 1Gi
    limits:
      cpu: 2000m
      memory: 4Gi

# Disable components not needed in single binary mode
backend:
  replicas: 0
read:
  replicas: 0
write:
  replicas: 0

# Gateway configuration
gateway:
  enabled: true
  replicas: 1
  resources:
    requests:
      cpu: 50m
      memory: 64Mi
    limits:
      cpu: 200m
      memory: 256Mi
  service:
    type: ClusterIP
    port: 80

# Enable minio for object storage (optional)
minio:
  enabled: false

# Monitoring
monitoring:
  dashboards:
    enabled: true
  rules:
    enabled: true
  serviceMonitor:
    enabled: true
    labels:
      release: prometheus
```

Install:

```bash
helm install loki grafana/loki \
  --namespace loki \
  --create-namespace \
  -f loki-single-values.yaml
```

## Option 3 - Distributed Mode (Production)

For high-volume production environments, deploy Loki in distributed mode:

Create `loki-distributed-values.yaml`:

```yaml
loki:
  auth_enabled: true

  server:
    http_listen_port: 3100
    grpc_listen_port: 9095
    log_level: info

  commonConfig:
    path_prefix: /var/loki
    replication_factor: 3

  memberlist:
    join_members:
      - loki-memberlist

  schemaConfig:
    configs:
      - from: 2024-01-01
        store: tsdb
        object_store: s3
        schema: v13
        index:
          prefix: loki_index_
          period: 24h

  storage:
    type: s3
    bucketNames:
      chunks: loki-chunks
      ruler: loki-ruler
      admin: loki-admin
    s3:
      endpoint: s3.amazonaws.com
      region: us-east-1
      secretAccessKey: ${AWS_SECRET_ACCESS_KEY}
      accessKeyId: ${AWS_ACCESS_KEY_ID}
      s3ForcePathStyle: false
      insecure: false

  limits_config:
    reject_old_samples: true
    reject_old_samples_max_age: 168h
    ingestion_rate_mb: 64
    ingestion_burst_size_mb: 128
    max_streams_per_user: 50000
    max_line_size: 256kb
    max_entries_limit_per_query: 10000
    max_query_series: 1000
    max_query_parallelism: 32
    per_stream_rate_limit: 5MB
    per_stream_rate_limit_burst: 15MB

  rulerConfig:
    storage:
      type: s3
      s3:
        bucketnames: loki-ruler
    alertmanager_url: http://alertmanager:9093

deploymentMode: Distributed

# Ingester configuration
ingester:
  replicas: 3
  persistence:
    enabled: true
    size: 50Gi
    storageClass: fast-ssd
  resources:
    requests:
      cpu: 500m
      memory: 2Gi
    limits:
      cpu: 2000m
      memory: 4Gi
  affinity:
    podAntiAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        - labelSelector:
            matchLabels:
              app.kubernetes.io/component: ingester
          topologyKey: kubernetes.io/hostname

# Distributor configuration
distributor:
  replicas: 3
  resources:
    requests:
      cpu: 250m
      memory: 512Mi
    limits:
      cpu: 1000m
      memory: 1Gi
  affinity:
    podAntiAffinity:
      preferredDuringSchedulingIgnoredDuringExecution:
        - weight: 100
          podAffinityTerm:
            labelSelector:
              matchLabels:
                app.kubernetes.io/component: distributor
            topologyKey: kubernetes.io/hostname

# Querier configuration
querier:
  replicas: 3
  resources:
    requests:
      cpu: 500m
      memory: 1Gi
    limits:
      cpu: 2000m
      memory: 4Gi

# Query Frontend configuration
queryFrontend:
  replicas: 2
  resources:
    requests:
      cpu: 250m
      memory: 512Mi
    limits:
      cpu: 1000m
      memory: 2Gi

# Query Scheduler configuration
queryScheduler:
  replicas: 2
  resources:
    requests:
      cpu: 100m
      memory: 256Mi
    limits:
      cpu: 500m
      memory: 512Mi

# Compactor configuration
compactor:
  replicas: 1
  persistence:
    enabled: true
    size: 50Gi
  resources:
    requests:
      cpu: 250m
      memory: 1Gi
    limits:
      cpu: 1000m
      memory: 2Gi

# Index Gateway configuration
indexGateway:
  replicas: 2
  persistence:
    enabled: true
    size: 50Gi
  resources:
    requests:
      cpu: 250m
      memory: 512Mi
    limits:
      cpu: 1000m
      memory: 1Gi

# Ruler configuration
ruler:
  enabled: true
  replicas: 2
  resources:
    requests:
      cpu: 100m
      memory: 256Mi
    limits:
      cpu: 500m
      memory: 512Mi

# Gateway configuration
gateway:
  enabled: true
  replicas: 3
  resources:
    requests:
      cpu: 100m
      memory: 128Mi
    limits:
      cpu: 500m
      memory: 256Mi
  ingress:
    enabled: true
    ingressClassName: nginx
    hosts:
      - host: loki.example.com
        paths:
          - path: /
            pathType: Prefix
    tls:
      - secretName: loki-tls
        hosts:
          - loki.example.com

# Disable components not needed in distributed mode
singleBinary:
  replicas: 0
backend:
  replicas: 0
read:
  replicas: 0
write:
  replicas: 0

# Monitoring
monitoring:
  dashboards:
    enabled: true
  rules:
    enabled: true
    alerting: true
  serviceMonitor:
    enabled: true
    labels:
      release: prometheus
```

Install:

```bash
helm install loki grafana/loki \
  --namespace loki \
  --create-namespace \
  -f loki-distributed-values.yaml
```

## Deploying Promtail Separately

When using the main Loki chart, deploy Promtail separately:

Create `promtail-values.yaml`:

```yaml
config:
  clients:
    - url: http://loki-gateway.loki.svc.cluster.local/loki/api/v1/push
      tenant_id: default

  snippets:
    pipelineStages:
      - cri: {}
      - multiline:
          firstline: '^\d{4}-\d{2}-\d{2}'
          max_wait_time: 3s
      - json:
          expressions:
            level: level
            message: msg
            timestamp: time
      - labels:
          level:
      - timestamp:
          source: timestamp
          format: RFC3339

  # Scrape Kubernetes pods
  scrapeConfigs: |
    - job_name: kubernetes-pods
      kubernetes_sd_configs:
        - role: pod
      pipeline_stages:
        {{- toYaml .Values.config.snippets.pipelineStages | nindent 8 }}
      relabel_configs:
        - source_labels:
            - __meta_kubernetes_pod_controller_name
          regex: ([0-9a-z-.]+?)(-[0-9a-f]{8,10})?
          action: replace
          target_label: __tmp_controller_name
        - source_labels:
            - __meta_kubernetes_pod_label_app_kubernetes_io_name
            - __meta_kubernetes_pod_label_app
            - __tmp_controller_name
            - __meta_kubernetes_pod_name
          regex: ^;*([^;]+)(;.*)?$
          action: replace
          target_label: app
        - source_labels:
            - __meta_kubernetes_pod_label_app_kubernetes_io_instance
            - __meta_kubernetes_pod_label_release
          regex: ^;*([^;]+)(;.*)?$
          action: replace
          target_label: instance
        - source_labels:
            - __meta_kubernetes_pod_label_app_kubernetes_io_component
            - __meta_kubernetes_pod_label_component
          regex: ^;*([^;]+)(;.*)?$
          action: replace
          target_label: component
        - action: replace
          source_labels:
            - __meta_kubernetes_pod_node_name
          target_label: node_name
        - action: replace
          source_labels:
            - __meta_kubernetes_namespace
          target_label: namespace
        - action: replace
          replacement: $1
          separator: /
          source_labels:
            - namespace
            - app
          target_label: job
        - action: replace
          source_labels:
            - __meta_kubernetes_pod_name
          target_label: pod
        - action: replace
          source_labels:
            - __meta_kubernetes_pod_container_name
          target_label: container
        - action: replace
          replacement: /var/log/pods/*$1/*.log
          separator: /
          source_labels:
            - __meta_kubernetes_pod_uid
            - __meta_kubernetes_pod_container_name
          target_label: __path__
        - action: replace
          regex: true/(.*)
          replacement: /var/log/pods/*$1/*.log
          separator: /
          source_labels:
            - __meta_kubernetes_pod_annotationpresent_kubernetes_io_config_hash
            - __meta_kubernetes_pod_annotation_kubernetes_io_config_hash
            - __meta_kubernetes_pod_container_name
          target_label: __path__

tolerations:
  - key: node-role.kubernetes.io/master
    operator: Exists
    effect: NoSchedule
  - key: node-role.kubernetes.io/control-plane
    operator: Exists
    effect: NoSchedule

resources:
  requests:
    cpu: 50m
    memory: 64Mi
  limits:
    cpu: 200m
    memory: 256Mi

serviceMonitor:
  enabled: true
  labels:
    release: prometheus
```

Install Promtail:

```bash
helm install promtail grafana/promtail \
  --namespace loki \
  -f promtail-values.yaml
```

## Configuring Object Storage

### AWS S3

```yaml
loki:
  storage:
    type: s3
    bucketNames:
      chunks: my-loki-chunks
      ruler: my-loki-ruler
    s3:
      endpoint: s3.us-east-1.amazonaws.com
      region: us-east-1
      accessKeyId: ${AWS_ACCESS_KEY_ID}
      secretAccessKey: ${AWS_SECRET_ACCESS_KEY}
```

For IAM roles with service accounts (IRSA):

```yaml
serviceAccount:
  create: true
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/loki-role

loki:
  storage:
    type: s3
    bucketNames:
      chunks: my-loki-chunks
      ruler: my-loki-ruler
    s3:
      region: us-east-1
```

### Google Cloud Storage

```yaml
loki:
  storage:
    type: gcs
    bucketNames:
      chunks: my-loki-chunks
      ruler: my-loki-ruler
    gcs:
      chunkBufferSize: 0
      requestTimeout: 0s
      enableHttp2: true

serviceAccount:
  create: true
  annotations:
    iam.gke.io/gcp-service-account: loki@my-project.iam.gserviceaccount.com
```

### Azure Blob Storage

```yaml
loki:
  storage:
    type: azure
    bucketNames:
      chunks: loki-chunks
      ruler: loki-ruler
    azure:
      accountName: ${AZURE_STORAGE_ACCOUNT}
      accountKey: ${AZURE_STORAGE_KEY}
      containerName: loki
```

### MinIO (Self-Hosted S3)

```yaml
minio:
  enabled: true
  persistence:
    size: 100Gi
  resources:
    requests:
      cpu: 250m
      memory: 512Mi

loki:
  storage:
    type: s3
    bucketNames:
      chunks: chunks
      ruler: ruler
    s3:
      endpoint: loki-minio.loki.svc.cluster.local:9000
      accessKeyId: minio
      secretAccessKey: minio123
      s3ForcePathStyle: true
      insecure: true
```

## Verifying the Deployment

Check all pods are running:

```bash
kubectl get pods -n loki
```

Expected output for distributed mode:

```
NAME                                      READY   STATUS    RESTARTS   AGE
loki-compactor-0                          1/1     Running   0          5m
loki-distributor-7f8d9c5b6-xxxxx          1/1     Running   0          5m
loki-distributor-7f8d9c5b6-yyyyy          1/1     Running   0          5m
loki-gateway-6f7d8c9b5-xxxxx              1/1     Running   0          5m
loki-index-gateway-0                      1/1     Running   0          5m
loki-ingester-0                           1/1     Running   0          5m
loki-ingester-1                           1/1     Running   0          5m
loki-ingester-2                           1/1     Running   0          5m
loki-querier-6f7d8c9b5-xxxxx              1/1     Running   0          5m
loki-query-frontend-7f8d9c5b6-xxxxx       1/1     Running   0          5m
loki-query-scheduler-6f7d8c9b5-xxxxx      1/1     Running   0          5m
promtail-xxxxx                            1/1     Running   0          5m
```

Verify Loki is ready:

```bash
kubectl exec -it -n loki deploy/loki-gateway -- wget -q -O- http://localhost:8080/ready
```

## Connecting Grafana to Loki

If Grafana is deployed separately, configure the Loki data source:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-datasources
  namespace: grafana
  labels:
    grafana_datasource: "1"
data:
  loki.yaml: |
    apiVersion: 1
    datasources:
      - name: Loki
        type: loki
        access: proxy
        url: http://loki-gateway.loki.svc.cluster.local
        isDefault: true
        jsonData:
          maxLines: 1000
          httpHeaderName1: X-Scope-OrgID
        secureJsonData:
          httpHeaderValue1: default
```

## Example LogQL Queries

Once Loki is running, use these queries in Grafana:

```logql
# View all logs from a namespace
{namespace="default"}

# Filter by pod name pattern
{namespace="production", pod=~"api-.*"}

# Search for errors
{namespace="production"} |= "error"

# JSON log parsing
{namespace="production"} | json | level="error"

# Count errors over time
sum(rate({namespace="production"} |= "error" [5m])) by (pod)

# Top 10 pods by log volume
topk(10, sum(rate({namespace="production"}[1m])) by (pod))

# P99 response time from logs
quantile_over_time(0.99, {namespace="production"} | json | unwrap response_time [5m]) by (service)
```

## Upgrading Loki

To upgrade Loki:

```bash
# Update helm repos
helm repo update

# Check what will change
helm diff upgrade loki grafana/loki \
  --namespace loki \
  -f loki-values.yaml

# Perform the upgrade
helm upgrade loki grafana/loki \
  --namespace loki \
  -f loki-values.yaml
```

## Troubleshooting

### Check Loki Logs

```bash
kubectl logs -n loki -l app.kubernetes.io/name=loki --tail=100
```

### Check Ingester Ring Status

```bash
kubectl port-forward -n loki svc/loki-gateway 3100:80
curl http://localhost:3100/ring
```

### Verify Promtail is Shipping Logs

```bash
kubectl logs -n loki -l app.kubernetes.io/name=promtail --tail=50
```

### Test Push API

```bash
kubectl port-forward -n loki svc/loki-gateway 3100:80

curl -X POST "http://localhost:3100/loki/api/v1/push" \
  -H "Content-Type: application/json" \
  -H "X-Scope-OrgID: default" \
  -d '{
    "streams": [{
      "stream": {"job": "test"},
      "values": [["'"$(date +%s)"'000000000", "test message"]]
    }]
  }'
```

## Uninstalling

To remove Loki:

```bash
helm uninstall loki -n loki
helm uninstall promtail -n loki

# Delete PVCs if needed
kubectl delete pvc -n loki -l app.kubernetes.io/name=loki
```

## Conclusion

You have learned how to deploy Grafana Loki on Kubernetes using Helm, from simple loki-stack deployments to production-grade distributed configurations. Key takeaways:

- Use loki-stack for development and small-scale deployments
- Use single binary mode for medium-scale production
- Use distributed mode for high-volume, high-availability requirements
- Configure object storage (S3, GCS, Azure) for production persistence
- Deploy Promtail as a DaemonSet for comprehensive log collection
- Monitor Loki using the included Grafana dashboards and Prometheus metrics

The combination of Loki's efficient architecture and Kubernetes' orchestration capabilities provides a scalable, cost-effective log management solution for cloud-native environments.
