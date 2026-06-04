# How to Configure Cortex Multi-Tenant Metrics Storage for Kubernetes Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cortex, Kubernetes, Multi-Tenancy, Metric, Prometheus

Description: Learn how to deploy and configure Cortex for multi-tenant Prometheus metrics storage in Kubernetes with tenant isolation and per-tenant limits.

---

Cortex provides horizontally scalable, multi-tenant Prometheus metrics storage. Each tenant's data is isolated logically while sharing infrastructure, enabling cost-effective metrics storage for multiple teams or customers.

This guide covers deploying Cortex with multi-tenant configuration for Kubernetes environments.

## Understanding Cortex Multi-Tenancy

Cortex identifies tenants through the X-Scope-OrgID HTTP header. All metrics for a tenant are isolated in storage and queries, preventing cross-tenant data leaks.

Multi-tenancy enables:

- Shared infrastructure costs across teams
- Per-tenant rate limits and quotas
- Isolated metrics storage and queries
- Tenant-specific retention policies

## Deploying Cortex Components

Cortex runs as multiple microservices. Deploy the core components:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: cortex
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: cortex-config
  namespace: cortex
data:
  cortex.yaml: |
    auth_enabled: true  # Enable multi-tenancy

    server:
      http_listen_port: 8080
      grpc_listen_port: 9095

    memberlist:
      join_members:
        - cortex-memberlist.cortex.svc.cluster.local:7946

    distributor:
      ring:
        kvstore:
          store: memberlist

    frontend_worker:
      frontend_address: cortex-query-frontend.cortex.svc.cluster.local:9095

    querier:
      store_gateway_addresses: dns+cortex-store-gateway.cortex.svc.cluster.local:9095

    ingester:
      lifecycler:
        ring:
          kvstore:
            store: memberlist
          replication_factor: 3
        num_tokens: 512

    storage:
      engine: blocks

    blocks_storage:
      backend: s3
      s3:
        endpoint: s3.amazonaws.com
        bucket_name: cortex-blocks
        region: us-east-1
      tsdb:
        dir: /data/tsdb
        retention_period: 24h

    runtime_config:
      file: /etc/cortex-runtime/overrides.yaml
      period: 10s

    limits:
      # Default limits for all tenants
      ingestion_rate: 25000
      ingestion_burst_size: 50000
      max_global_series_per_user: 1000000
      max_global_series_per_metric: 50000
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: cortex-runtime-config
  namespace: cortex
data:
  overrides.yaml: |
    overrides: {}
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cortex-distributor
  namespace: cortex
spec:
  replicas: 3
  selector:
    matchLabels:
      app: cortex
      component: distributor
  template:
    metadata:
      labels:
        app: cortex
        component: distributor
    spec:
      containers:
      - name: distributor
        image: quay.io/cortexproject/cortex:v1.16.0
        args:
          - -config.file=/etc/cortex/cortex.yaml
          - -target=distributor
        ports:
        - containerPort: 8080
          name: http
        - containerPort: 9095
          name: grpc
        volumeMounts:
        - name: config
          mountPath: /etc/cortex
        - name: runtime-config
          mountPath: /etc/cortex-runtime
      volumes:
      - name: config
        configMap:
          name: cortex-config
      - name: runtime-config
        configMap:
          name: cortex-runtime-config
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: cortex-ingester
  namespace: cortex
spec:
  serviceName: cortex-ingester
  replicas: 3
  selector:
    matchLabels:
      app: cortex
      component: ingester
  template:
    metadata:
      labels:
        app: cortex
        component: ingester
    spec:
      containers:
      - name: ingester
        image: quay.io/cortexproject/cortex:v1.16.0
        args:
          - -config.file=/etc/cortex/cortex.yaml
          - -target=ingester
        ports:
        - containerPort: 8080
          name: http
        - containerPort: 9095
          name: grpc
        volumeMounts:
        - name: config
          mountPath: /etc/cortex
        - name: runtime-config
          mountPath: /etc/cortex-runtime
        - name: data
          mountPath: /data
        resources:
          requests:
            memory: 4Gi
            cpu: 2
          limits:
            memory: 8Gi
            cpu: 4
      volumes:
      - name: config
        configMap:
          name: cortex-config
      - name: runtime-config
        configMap:
          name: cortex-runtime-config
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 100Gi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cortex-querier
  namespace: cortex
