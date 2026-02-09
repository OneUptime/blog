# How to Configure Loki Multi-Tenant Mode for Isolated Kubernetes Namespace Logging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Loki, Kubernetes, Security

Description: Learn how to configure Grafana Loki in multi-tenant mode to isolate logs by Kubernetes namespace, enabling secure log access control and quota management for different teams and applications.

---

In shared Kubernetes clusters, different teams need isolated log access. Loki's multi-tenant mode creates logical partitions for each tenant, ensuring teams only access their own logs while sharing the same Loki infrastructure. This guide shows you how to configure multi-tenant Loki with namespace-based isolation for Kubernetes environments.

## Understanding Loki Multi-Tenancy

Loki multi-tenancy works through tenant IDs (org IDs) that:

- Isolate log streams between tenants
- Enable per-tenant authentication and authorization
- Allow per-tenant rate limits and retention policies
- Keep operational costs low by sharing infrastructure

For Kubernetes, mapping tenants to namespaces provides natural isolation aligned with cluster organization.

## Deploying Loki with Multi-Tenancy Enabled

Configure Loki to enable multi-tenant mode:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: loki-config
  namespace: monitoring
data:
  loki.yaml: |
    auth_enabled: true  # Enable multi-tenancy

    server:
      http_listen_port: 3100
      grpc_listen_port: 9095

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
      chunk_idle_period: 15m
      chunk_retain_period: 30s

    # Per-tenant limits
    limits_config:
      enforce_metric_name: false
      reject_old_samples: true
      reject_old_samples_max_age: 168h
      ingestion_rate_mb: 10
      ingestion_burst_size_mb: 20
      per_stream_rate_limit: 5MB
      per_stream_rate_limit_burst: 15MB

      # Per-tenant overrides
      per_tenant_override_config: /etc/loki/overrides.yaml

    schema_config:
      configs:
      - from: 2024-01-01
        store: boltdb-shipper
        object_store: s3
        schema: v11
        index:
          prefix: loki_index_
          period: 24h

    storage_config:
      boltdb_shipper:
        active_index_directory: /loki/index
        cache_location: /loki/cache
        shared_store: s3
      aws:
        s3: s3://us-east-1/loki-bucket
        s3forcepathstyle: true

    memberlist:
      join_members:
      - loki-memberlist:7946
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: loki-overrides
  namespace: monitoring
data:
  overrides.yaml: |
    overrides:
      # Production namespace gets higher limits
      production:
        ingestion_rate_mb: 50
        ingestion_burst_size_mb: 100
        max_streams_per_user: 10000

      # Development namespace gets standard limits
      development:
        ingestion_rate_mb: 10
        ingestion_burst_size_mb: 20
        max_streams_per_user: 5000

      # Staging namespace
      staging:
        ingestion_rate_mb: 20
        ingestion_burst_size_mb: 40
        max_streams_per_user: 7500
```

Deploy Loki StatefulSet:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: loki
  namespace: monitoring
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
        image: grafana/loki:2.9.3
        args:
        - -config.file=/etc/loki/loki.yaml
        - -target=all
        ports:
        - containerPort: 3100
          name: http
        - containerPort: 9095
          name: grpc
        volumeMounts:
        - name: config
          mountPath: /etc/loki
        - name: storage
          mountPath: /loki
      volumes:
      - name: config
        configMap:
          name: loki-config
  volumeClaimTemplates:
  - metadata:
      name: storage
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 100Gi
```

## Configuring Promtail for Multi-Tenant Log Shipping

Configure Promtail to add tenant IDs based on namespace:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: promtail-config
  namespace: monitoring
