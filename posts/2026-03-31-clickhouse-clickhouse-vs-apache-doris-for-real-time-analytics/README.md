# ClickHouse vs Apache Doris for Real-Time Analytics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Apache Doris, Comparison, Real-Time Analytics, OLAP, Performance

Description: Compare ClickHouse and Apache Doris for real-time analytics workloads, covering query performance, data ingestion, upserts, and operational complexity.

---

ClickHouse and Apache Doris are both open-source OLAP databases designed for fast analytical queries. They share many features but have meaningful differences in data model flexibility, upsert support, and operational requirements.

## Architecture Overview

**ClickHouse** uses a custom MergeTree storage engine with a single-binary deployment model. It is optimized for append-heavy workloads and high-throughput scans.

**Apache Doris** is based on the Google Mesa and Apache Impala lineage (originally developed at Baidu as Palo) with a MySQL-compatible wire protocol. It uses a Frontend (FE) and Backend (BE) node model, similar to traditional MPP systems.

## Query Performance

Both systems deliver sub-second queries on billions of rows. Key differences:

| Scenario | ClickHouse | Apache Doris |
|---------|------------|--------------|
| Simple aggregation | Extremely fast | Fast |
| Complex multi-table joins | Good | Good (MPP optimizer) |
| Full-text search | Limited | Limited |
| Approximate aggregations | uniq(), quantile() | APPROX_COUNT_DISTINCT() |

ClickHouse sample query:

```sql
SELECT
    toStartOfHour(created_at) AS hour,
    page,
    count() AS views,
    uniq(user_id) AS unique_users,
    quantile(0.95)(duration_ms) AS p95
FROM analytics.page_views
WHERE created_at >= now() - INTERVAL 24 HOUR
GROUP BY hour, page
ORDER BY hour, views DESC
LIMIT 50;
```

Doris equivalent (MySQL-compatible syntax):

```sql
SELECT
    DATE_FORMAT(created_at, '%Y-%m-%d %H:00:00') AS hour,
    page,
    COUNT(*) AS views,
    APPROX_COUNT_DISTINCT(user_id) AS unique_users,
    PERCENTILE_APPROX(duration_ms, 0.95) AS p95
FROM analytics.page_views
WHERE created_at >= NOW() - INTERVAL 24 HOUR
GROUP BY hour, page
ORDER BY hour, views DESC
LIMIT 50;
```

## Upsert and Update Support

**Apache Doris** has strong upsert support via its Unique Key Model:

```sql
CREATE TABLE users (
    user_id BIGINT,
    email VARCHAR(255),
    updated_at DATETIME
)
UNIQUE KEY(user_id)
DISTRIBUTED BY HASH(user_id) BUCKETS 32;
```

**ClickHouse** handles upserts via ReplacingMergeTree (eventual consistency):

```sql
CREATE TABLE users (
    user_id UInt64,
    email String,
    updated_at DateTime
)
ENGINE = ReplacingMergeTree(updated_at)
ORDER BY user_id;
```

Read with deduplication:

```sql
SELECT user_id, email FROM users FINAL;
```

Doris wins for mutable data; ClickHouse wins for immutable append workloads.

## Data Ingestion

**ClickHouse** supports:
- INSERT statements (batched)
- Kafka Engine (streaming)
- S3 / object storage
- HTTP interface for streaming JSON

**Doris** supports:
- Stream Load (HTTP push)
- Broker Load (S3, HDFS)
- Routine Load (Kafka)
- MySQL INSERT syntax

Both handle real-time ingestion well. ClickHouse's Kafka Engine is simpler to configure; Doris's Stream Load has lower per-row overhead at high rates.

## Operational Complexity

| Aspect | ClickHouse | Apache Doris |
|--------|------------|--------------|
| Deployment | Single binary | FE + BE nodes |
| Replication | Built-in ClickHouse Keeper | Built-in Bdbje |
| Kubernetes | Simple (1 container type) | More complex (2 node types) |
| Community | Very large | Growing |
| Documentation | Excellent | Good |

## When to Choose Each

**Choose ClickHouse when:**
- Workload is primarily append-only events
- You need the fastest possible scan throughput
- Single-node or simple cluster deployment
- Integration with Kafka, S3, dbt is required

**Choose Apache Doris when:**
- You need strong upsert/update support
- MySQL compatibility is important for existing tools
- You want a more relational model with better JOIN optimization
- Your team already operates MPP-style systems

## Summary

ClickHouse and Apache Doris are both capable real-time analytics engines. ClickHouse excels at append-heavy event analytics with the highest raw scan throughput. Doris offers stronger upsert semantics and MySQL compatibility, making it easier to integrate with tools that expect a transactional-like interface. For pure analytics workloads, ClickHouse typically wins on performance and operational simplicity.