spec:
  replicas: 2
  selector:
    matchLabels:
      app: cortex
      component: querier
  template:
    metadata:
      labels:
        app: cortex
        component: querier
    spec:
      containers:
      - name: querier
        image: quay.io/cortexproject/cortex:v1.16.0
        args:
          - -config.file=/etc/cortex/cortex.yaml
          - -target=querier
        ports:
        - containerPort: 8080
          name: http
        volumeMounts:
        - name: config
          mountPath: /etc/cortex
        - name: runtime-config
          mountPath: /etc/cortex-runtime
      volumes:
      - name: config
        configMap:
          name: cortex-config
      - name: runtime-config
        configMap:
          name: cortex-runtime-config
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cortex-query-frontend
  namespace: cortex
spec:
  replicas: 2
  selector:
    matchLabels:
      app: cortex
      component: query-frontend
  template:
    metadata:
      labels:
        app: cortex
        component: query-frontend
    spec:
      containers:
      - name: query-frontend
        image: quay.io/cortexproject/cortex:v1.16.0
        args:
          - -config.file=/etc/cortex/cortex.yaml
          - -target=query-frontend
        ports:
        - containerPort: 8080
          name: http
        - containerPort: 9095
          name: grpc
        volumeMounts:
        - name: config
          mountPath: /etc/cortex
        - name: runtime-config
          mountPath: /etc/cortex-runtime
      volumes:
      - name: config
        configMap:
          name: cortex-config
      - name: runtime-config
        configMap:
          name: cortex-runtime-config
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cortex-store-gateway
  namespace: cortex
spec:
  replicas: 3
  selector:
    matchLabels:
      app: cortex
      component: store-gateway
  template:
    metadata:
      labels:
        app: cortex
        component: store-gateway
    spec:
      containers:
      - name: store-gateway
        image: quay.io/cortexproject/cortex:v1.16.0
        args:
          - -config.file=/etc/cortex/cortex.yaml
          - -target=store-gateway
        ports:
        - containerPort: 8080
          name: http
        - containerPort: 9095
          name: grpc
        volumeMounts:
        - name: config
          mountPath: /etc/cortex
        - name: runtime-config
          mountPath: /etc/cortex-runtime
      volumes:
      - name: config
        configMap:
          name: cortex-config
      - name: runtime-config
        configMap:
          name: cortex-runtime-config
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cortex-compactor
  namespace: cortex
spec:
  replicas: 1
  selector:
    matchLabels:
      app: cortex
      component: compactor
  template:
    metadata:
      labels:
        app: cortex
        component: compactor
    spec:
      containers:
      - name: compactor
        image: quay.io/cortexproject/cortex:v1.16.0
        args:
          - -config.file=/etc/cortex/cortex.yaml
          - -target=compactor
        ports:
        - containerPort: 8080
          name: http
        volumeMounts:
        - name: config
          mountPath: /etc/cortex
        - name: runtime-config
          mountPath: /etc/cortex-runtime
      volumes:
      - name: config
        configMap:
          name: cortex-config
      - name: runtime-config
        configMap:
          name: cortex-runtime-config
---
apiVersion: v1
kind: Service
metadata:
  name: cortex-memberlist
  namespace: cortex
spec:
  clusterIP: None
  selector:
    app: cortex
  ports:
  - port: 7946
    name: memberlist
---
apiVersion: v1
kind: Service
metadata:
  name: cortex-distributor
  namespace: cortex
spec:
  selector:
    app: cortex
    component: distributor
  ports:
  - port: 8080
    name: http
---
apiVersion: v1
kind: Service
metadata:
  name: cortex-ingester
  namespace: cortex
