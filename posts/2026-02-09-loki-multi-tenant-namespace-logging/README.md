# How to Configure Loki Multi-Tenant Mode

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Loki, Kubernetes, Security

Description: Learn how to configure Grafana Loki in multi-tenant mode to isolate logs by Kubernetes namespace, enabling secure log access control and quota management for different teams and applications.

---

In shared Kubernetes clusters, different teams need isolated log access. Loki's multi-tenant mode creates logical partitions for each tenant, ensuring teams only access their own logs while sharing the same Loki infrastructure. This guide shows you how to configure multi-tenant Loki with namespace-based isolation for Kubernetes environments.

## Understanding Loki Multi-Tenancy

Loki multi-tenancy works through tenant IDs (org IDs) that:

- Isolate log streams between tenants
- Enable an authenticating proxy to enforce per-tenant authorization
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
      reject_old_samples: true
      reject_old_samples_max_age: 168h
      ingestion_rate_mb: 10
      ingestion_burst_size_mb: 20
      per_stream_rate_limit: 5MB
      per_stream_rate_limit_burst: 15MB

    # Runtime per-tenant overrides
    runtime_config:
      file: /etc/loki/overrides.yaml

    schema_config:
      configs:
      - from: 2024-01-01
        store: tsdb
        object_store: s3
        schema: v13
        index:
          prefix: loki_index_
          period: 24h

    storage_config:
      tsdb_shipper:
        active_index_directory: /loki/index
        cache_location: /loki/cache
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
        image: grafana/loki:3.6.0
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
        - name: overrides
          mountPath: /etc/loki/overrides.yaml
          subPath: overrides.yaml
        - name: storage
          mountPath: /loki
      volumes:
      - name: config
        configMap:
          name: loki-config
      - name: overrides
        configMap:
          name: loki-overrides
  volumeClaimTemplates:
  - metadata:
      name: storage
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 100Gi
```

## Configuring Grafana Alloy for Multi-Tenant Log Shipping

Configure Grafana Alloy to add tenant IDs based on namespace:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: alloy-config
  namespace: monitoring
data:
  config.alloy: |
    discovery.kubernetes "pods" {
      role = "pod"
    }

    discovery.relabel "pods" {
      targets = discovery.kubernetes.pods.targets

      rule {
        source_labels = ["__meta_kubernetes_namespace"]
        target_label  = "namespace"
      }

      rule {
        source_labels = ["__meta_kubernetes_pod_name"]
        target_label  = "pod"
      }

      rule {
        source_labels = ["__meta_kubernetes_pod_container_name"]
        target_label  = "container"
      }
    }

    loki.source.kubernetes "pods" {
      targets    = discovery.relabel.pods.output
      forward_to = [loki.process.tenant.receiver]
    }

    loki.process "tenant" {
      forward_to = [loki.write.local.receiver]

      stage.tenant {
        label = "namespace"
      }
    }

    loki.write "local" {
      endpoint {
        url = "http://loki:3100/loki/api/v1/push"
      }
    }
```

Deploy Grafana Alloy:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: alloy
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: alloy
  template:
    metadata:
      labels:
        app: alloy
    spec:
      serviceAccountName: alloy
      containers:
      - name: alloy
        image: grafana/alloy:v1.16.1
        args:
        - run
        - /etc/alloy/config.alloy
        volumeMounts:
        - name: config
          mountPath: /etc/alloy
      volumes:
      - name: config
        configMap:
          name: alloy-config
```

## Creating RBAC for Log Collection

Set up role-based access control so Alloy can discover pods and read pod logs:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: alloy
  namespace: monitoring
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: alloy-logs-reader
rules:
- apiGroups: [""]
  resources: ["pods", "pods/log", "namespaces"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: alloy-logs-reader
subjects:
- kind: ServiceAccount
  name: alloy
  namespace: monitoring
roleRef:
  kind: ClusterRole
  name: alloy-logs-reader
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

## Using Loki Gateway for Tenant Header Forwarding

Deploy Loki Gateway to forward tenant headers. In production, put authentication in front of this gateway or replace the forwarded value with a tenant ID derived from the authenticated user:

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
          proxy_set_header X-Scope-OrgID $http_x_scope_orgid;
          proxy_set_header Host $host;
        }

        location = /loki/api/v1/query {
          proxy_pass http://loki;
          proxy_set_header X-Scope-OrgID $http_x_scope_orgid;
          proxy_set_header Host $host;
        }

        location = /loki/api/v1/query_range {
          proxy_pass http://loki;
          proxy_set_header X-Scope-OrgID $http_x_scope_orgid;
          proxy_set_header Host $host;
        }

        location = /loki/api/v1/labels {
          proxy_pass http://loki;
          proxy_set_header X-Scope-OrgID $http_x_scope_orgid;
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
  -G -s \
  'http://loki-gateway/loki/api/v1/query_range' \
  --data-urlencode 'query={namespace="production"}'

# Query development logs
curl -H "X-Scope-OrgID: development" \
  -G -s \
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

runtime_config:
  file: /etc/loki/overrides.yaml
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

Loki multi-tenant mode provides secure log isolation for shared Kubernetes clusters. By mapping tenants to namespaces, configuring per-tenant limits, and enforcing authentication before tenant headers reach Loki, you create a scalable logging system that serves multiple teams while maintaining security and resource boundaries. This approach reduces operational overhead while ensuring each team has isolated, performant access to their logs.
