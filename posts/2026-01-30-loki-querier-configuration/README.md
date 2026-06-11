# How to Implement Loki Querier Configuration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Loki, Observability, Queries, Performance

Description: A comprehensive guide to configuring the Loki querier component for optimal query execution, parallelism, and multi-tenant environments.

---

## Introduction

The Loki querier is a critical component in the Grafana Loki stack responsible for handling LogQL queries. It reads log data from both ingesters (for recent data) and long-term storage (for historical data), then merges and deduplicates results before returning them to the client.

Proper configuration of the querier is essential for achieving optimal query performance, especially in high-volume, multi-tenant environments. This guide covers the key configuration options and best practices for tuning your Loki querier.

## Query Execution Flow

Before diving into configuration, let us understand how queries flow through the Loki querier component.

```mermaid
flowchart TD
    A[Client Query Request] --> B[Query Frontend]
    B --> C[Query Scheduler]
    C --> D[Querier]
    D --> E{Data Location?}
    E -->|Recent Data| F[Ingesters]
    E -->|Historical Data| G[Object Storage]
    F --> H[Merge & Deduplicate]
    G --> H
    H --> I[Apply Limits & Filters]
    I --> J[Return Results to Client]

    subgraph Querier Component
        D
        E
        H
        I
    end
```

## Core Querier Configuration

The querier section in your Loki configuration file controls how queries are executed. Here is a comprehensive configuration example with detailed comments.

### Basic Querier Settings

```yaml
# loki-config.yaml

querier:
  # Maximum duration for which the live tailing requests are served
  # Increase this for long-running tail queries
  tail_max_duration: 1h

  # Time to wait before sending a batch of log lines to the client
  # Lower values provide more real-time updates but increase network overhead
  extra_query_delay: 0s

  # Maximum number of concurrent queries that can be processed
  # This is a key setting for controlling resource usage
  max_concurrent: 10

  # Engine configuration for query processing
  engine:
    # Maximum amount of time to look back for log lines in instant log queries
    max_look_back_period: 720h  # 30 days

limits_config:
  # Maximum time a query can spend querying backends before timing out
  query_timeout: 5m
```

### Parallelism and Concurrency Configuration

Controlling parallelism is crucial for balancing query performance with cluster stability.

```yaml
querier:
  # Maximum number of queries that can be simultaneously processed by the querier
  max_concurrent: 20

# Query parallelism settings in the query_range section
query_range:
  # Enable parallelization of shardable queries
  parallelise_shardable_queries: true

limits_config:
  # Maximum number of queries that will be scheduled in parallel by the frontend
  max_query_parallelism: 32

# Frontend worker configuration
frontend_worker:
  # Address of the query frontend
  frontend_address: "query-frontend:9095"

  # Or use the query scheduler address instead of frontend_address
  # scheduler_address: "query-scheduler:9095"

  # How often to resolve the query-frontend or query-scheduler address
  dns_lookup_duration: 3s

  # gRPC client configuration
  grpc_client_config:
    max_recv_msg_size: 104857600  # 100MB
    max_send_msg_size: 104857600  # 100MB
```

### Query Timeout and Performance Limits

Configure timeouts to prevent runaway queries from consuming excessive resources.

```yaml
# Limits configuration for query boundaries
limits_config:
  # Limit how far back in time data can be queried
  max_query_lookback: 720h

  # Maximum time range for a single query
  max_query_length: 721h

  # Maximum number of unique streams that can be queried
  max_query_series: 500

  # Maximum number of log entries to return
  max_entries_limit_per_query: 10000

  # Query timeout at the limits level
  query_timeout: 5m

  # Maximum number of bytes a query can process
  max_query_bytes_read: 10GB

  # Maximum number of chunks that can be fetched
  max_chunks_per_query: 2000000

  # Split queries by time interval for better distribution
  split_queries_by_interval: 30m
```

## Multi-Tenant Querier Configuration

In multi-tenant deployments, you need to configure per-tenant limits and isolation.

### Per-Tenant Overrides