data:
  promtail.yaml: |
    server:
      http_listen_port: 9080
      grpc_listen_port: 0

    positions:
      filename: /tmp/positions.yaml

    clients:
    - url: http://loki:3100/loki/api/v1/push

    scrape_configs:
    - job_name: kubernetes-pods
      kubernetes_sd_configs:
      - role: pod

      pipeline_stages:
      # Extract namespace from labels
      - match:
          selector: '{namespace!=""}'
          stages:
          # Add tenant ID based on namespace
          - tenant:
              source: namespace

      relabel_configs:
      # Add namespace label
      - source_labels: [__meta_kubernetes_namespace]
        target_label: namespace

      # Add pod name
      - source_labels: [__meta_kubernetes_pod_name]
        target_label: pod

      # Add container name
      - source_labels: [__meta_kubernetes_pod_container_name]
        target_label: container

      # Set path to log files
      - replacement: /var/log/pods/*$1/*.log
        separator: /
        source_labels:
        - __meta_kubernetes_pod_uid
        - __meta_kubernetes_pod_container_name
        target_label: __path__
```

Deploy Promtail DaemonSet:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: promtail
  namespace: monitoring
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
        image: grafana/promtail:2.9.3
        args:
        - -config.file=/etc/promtail/promtail.yaml
        volumeMounts:
        - name: config
          mountPath: /etc/promtail
        - name: varlog
          mountPath: /var/log
        - name: varlibdockercontainers
          mountPath: /var/lib/docker/containers
          readOnly: true
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
```

## Creating RBAC for Multi-Tenant Access

Set up role-based access control for different teams:

```yaml
# Production team access
apiVersion: v1
kind: ServiceAccount
metadata:
  name: loki-production-reader
  namespace: monitoring
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: loki-production-reader
  namespace: monitoring
rules:
- apiGroups: [""]
  resources: ["pods", "pods/log"]
  verbs: ["get", "list"]
  resourceNames: ["loki-*"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: loki-production-reader
  namespace: monitoring
subjects:
- kind: ServiceAccount
  name: loki-production-reader
roleRef:
  kind: Role
  name: loki-production-reader
  apiGroup: rbac.authorization.k8s.io
```

## Configuring Grafana Data Sources per Tenant

Create separate Grafana data sources for each tenant:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-datasources
  namespace: monitoring
data:
  datasources.yaml: |
    apiVersion: 1
    datasources:
    # Production tenant
    - name: Loki-Production
      type: loki
      access: proxy
      url: http://loki:3100
      jsonData:
        httpHeaderName1: 'X-Scope-OrgID'
      secureJsonData:
        httpHeaderValue1: 'production'

    # Development tenant
    - name: Loki-Development
      type: loki
      access: proxy
      url: http://loki:3100
      jsonData:
        httpHeaderName1: 'X-Scope-OrgID'
      secureJsonData:
        httpHeaderValue1: 'development'

    # Staging tenant
    - name: Loki-Staging
      type: loki
      access: proxy
      url: http://loki:3100
      jsonData:
        httpHeaderName1: 'X-Scope-OrgID'
      secureJsonData:
        httpHeaderValue1: 'staging'
```

## Using Loki Gateway for Authentication

Deploy Loki Gateway to handle authentication:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: loki-gateway
  namespace: monitoring
spec:
  replicas: 2
  selector:
    matchLabels:
      app: loki-gateway
  template:
    metadata:
      labels:
        app: loki-gateway
    spec:
      containers:
      - name: nginx
        image: nginx:1.25
        ports:
        - containerPort: 80
        volumeMounts:
        - name: config
          mountPath: /etc/nginx/nginx.conf
          subPath: nginx.conf
      volumes:
      - name: config
        configMap:
          name: loki-gateway-config
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: loki-gateway-config
  namespace: monitoring
data:
  nginx.conf: |
    events {}
    http {
      upstream loki {
        server loki:3100;
      }

      server {
        listen 80;

        location = /loki/api/v1/push {
          proxy_pass http://loki;
          proxy_set_header X-Scope-OrgID $http_x_tenant_id;
          proxy_set_header Host $host;
        }

        location = /loki/api/v1/query {
          proxy_pass http://loki;
          proxy_set_header X-Scope-OrgID $http_x_tenant_id;
          proxy_set_header Host $host;
        }

        location = /loki/api/v1/query_range {
          proxy_pass http://loki;
          proxy_set_header X-Scope-OrgID $http_x_tenant_id;
          proxy_set_header Host $host;
        }

        location = /loki/api/v1/labels {
          proxy_pass http://loki;
          proxy_set_header X-Scope-OrgID $http_x_tenant_id;
          proxy_set_header Host $host;
        }
      }
    }
```

## Querying Logs with Tenant Context

Query logs for specific tenants:

```bash
# Query production logs
curl -H "X-Scope-OrgID: production" \
  'http://loki-gateway/loki/api/v1/query_range' \
  --data-urlencode 'query={namespace="production"}'

# Query development logs
curl -H "X-Scope-OrgID: development" \
  'http://loki-gateway/loki/api/v1/query_range' \
  --data-urlencode 'query={namespace="development"}'
```

In Grafana, use the tenant-specific data source:

```logql
# Automatically scoped to production tenant
{pod=~".*"} |= "error"

# Cross-namespace queries not allowed
{namespace="development"} # Returns no results when using Production datasource
```

## Monitoring Multi-Tenant Performance

Track tenant-specific metrics:

```promql
# Ingestion rate by tenant
sum by (tenant) (rate(loki_distributor_bytes_received_total[5m]))

# Query rate by tenant
sum by (org_id) (rate(loki_request_duration_seconds_count[5m]))

# Per-tenant stream count
loki_ingester_streams{tenant="production"}

# Rate limit hits by tenant
sum by (tenant) (rate(loki_discarded_samples_total[5m]))
```

## Implementing Tenant Quotas

Configure resource quotas per tenant:

```yaml
limits_config:
  # Global defaults
  ingestion_rate_mb: 10
  max_streams_per_user: 10000
  max_line_size: 256kb

  # Tenant-specific overrides
  per_tenant_override_config: /etc/loki/overrides.yaml
```

```yaml
# overrides.yaml
overrides:
  production:
    ingestion_rate_mb: 100
    max_streams_per_user: 50000
    max_query_lookback: 720h  # 30 days

  development:
    ingestion_rate_mb: 20
    max_streams_per_user: 10000
    max_query_lookback: 168h  # 7 days
```

## Conclusion

Loki multi-tenant mode provides secure log isolation for shared Kubernetes clusters. By mapping tenants to namespaces, configuring per-tenant limits, and implementing proper authentication, you create a scalable logging system that serves multiple teams while maintaining security and resource boundaries. This approach reduces operational overhead while ensuring each team has isolated, performant access to their logs.