spec:
  clusterIP: None
  selector:
    app: cortex
    component: ingester
  ports:
  - port: 9095
    name: grpc
---
apiVersion: v1
kind: Service
metadata:
  name: cortex-store-gateway
  namespace: cortex
spec:
  selector:
    app: cortex
    component: store-gateway
  ports:
  - port: 9095
    name: grpc
---
apiVersion: v1
kind: Service
metadata:
  name: cortex-query-frontend
  namespace: cortex
spec:
  selector:
    app: cortex
    component: query-frontend
  ports:
  - port: 8080
    name: http
  - port: 9095
    name: grpc
```

## Configuring Per-Tenant Limits

Define different limits for each tenant in the configuration:

```yaml
limits:
  # Default limits
  ingestion_rate: 25000
  ingestion_burst_size: 50000
  max_global_series_per_user: 1000000

# Per-tenant overrides

overrides:
  tenant-prod:
    ingestion_rate: 100000
    ingestion_burst_size: 200000
    max_global_series_per_user: 5000000
    max_query_length: 2160h  # 90 days

  tenant-staging:
    ingestion_rate: 50000
    ingestion_burst_size: 100000
    max_global_series_per_user: 2000000
    max_query_length: 720h  # 30 days

  tenant-dev:
    ingestion_rate: 10000
    ingestion_burst_size: 20000
    max_global_series_per_user: 500000
    max_query_length: 168h  # 7 days
```

Store runtime overrides in a ConfigMap and mount it:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cortex-runtime-config
  namespace: cortex
data:
  overrides.yaml: |
    overrides:
      tenant-prod:
        ingestion_rate: 100000
      # ... other tenants
```

Update cortex.yaml to load overrides:

```yaml
runtime_config:
  file: /etc/cortex-runtime/overrides.yaml
  period: 10s  # Reload every 10s
```

## Configuring Prometheus Remote Write by Tenant

Each Prometheus instance sends metrics to Cortex with its tenant ID:

```yaml
# Production cluster Prometheus
apiVersion: monitoring.coreos.com/v1
kind: Prometheus
metadata:
  name: production
spec:
  remoteWrite:
  - url: http://cortex-distributor.cortex.svc.cluster.local:8080/api/v1/push
    headers:
      X-Scope-OrgID: tenant-prod
    queueConfig:
      capacity: 50000
      maxShards: 200
---
# Staging cluster Prometheus
apiVersion: monitoring.coreos.com/v1
kind: Prometheus
metadata:
  name: staging
spec:
  remoteWrite:
  - url: http://cortex-distributor.cortex.svc.cluster.local:8080/api/v1/push
    headers:
      X-Scope-OrgID: tenant-staging
    queueConfig:
      capacity: 25000
      maxShards: 100
```

## Setting Up Tenant-Specific Retention

Configure different retention periods per tenant:

```yaml
overrides:
  tenant-prod:
    compactor_blocks_retention_period: 2160h  # 90 days

  tenant-staging:
    compactor_blocks_retention_period: 720h   # 30 days

  tenant-dev:
    compactor_blocks_retention_period: 168h   # 7 days
```

## Implementing Tenant Authentication

Secure tenant access with an auth proxy:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cortex-auth-proxy
  namespace: cortex
spec:
  replicas: 2
  selector:
    matchLabels:
      app: cortex-auth-proxy
  template:
    metadata:
      labels:
        app: cortex-auth-proxy
    spec:
      containers:
      - name: nginx
        image: nginx:1.25
        ports:
        - containerPort: 8080
        volumeMounts:
        - name: config
          mountPath: /etc/nginx/conf.d
        - name: htpasswd
          mountPath: /etc/nginx/auth
          readOnly: true
      volumes:
      - name: config
        configMap:
          name: nginx-auth-config
      - name: htpasswd
        secret:
          secretName: cortex-auth-users
---
apiVersion: v1
kind: Secret
metadata:
  name: cortex-auth-users
  namespace: cortex