```yaml
# Enable multi-tenancy
auth_enabled: true

# Default limits for all tenants
limits_config:
  max_query_parallelism: 32
  max_query_series: 500
  max_entries_limit_per_query: 5000
  query_timeout: 2m

# Load per-tenant overrides from runtime configuration
runtime_config:
  file: /etc/loki/runtime-config.yaml
  period: 10s

# Contents of /etc/loki/runtime-config.yaml
overrides:
  # High-priority tenant with relaxed limits
  tenant_premium:
    max_query_parallelism: 64
    max_query_series: 2000
    max_entries_limit_per_query: 50000
    query_timeout: 10m
    max_query_bytes_read: 50GB

  # Standard tenant with default limits
  tenant_standard:
    max_query_parallelism: 16
    max_query_series: 200
    max_entries_limit_per_query: 2000
    query_timeout: 1m

  # Development tenant with restricted limits
  tenant_dev:
    max_query_parallelism: 4
    max_query_series: 50
    max_entries_limit_per_query: 500
    query_timeout: 30s
```

### Runtime Configuration for Dynamic Overrides

```yaml
# Enable runtime configuration for dynamic updates
runtime_config:
  # Path to the runtime configuration file
  file: /etc/loki/runtime-config.yaml

  # How often to check for configuration changes
  period: 10s

# Contents of runtime-config.yaml
# This file can be updated without restarting Loki
overrides:
  tenant_a:
    max_query_parallelism: 48
    ingestion_rate_mb: 10
  tenant_b:
    max_query_parallelism: 24
    ingestion_rate_mb: 5
```

## Query Scheduling Architecture

Understanding the query scheduling flow helps in optimizing your configuration.

```mermaid
flowchart LR
    subgraph Clients
        C1[Grafana]
        C2[LogCLI]
        C3[API Client]
    end

    subgraph Query Path
        QF[Query Frontend]
        QS[Query Scheduler]
        Q1[Querier 1]
        Q2[Querier 2]
        Q3[Querier 3]
    end

    subgraph Data Sources
        I1[Ingester 1]
        I2[Ingester 2]
        S3[(Object Storage)]
    end

    C1 --> QF
    C2 --> QF
    C3 --> QF
    QF --> QS
    QS --> Q1
    QS --> Q2
    QS --> Q3
    Q1 --> I1
    Q1 --> I2
    Q1 --> S3
    Q2 --> I1
    Q2 --> I2
    Q2 --> S3
    Q3 --> I1
    Q3 --> I2
    Q3 --> S3
```

## Query Frontend Configuration

The query frontend works closely with the querier to optimize query execution.

```yaml
query_range:
  # Maximum number of retries for failed queries
  max_retries: 5

frontend:
  # Compression for responses
  compress_responses: true

  # Log queries that are slower than this threshold
  log_queries_longer_than: 10s

  # Maximum number of outstanding requests per tenant per frontend
  max_outstanding_per_tenant: 2048

# Query scheduling configuration
query_scheduler:
  # Maximum number of outstanding requests per tenant per query-scheduler
  max_outstanding_requests_per_tenant: 2048

  # How long to keep a disconnected querier in a tenant shard
  querier_forget_delay: 2m

  # gRPC client configuration used to report errors back to the query frontend
  grpc_client_config:
    max_recv_msg_size: 104857600
    max_send_msg_size: 104857600
```

## Caching Configuration for Query Performance

Proper caching can dramatically improve query performance.

```yaml
query_range:
  # Enable result caching
  cache_results: true

  # Cache configuration
  results_cache:
    cache:
      # Use embedded cache for small deployments
      embedded_cache:
        enabled: true
        max_size_mb: 500
        ttl: 1h

      # Or use Redis for distributed caching
      # redis:
      #   endpoint: redis:6379
      #   timeout: 500ms
      #   expiration: 1h

# Index query cache configuration
storage_config:
  index_queries_cache_config:
    embedded_cache:
      enabled: true
      max_size_mb: 1000
      ttl: 24h

# Chunk cache for frequently accessed data
chunk_store_config:
  chunk_cache_config:
    embedded_cache:
      enabled: true
      max_size_mb: 2000
      ttl: 1h
```

