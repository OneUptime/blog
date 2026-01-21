# How to Implement Multi-Tenancy in Loki

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana Loki, Multi-Tenancy, Tenant Isolation, Security, Organization, Enterprise

Description: A comprehensive guide to implementing multi-tenancy in Grafana Loki, covering tenant configuration, isolation strategies, per-tenant limits, and production deployment patterns.

---

Multi-tenancy in Loki allows you to serve multiple teams, applications, or customers from a single Loki deployment while maintaining data isolation. This guide covers how to configure, secure, and manage multi-tenant Loki deployments effectively.

## Prerequisites

Before starting, ensure you have:

- Grafana Loki deployment
- Reverse proxy or API gateway (optional but recommended)
- Understanding of Loki's architecture
- Basic knowledge of HTTP headers and authentication

## Understanding Loki Multi-Tenancy

Loki uses the `X-Scope-OrgID` header to identify tenants:

```
Client -> X-Scope-OrgID: tenant-a -> Loki -> Tenant A Data
Client -> X-Scope-OrgID: tenant-b -> Loki -> Tenant B Data
```

## Enabling Multi-Tenancy

### Basic Configuration

```yaml
auth_enabled: true

server:
  http_listen_port: 3100
  grpc_listen_port: 9095

common:
  path_prefix: /loki
  replication_factor: 1

# Multi-tenant paths
storage_config:
  boltdb_shipper:
    active_index_directory: /loki/index
    cache_location: /loki/cache
    shared_store: s3

schema_config:
  configs:
    - from: 2024-01-01
      store: tsdb
      object_store: s3
      schema: v13
      index:
        prefix: loki_index_
        period: 24h
```

### Complete Multi-Tenant Configuration

```yaml
auth_enabled: true

server:
  http_listen_port: 3100
  grpc_listen_port: 9095
  log_level: info

common:
  path_prefix: /loki
  replication_factor: 3
  ring:
    kvstore:
      store: memberlist

limits_config:
  # Global defaults
  ingestion_rate_mb: 16
  ingestion_burst_size_mb: 24
  max_streams_per_user: 10000
  max_line_size: 256kb
  max_entries_limit_per_query: 5000
  max_query_parallelism: 16
  reject_old_samples: true
  reject_old_samples_max_age: 168h

# Per-tenant overrides
overrides:
  tenant-a:
    ingestion_rate_mb: 32
    ingestion_burst_size_mb: 48
    max_streams_per_user: 50000
    retention_period: 2160h  # 90 days

  tenant-b:
    ingestion_rate_mb: 8
    ingestion_burst_size_mb: 12
    max_streams_per_user: 5000
    retention_period: 720h  # 30 days

  tenant-premium:
    ingestion_rate_mb: 64
    ingestion_burst_size_mb: 128
    max_streams_per_user: 100000
    max_query_parallelism: 32
    retention_period: 8760h  # 365 days
```

## Per-Tenant Limits

### Rate Limiting

```yaml
limits_config:
  # Ingestion limits
  ingestion_rate_mb: 16
  ingestion_burst_size_mb: 24
  per_stream_rate_limit: 3MB
  per_stream_rate_limit_burst: 15MB

  # Query limits
  max_query_parallelism: 16
  max_query_series: 500
  max_entries_limit_per_query: 5000
  max_query_length: 721h

  # Stream limits
  max_streams_per_user: 10000
  max_global_streams_per_user: 50000
  max_label_name_length: 1024
  max_label_value_length: 2048
  max_label_names_per_series: 30
```

### Per-Tenant Override Examples

```yaml
overrides:
  # Development team - limited resources
  development:
    ingestion_rate_mb: 4
    max_streams_per_user: 1000
    max_entries_limit_per_query: 1000
    retention_period: 168h  # 7 days

  # Production - standard resources
  production:
    ingestion_rate_mb: 32
    max_streams_per_user: 20000
    max_entries_limit_per_query: 5000
    retention_period: 720h  # 30 days

  # Security - extended retention
  security:
    ingestion_rate_mb: 16
    max_streams_per_user: 10000
    retention_period: 8760h  # 365 days

  # Analytics - high query parallelism
  analytics:
    ingestion_rate_mb: 64
    max_query_parallelism: 64
    max_entries_limit_per_query: 50000
    max_query_series: 2000
```

## Tenant Authentication

### NGINX Reverse Proxy

```nginx
upstream loki {
    server loki-gateway:3100;
}

server {
    listen 80;
    server_name loki.example.com;

    # Extract tenant from URL path
    location ~ ^/api/v1/(?<tenant>[^/]+)/(.*)$ {
        proxy_pass http://loki/loki/api/v1/$2;
        proxy_set_header X-Scope-OrgID $tenant;
        proxy_set_header Host $host;
    }

    # Basic auth with tenant mapping
    location /loki {
        auth_basic "Loki";
        auth_basic_user_file /etc/nginx/.htpasswd;

        # Map authenticated user to tenant
        set $tenant $remote_user;
        proxy_pass http://loki;
        proxy_set_header X-Scope-OrgID $tenant;
    }
}
```

### OAuth Proxy Integration

```yaml
# oauth2-proxy configuration
apiVersion: apps/v1
kind: Deployment
metadata:
  name: oauth2-proxy
spec:
  template:
    spec:
      containers:
        - name: oauth2-proxy
          image: quay.io/oauth2-proxy/oauth2-proxy:latest
          args:
            - --provider=oidc
            - --oidc-issuer-url=https://auth.example.com
            - --client-id=loki
            - --client-secret-file=/secrets/client-secret
            - --cookie-secret-file=/secrets/cookie-secret
            - --email-domain=*
            - --upstream=http://loki-gateway:3100
            - --pass-user-headers=true
            - --set-xauthrequest=true
            - --pass-authorization-header=true
```