type: Opaque
stringData:
  .htpasswd: |
    tenant-prod:$apr1$UqSiympj$pgTapNBQ66n8EHLYdpNM40
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-auth-config
  namespace: cortex
data:
  default.conf: |
    server {
      listen 8080;

      location /api/v1/push {
        # Extract tenant from basic auth username
        auth_basic "Cortex";
        auth_basic_user_file /etc/nginx/auth/.htpasswd;

        # Set tenant ID header based on username
        proxy_set_header X-Scope-OrgID $remote_user;
        proxy_pass http://cortex-distributor:8080;
      }

      location /prometheus {
        auth_basic "Cortex";
        auth_basic_user_file /etc/nginx/auth/.htpasswd;

        proxy_set_header X-Scope-OrgID $remote_user;
        proxy_pass http://cortex-query-frontend:8080;
      }
    }
```

## Querying Tenant Data from Grafana

Configure separate Grafana data sources per tenant:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-datasources
  namespace: monitoring
data:
  cortex-datasources.yaml: |
    apiVersion: 1
    datasources:
    - name: Cortex-Production
      type: prometheus
      access: proxy
      url: http://cortex-query-frontend.cortex.svc.cluster.local:8080/prometheus
      jsonData:
        httpHeaderName1: X-Scope-OrgID
        timeInterval: 30s
      secureJsonData:
        httpHeaderValue1: tenant-prod

    - name: Cortex-Staging
      type: prometheus
      access: proxy
      url: http://cortex-query-frontend.cortex.svc.cluster.local:8080/prometheus
      jsonData:
        httpHeaderName1: X-Scope-OrgID
        timeInterval: 30s
      secureJsonData:
        httpHeaderValue1: tenant-staging
```

## Monitoring Multi-Tenant Metrics

Track per-tenant usage and limits:

```promql
# Ingestion rate per tenant
sum by (user) (rate(cortex_distributor_received_samples_total[5m]))

# Series count per tenant
cortex_ingester_memory_series{user="tenant-prod"}

# Active series per tenant
sum by (user) (cortex_ingester_active_series)

# Rejected samples per tenant
sum by (user, reason) (rate(cortex_discarded_samples_total[5m]))
```

Create alerts for tenant limit violations:

```yaml
groups:
- name: cortex_tenant_limits
  rules:
  - alert: TenantIngestRateExceeded
    expr: |
      sum by (user) (rate(cortex_discarded_samples_total{reason="ingestion_rate_limit"}[5m])) > 100
    labels:
      severity: warning
    annotations:
      summary: "Tenant {{ $labels.user }} exceeding ingestion rate"

  - alert: TenantSeriesLimitApproaching
    expr: |
      (
        sum by (user) (cortex_ingester_memory_series) /
        cortex_limits_overrides{limit_name="max_global_series_per_user"}
      ) > 0.8
    labels:
      severity: warning
    annotations:
      summary: "Tenant {{ $labels.user }} near series limit"
```

## Implementing Tenant Isolation

Ensure proper tenant isolation:

1. **Network policies** to restrict direct access to Cortex endpoints:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: cortex-tenant-isolation
  namespace: cortex
spec:
  podSelector:
    matchLabels:
      app: cortex
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: cortex
    - namespaceSelector:
        matchLabels:
          allowed: "true"
```

2. **Audit logging** for tenant access:

```yaml
server:
  log_level: info
  log_format: json

frontend:
  # Log all queries with tenant info
  log_queries_longer_than: -1s
```

## Tenant Cost Allocation

Track storage access and compute costs per tenant:

```promql
# Store-gateway data fetched per tenant
sum by (user) (cortex_bucket_store_series_data_fetched_total)

# Query volume per tenant
sum by (user) (rate(cortex_query_frontend_queries_total[1h]))

# Ingestion cost per tenant
sum by (user) (rate(cortex_distributor_received_samples_total[1h]))
```

Multi-tenant Cortex provides isolated, scalable metrics storage that shares infrastructure costs while maintaining strict tenant separation and customizable limits.
