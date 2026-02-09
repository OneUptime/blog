# How to Deploy Grafana Mimir for Multi-Tenant Prometheus Metrics Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, Mimir, Prometheus

Description: Deploy and configure Grafana Mimir for scalable multi-tenant Prometheus metrics storage with tenant isolation, rate limiting, and long-term retention capabilities.

---

Grafana Mimir is a horizontally scalable, highly available time series database designed for storing Prometheus metrics. It provides multi-tenancy out of the box, making it ideal for SaaS platforms, managed services, or organizations with strict isolation requirements.

This guide walks you through deploying Mimir in a production-ready configuration with multi-tenancy, showing you how to configure tenant isolation, rate limits, and query federation.

## Understanding Mimir's Multi-Tenancy Model

Mimir implements tenant isolation through organization IDs (org IDs or tenant IDs). Each write and read request must include an `X-Scope-OrgID` header that identifies the tenant. Mimir stores metrics from different tenants separately and enforces per-tenant resource limits.

This architecture allows you to run a single Mimir cluster that serves multiple independent customers or teams with complete data isolation and configurable resource quotas.

## Deploying Mimir with Docker Compose

Start with a simple multi-component Mimir deployment:

```yaml
# docker-compose.yml
version: '3.8'

services:
  mimir:
    image: grafana/mimir:latest
    command:
      - -config.file=/etc/mimir/config.yaml
      - -target=all
    ports:
      - "8080:8080"
      - "9009:9009"
    volumes:
      - ./mimir-config.yaml:/etc/mimir/config.yaml
      - mimir-data:/data
    environment:
      - JAEGER_AGENT_HOST=jaeger
      - JAEGER_AGENT_PORT=6831

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: mimir
      MINIO_ROOT_PASSWORD: supersecret
    volumes:
      - minio-data:/data

volumes:
  mimir-data:
  minio-data:
```

## Basic Mimir Multi-Tenant Configuration

Configure Mimir with multi-tenancy enabled:

```yaml
# mimir-config.yaml
multitenancy_enabled: true

server:
  http_listen_port: 8080
  grpc_listen_port: 9009
  log_level: info

distributor:
  ring:
    kvstore:
      store: memberlist

ingester:
  ring:
    kvstore:
      store: memberlist
    replication_factor: 1

store_gateway:
  sharding_ring:
    kvstore:
      store: memberlist

compactor:
  compaction_interval: 30m
  data_dir: /data/compactor
  sharding_ring:
    kvstore:
      store: memberlist

blocks_storage:
  backend: s3

  s3:
    endpoint: minio:9000
    access_key_id: mimir
    secret_access_key: supersecret
    insecure: true
    bucket_name: mimir-blocks

  tsdb:
    dir: /data/tsdb

  bucket_store:
    sync_dir: /data/bucket-store-sync

limits:
  # Default limits for all tenants
  ingestion_rate: 10000
  ingestion_burst_size: 200000
  max_global_series_per_user: 150000
  max_global_series_per_metric: 20000

memberlist:
  join_members:
    - mimir:7946
```

This configuration enables multi-tenancy and sets default rate limits.

## Configuring Prometheus to Write to Mimir

Configure Prometheus to remote write to Mimir with tenant ID:

```yaml
# prometheus.yml
remote_write:
  - url: http://mimir:8080/api/v1/push
    headers:
      X-Scope-OrgID: tenant-1
    queue_config:
      capacity: 10000
      max_shards: 10
      min_shards: 1
      max_samples_per_send: 5000
      batch_send_deadline: 5s
    metadata_config:
      send: true
      send_interval: 1m
```

Each Prometheus instance should write with a unique tenant ID to maintain isolation.

## Per-Tenant Configuration Overrides

Override limits for specific tenants:

```yaml
# mimir-config.yaml (continued)
limits:
  # Global defaults
  ingestion_rate: 10000
  max_global_series_per_user: 150000

# Per-tenant overrides
overrides:
  tenant-premium:
    ingestion_rate: 50000
    ingestion_burst_size: 500000
    max_global_series_per_user: 1000000
    max_global_series_per_metric: 50000
    max_query_parallelism: 32

  tenant-basic:
    ingestion_rate: 5000
    ingestion_burst_size: 100000
    max_global_series_per_user: 50000
    max_global_series_per_metric: 10000
    max_query_parallelism: 8

  tenant-enterprise:
    ingestion_rate: 100000
    ingestion_burst_size: 1000000
    max_global_series_per_user: 5000000
    max_query_length: 7d
    max_query_parallelism: 64
```

These overrides let you implement tiered service levels.

## Deploying Mimir on Kubernetes with Helm

Deploy a production-ready Mimir cluster on Kubernetes:

```bash
# Add Grafana Helm repository
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

# Create namespace
kubectl create namespace mimir

# Create values file for multi-tenant configuration
cat > mimir-values.yaml <<EOF
multitenancy_enabled: true

mimir:
  structuredConfig:
    multitenancy_enabled: true

    limits:
      ingestion_rate: 10000
      ingestion_burst_size: 200000
      max_global_series_per_user: 150000

    blocks_storage:
      backend: s3
      s3:
        endpoint: s3.amazonaws.com
        bucket_name: my-mimir-blocks
        region: us-east-1

ingester:
  replicas: 3
  resources:
    requests:
      cpu: 1
      memory: 4Gi
    limits:
      cpu: 2
      memory: 8Gi

distributor:
  replicas: 3
  resources:
    requests:
      cpu: 500m
      memory: 1Gi
    limits:
      cpu: 1
      memory: 2Gi

querier:
  replicas: 3
  resources:
    requests:
      cpu: 500m
      memory: 1Gi
    limits:
      cpu: 1
      memory: 2Gi

query_frontend:
  replicas: 2

store_gateway:
  replicas: 3
  persistentVolume:
    enabled: true
    size: 50Gi

compactor:
  replicas: 1
  persistentVolume:
    enabled: true
    size: 100Gi

ruler:
  enabled: true
  replicas: 2
EOF

# Install Mimir
helm install mimir grafana/mimir-distributed \
  -n mimir \
  -f mimir-values.yaml
```

## Querying Mimir with Tenant Context

Query Mimir data for a specific tenant:

```bash
# Query using curl with tenant header
curl -H "X-Scope-OrgID: tenant-1" \
  "http://mimir:8080/prometheus/api/v1/query?query=up"

# Query using Grafana data source
# Configure Prometheus data source with custom HTTP header:
# X-Scope-OrgID: tenant-1
```

Configure Grafana to query multiple tenants:

```yaml
apiVersion: 1
datasources:
  - name: Mimir Tenant 1
    type: prometheus
    access: proxy
    url: http://mimir:8080/prometheus
    jsonData:
      httpHeaderName1: X-Scope-OrgID
    secureJsonData:
      httpHeaderValue1: tenant-1

  - name: Mimir Tenant 2
    type: prometheus
    access: proxy
    url: http://mimir:8080/prometheus
    jsonData:
      httpHeaderName1: X-Scope-OrgID
    secureJsonData:
      httpHeaderValue1: tenant-2
```

## Implementing Tenant Authentication

Add authentication layer with a reverse proxy:

```nginx
# nginx.conf
http {
  upstream mimir_backend {
    server mimir:8080;
  }

  # Map of API keys to tenant IDs
  map $http_x_api_key $tenant_id {
    "api-key-tenant1" "tenant-1";
    "api-key-tenant2" "tenant-2";
    "api-key-premium" "tenant-premium";
    default "";
  }

  server {
    listen 80;

    location / {
      # Reject requests without valid API key
      if ($tenant_id = "") {
        return 401;
      }

      # Add tenant ID header
      proxy_set_header X-Scope-OrgID $tenant_id;

      # Remove API key before forwarding
      proxy_set_header X-Api-Key "";

      proxy_pass http://mimir_backend;
    }
  }
}
```

Clients authenticate with API keys that map to tenant IDs.

## Monitoring Per-Tenant Metrics

Query Mimir's internal metrics to monitor tenant usage:

```promql
# Ingestion rate per tenant
sum by (user) (rate(cortex_distributor_received_samples_total[5m]))

# Active series per tenant
sum by (user) (cortex_ingester_active_series)

# Query rate per tenant
sum by (user) (rate(cortex_query_frontend_queries_total[5m]))

# Storage used per tenant
sum by (user) (cortex_bucket_blocks_count)

# Queries rejected due to limits
sum by (user) (rate(cortex_discarded_samples_total[5m]))

# Query latency per tenant
histogram_quantile(0.99,
  sum by (user, le) (rate(cortex_query_frontend_query_duration_seconds_bucket[5m]))
)
```

Create dashboards showing per-tenant resource consumption.

## Configuring Tenant Query Limits

Prevent resource-intensive queries from one tenant affecting others:

```yaml
limits:
  # Query timeout
  query_timeout: 1m

  # Maximum time range for queries
  max_query_length: 30d

  # Maximum number of samples in query result
  max_samples_per_query: 100000000

  # Maximum number of series in query
  max_query_series: 100000

  # Maximum query parallelism
  max_query_parallelism: 16

  # Split queries by time interval
  split_queries_by_interval: 24h

overrides:
  tenant-premium:
    max_query_length: 90d
    max_samples_per_query: 500000000
    max_query_parallelism: 32
```

## Handling Tenant Data Retention

Configure different retention policies per tenant:

```yaml
limits:
  # Default retention
  compactor_blocks_retention_period: 30d

overrides:
  tenant-longterm:
    compactor_blocks_retention_period: 365d

  tenant-shortterm:
    compactor_blocks_retention_period: 7d

  tenant-premium:
    compactor_blocks_retention_period: 730d  # 2 years
```

The compactor automatically deletes blocks older than the retention period.

## Implementing Tenant Federation

Query across multiple tenants when authorized:

```bash
# Query multiple tenants by passing multiple tenant IDs
curl -H "X-Scope-OrgID: tenant-1|tenant-2|tenant-3" \
  "http://mimir:8080/prometheus/api/v1/query?query=sum(up)"
```

Control federation permissions:

```yaml
# mimir-config.yaml
tenant_federation:
  enabled: true

overrides:
  # Allow tenant-1 to query itself and tenant-2
  tenant-1:
    allowed_federation_tenants:
      - tenant-1
      - tenant-2

  # Admin tenant can query all tenants
  admin-tenant:
    allowed_federation_tenants:
      - "*"
```

## Cost Allocation and Billing

Track metrics for billing purposes:

```promql
# Total samples ingested per tenant per day
sum_over_time(
  (sum by (user) (cortex_distributor_received_samples_total))[1d:]
)

# Storage used per tenant (approximate)
sum by (user) (cortex_ingester_active_series) *
  avg(cortex_ingester_tsdb_head_chunks_created_total)

# Query cost per tenant
sum by (user) (
  rate(cortex_query_frontend_queries_total[1d]) *
  rate(cortex_querier_request_duration_seconds_sum[1d])
)
```

Export these metrics to your billing system.

## Security Best Practices

Secure your multi-tenant Mimir deployment:

```yaml
# Enable TLS
server:
  http_tls_config:
    cert_file: /certs/server.crt
    key_file: /certs/server.key
  grpc_tls_config:
    cert_file: /certs/server.crt
    key_file: /certs/server.key

# Enable authentication at ingester level
ingester:
  client_config:
    tls_enabled: true
    tls_cert_path: /certs/client.crt
    tls_key_path: /certs/client.key

# Encrypt data at rest in S3
blocks_storage:
  s3:
    sse:
      type: SSE-S3  # or SSE-KMS
```

Always use authentication between Prometheus and Mimir in production.

## Conclusion

Grafana Mimir provides enterprise-grade multi-tenant metrics storage that scales horizontally and maintains strict isolation between tenants. By configuring per-tenant limits, retention policies, and monitoring tenant usage, you can build a metrics platform that serves multiple customers or teams efficiently.

Start with the basic multi-tenant configuration, add per-tenant overrides as needed, and implement proper authentication and monitoring before going to production. Mimir's flexible configuration lets you adapt the platform to your specific multi-tenancy requirements.