### API Gateway (Kong)

```yaml
plugins:
  - name: request-transformer
    config:
      add:
        headers:
          - "X-Scope-OrgID:$(headers.x-tenant-id)"

  - name: jwt
    config:
      claims_to_verify:
        - exp

routes:
  - name: loki
    paths:
      - /loki
    methods:
      - GET
      - POST
    service: loki-service
```

## Promtail Multi-Tenant Configuration

### Single Promtail to Multiple Tenants

```yaml
server:
  http_listen_port: 9080

clients:
  - url: http://loki:3100/loki/api/v1/push
    tenant_id: default

scrape_configs:
  - job_name: production
    static_configs:
      - targets: [localhost]
        labels:
          job: production
          __path__: /var/log/production/*.log
    pipeline_stages:
      - tenant:
          value: production

  - job_name: staging
    static_configs:
      - targets: [localhost]
        labels:
          job: staging
          __path__: /var/log/staging/*.log
    pipeline_stages:
      - tenant:
          value: staging
```

### Dynamic Tenant from Labels

```yaml
scrape_configs:
  - job_name: kubernetes
    kubernetes_sd_configs:
      - role: pod
    pipeline_stages:
      - tenant:
          source: namespace
    relabel_configs:
      - source_labels: [__meta_kubernetes_namespace]
        target_label: namespace
```

### Tenant from Log Content

```yaml
pipeline_stages:
  - json:
      expressions:
        tenant: tenant_id
  - tenant:
      source: tenant
```

## Grafana Multi-Tenant Configuration

### Per-Tenant Data Sources

```yaml
apiVersion: 1

datasources:
  - name: Loki-Production
    type: loki
    access: proxy
    url: http://loki-gateway:3100
    jsonData:
      httpHeaderName1: X-Scope-OrgID
    secureJsonData:
      httpHeaderValue1: production

  - name: Loki-Staging
    type: loki
    access: proxy
    url: http://loki-gateway:3100
    jsonData:
      httpHeaderName1: X-Scope-OrgID
    secureJsonData:
      httpHeaderValue1: staging

  - name: Loki-Development
    type: loki
    access: proxy
    url: http://loki-gateway:3100
    jsonData:
      httpHeaderName1: X-Scope-OrgID
    secureJsonData:
      httpHeaderValue1: development
```

### Using Grafana Organizations

Map Grafana organizations to Loki tenants:

```yaml
apiVersion: 1

datasources:
  - name: Loki
    type: loki
    access: proxy
    url: http://loki-gateway:3100
    orgId: 1  # Grafana Organization ID
    jsonData:
      httpHeaderName1: X-Scope-OrgID
    secureJsonData:
      httpHeaderValue1: tenant-a

  - name: Loki
    type: loki
    access: proxy
    url: http://loki-gateway:3100
    orgId: 2  # Different Grafana Organization
    jsonData:
      httpHeaderName1: X-Scope-OrgID
    secureJsonData:
      httpHeaderValue1: tenant-b
```

## Monitoring Multi-Tenant Deployments

### Per-Tenant Metrics

```promql
# Ingestion rate per tenant
sum by (tenant) (rate(loki_distributor_bytes_received_total[5m]))

# Query rate per tenant
sum by (tenant) (rate(loki_request_duration_seconds_count{route=~"/loki/api/v1/query.*"}[5m]))

# Active streams per tenant
sum by (tenant) (loki_ingester_memory_streams)

# Rate limiting events per tenant
sum by (tenant) (rate(loki_distributor_lines_dropped_total[5m]))
```

### Per-Tenant Alerting

```yaml
groups:
  - name: multi-tenant-alerts
    rules:
      - alert: TenantRateLimited
        expr: |
          sum by (tenant) (rate(loki_distributor_lines_dropped_total[5m])) > 0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Tenant {{ $labels.tenant }} is being rate limited"

      - alert: TenantHighIngestion
        expr: |
          sum by (tenant) (rate(loki_distributor_bytes_received_total[5m])) > 50000000
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Tenant {{ $labels.tenant }} has high ingestion rate"

      - alert: TenantNoLogs
        expr: |
          absent(sum by (tenant) (rate(loki_distributor_lines_received_total[5m]))) == 1
        for: 30m
        labels:
          severity: warning
        annotations:
          summary: "No logs from tenant {{ $labels.tenant }}"
```

## Best Practices

### Tenant Naming

```yaml
# Good tenant names
- production
- staging
- team-backend
- customer-acme
- org-12345

# Avoid
- prod (too short, ambiguous)
- tenant_1 (not descriptive)
- Tenant-A (inconsistent casing)
```

### Isolation Considerations

1. **Data Isolation**: Tenants cannot query each other's data
2. **Resource Isolation**: Per-tenant limits prevent noisy neighbors
3. **Cost Allocation**: Monitor per-tenant usage for chargebacks

### Security Recommendations

1. Validate tenant ID at ingress
2. Use authentication proxy
3. Audit tenant access
4. Implement tenant allowlists
5. Encrypt data at rest

## Conclusion

Multi-tenancy in Loki enables efficient resource sharing while maintaining isolation. Key takeaways:

- Enable `auth_enabled: true` for multi-tenancy
- Use `X-Scope-OrgID` header for tenant identification
- Configure per-tenant limits and overrides
- Implement proper authentication at the gateway
- Monitor per-tenant metrics for capacity planning
- Consider compliance and isolation requirements

With proper multi-tenancy configuration, you can serve multiple teams or customers from a single Loki deployment efficiently and securely.