## Complete Production Configuration Example

Here is a complete querier configuration suitable for production environments.

```yaml
# Production Loki Querier Configuration
auth_enabled: true

server:
  http_listen_port: 3100
  grpc_listen_port: 9095
  grpc_server_max_recv_msg_size: 104857600
  grpc_server_max_send_msg_size: 104857600

querier:
  max_concurrent: 20
  tail_max_duration: 1h
  extra_query_delay: 0s

  engine:
    max_look_back_period: 720h

query_range:
  parallelise_shardable_queries: true
  cache_results: true
  results_cache:
    cache:
      embedded_cache:
        enabled: true
        max_size_mb: 500
        ttl: 1h

query_scheduler:
  max_outstanding_requests_per_tenant: 2048
  querier_forget_delay: 2m

frontend_worker:
  frontend_address: "query-frontend:9095"
  dns_lookup_duration: 3s
  grpc_client_config:
    max_recv_msg_size: 104857600
    max_send_msg_size: 104857600

limits_config:
  max_query_length: 721h
  max_query_series: 500
  max_entries_limit_per_query: 10000
  query_timeout: 5m
  max_query_bytes_read: 10GB
  max_chunks_per_query: 2000000
  split_queries_by_interval: 30m
  max_query_parallelism: 32

  # Per-stream rate limits
  per_stream_rate_limit: 3MB
  per_stream_rate_limit_burst: 15MB

# Runtime configuration for dynamic updates
runtime_config:
  file: /etc/loki/runtime-config.yaml
  period: 10s
```

## Performance Tuning Tips

### 1. Optimize Query Parallelism

Adjust `max_query_parallelism` based on your cluster size and query patterns.

```yaml
# For clusters with 10+ queriers
limits_config:
  max_query_parallelism: 64
  split_queries_by_interval: 15m

# For smaller clusters (3-5 queriers)
limits_config:
  max_query_parallelism: 16
  split_queries_by_interval: 1h
```

### 2. Configure Appropriate Timeouts

Set timeouts that match your query complexity and data volume.

```yaml
# For dashboards with simple queries
limits_config:
  query_timeout: 1m

# For ad-hoc exploration with complex queries
limits_config:
  query_timeout: 10m
```

### 3. Memory Management

Control memory usage with chunk and series limits.

```yaml
limits_config:
  # Limit chunks to prevent OOM
  max_chunks_per_query: 1000000

  # Limit concurrent streams
  max_query_series: 1000

  # Limit result size
  max_entries_limit_per_query: 5000
```

## Monitoring Querier Performance

Use these LogQL queries to monitor your querier performance.

```logql
# Query latency distribution
histogram_quantile(0.99,
  sum(rate(loki_request_duration_seconds_bucket{route=~"api_prom_query.*"}[5m])) by (le)
)

# Failed queries rate
sum(rate(loki_request_duration_seconds_count{route=~"api_prom_query.*", status_code!="200"}[5m]))

# Queries per tenant
sum(rate(loki_request_duration_seconds_count{route=~"api_prom_query.*"}[5m])) by (tenant)
```

## Conclusion

Configuring the Loki querier correctly is essential for maintaining a responsive and stable logging infrastructure. Key takeaways include:

1. Set appropriate parallelism limits based on your cluster capacity
2. Configure timeouts that balance user experience with resource protection
3. Use per-tenant overrides in multi-tenant environments
4. Enable caching to improve query performance
5. Monitor querier metrics to identify bottlenecks

By following these configuration patterns and best practices, you can ensure your Loki deployment handles query workloads efficiently while maintaining stability under load.

## References

- [Grafana Loki Documentation](https://grafana.com/docs/loki/latest/)
- [Loki Configuration Reference](https://grafana.com/docs/loki/latest/configuration/)
- [LogQL Query Language](https://grafana.com/docs/loki/latest/logql/)
