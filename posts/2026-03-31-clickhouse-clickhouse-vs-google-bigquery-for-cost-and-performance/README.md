# ClickHouse vs Google BigQuery for Cost and Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, BigQuery, Google Cloud, Cost, Comparison, OLAP

Description: Compare ClickHouse and Google BigQuery on query performance, pricing model, data freshness, and operational complexity to choose the right fit for your workload.

---

## Overview

Google BigQuery is a fully managed serverless data warehouse, while ClickHouse is a high-performance OLAP database you deploy and manage yourself (or use via ClickHouse Cloud). The comparison often comes down to total cost of ownership, query latency, and operational preferences.

## Architecture

### BigQuery Architecture

- Serverless: no servers to manage
- Separation of storage (Colossus) and compute (Dremel)
- Pay-per-query (on-demand) or flat-rate slots
- Automatic scaling - no capacity planning
- Supports federated queries, external tables, and ML

### ClickHouse Architecture

- Server process(es) requiring deployment and maintenance
- Tightly coupled storage and compute (fast local NVMe)
- Fixed compute cost (servers or ClickHouse Cloud credit)
- Manual or auto-scaling depending on deployment
- Requires schema design and tuning

## Pricing Model

### BigQuery On-Demand

```text
Storage: $0.02/GB/month (active)
Queries: $6.25 per TiB scanned (first 1 TiB/month free)
```

Example cost for a 1 TiB scan:

```text
1 TiB * $6.25 = $6.25 per query
100 queries per day = $625/day = $18,750/month
```

### ClickHouse Self-Hosted

```text
Example: 3x c5.2xlarge AWS instances
= 3 * $0.34/hr * 730 hrs = ~$745/month
Storage: 3 TB NVMe * $0.10/GB/month = ~$300/month
Total: ~$1,045/month regardless of query volume
```

### ClickHouse Cloud

```text
Pay per resource-hour of compute + storage
Starting ~$0.02-0.06 per compute unit
Often 5-10x cheaper than BigQuery for high query volume
```

## Performance Comparison

### BigQuery Query (Standard SQL)

```sql
SELECT
    TIMESTAMP_TRUNC(ts, DAY) AS day,
    COUNT(*) AS events,
    COUNT(DISTINCT user_id) AS users
FROM `project.dataset.events`
WHERE ts >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
GROUP BY day
ORDER BY day;
```

BigQuery query startup overhead: 1-3 seconds for cold queries.

### ClickHouse Equivalent

```sql
SELECT
    toStartOfDay(ts) AS day,
    count() AS events,
    uniq(user_id) AS users
FROM events
WHERE ts >= now() - INTERVAL 30 DAY
GROUP BY day
ORDER BY day;
```

ClickHouse query latency: milliseconds to seconds with no startup overhead.

## Query Latency Characteristics

| Scenario | BigQuery | ClickHouse |
|---|---|---|
| Simple aggregation (1B rows) | 5-15 seconds | 0.5-3 seconds |
| Complex JOIN (100GB) | 15-60 seconds | 2-10 seconds |
| Cold start latency | 1-3 seconds | Milliseconds |
| Concurrent queries (100+) | Scales automatically | Requires tuning |

## Data Freshness

BigQuery supports streaming inserts but with higher latency:

```python
# BigQuery streaming insert
from google.cloud import bigquery
client = bigquery.Client()
errors = client.insert_rows_json('project.dataset.events', rows)
# Data available in seconds, but costs $0.01 per 200MB streamed
```

ClickHouse insert latency is much lower:

```sql
-- Data available immediately after insert completes
INSERT INTO events VALUES (...);
```

## Cost-Effective Scenarios

### BigQuery Wins When

- Infrequent large queries (< 10 TB/day scanned)
- No DevOps team to manage infrastructure
- Need for BigQuery ML, Data Studio, or GCP integration
- Unpredictable query patterns with high variance in usage

### ClickHouse Wins When

- High query volume (many queries against large tables daily)
- Predictable workloads where fixed costs are lower
- Sub-second query latency requirements
- High-frequency streaming ingestion
- Cost optimization is a priority

## Cost Estimation Comparison

```python
# Rough cost comparison script
bq_scanned_tib = 100  # TiB per day
bq_daily_cost = bq_scanned_tib * 6.25  # $6.25 per TiB

ch_instances = 3
ch_instance_cost_per_hour = 0.34  # c5.2xlarge
ch_daily_cost = ch_instances * ch_instance_cost_per_hour * 24

print(f"BigQuery: ${bq_daily_cost:.2f}/day = ${bq_daily_cost * 30:.2f}/month")
print(f"ClickHouse: ${ch_daily_cost:.2f}/day = ${ch_daily_cost * 30:.2f}/month")
```

```text
BigQuery: $625.00/day = $18750.00/month
ClickHouse: $24.48/day = $734.40/month
```

## Summary

BigQuery wins on operational simplicity - zero infrastructure management and pay-per-query pricing suits sporadic workloads. ClickHouse wins on query latency, high-volume cost efficiency, and streaming ingestion performance. For organizations running hundreds of queries per day against terabyte-scale tables, ClickHouse (self-hosted or Cloud) typically costs 5-20x less than BigQuery while delivering lower latency. BigQuery is preferred when DevOps resources are scarce or workloads are highly variable.
