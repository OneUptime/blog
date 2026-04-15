# How to Use quantile() Function in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Aggregate Function, Quantile, Percentile

Description: Learn how to compute approximate percentiles in ClickHouse using quantile(), request multiple levels with quantiles(), and understand accuracy tradeoffs.

---

`quantile()` is a ClickHouse aggregate function that computes an approximate quantile (percentile) of a numeric column. It uses a reservoir sampling algorithm that provides fast, low-memory approximations suitable for large analytical datasets. Unlike exact ORDER BY / OFFSET approaches, `quantile()` does not require sorting all data, making it practical for real-time queries over billions of rows where p50, p90, or p99 latency metrics are needed.

## Syntax

```sql
quantile(level)(column)
```

`level` is a Float64 between 0 and 1 representing the desired quantile. For example, `0.5` is the median (p50), `0.9` is the 90th percentile (p90), and `0.99` is the 99th percentile (p99). The level is a compile-time constant, not a column value.

## Basic Examples

```sql
-- Median (p50) response time
SELECT quantile(0.5)(response_time_ms) AS p50
FROM api_requests
WHERE request_date = today() - 1;

-- 90th percentile
SELECT quantile(0.9)(response_time_ms) AS p90
FROM api_requests
WHERE request_date = today() - 1;

-- 99th percentile
SELECT quantile(0.99)(response_time_ms) AS p99
FROM api_requests
WHERE request_date = today() - 1;
```

## Multiple Quantiles in One Query

You can call `quantile()` multiple times with different levels in the same SELECT. When multiple calls share the same argument column, ClickHouse optimizes them into a single aggregation pass. For multiple levels on the same column, use `quantiles()` instead (covered in the companion post) for a more readable and idiomatic approach. The single-level form is best when you only need one percentile.

```sql
SELECT
    endpoint,
    count()                           AS requests,
    quantile(0.5)(response_time_ms)   AS p50,
    quantile(0.95)(response_time_ms)  AS p95,
    quantile(0.99)(response_time_ms)  AS p99
FROM api_requests
WHERE request_date >= today() - 7
GROUP BY endpoint
ORDER BY p99 DESC
LIMIT 20;
```

Note: Although ClickHouse optimizes multiple `quantile()` calls on the same column into a single pass, using `quantiles()` with multiple levels is the idiomatic and more readable approach for that case.

## Supported Data Types

`quantile()` works on numeric types and date/datetime types.

```sql
-- Quantile on a Date column - returns median date
SELECT quantile(0.5)(event_date) AS median_date
FROM user_signups;

-- Quantile on DateTime
SELECT quantile(0.99)(created_at) AS p99_timestamp
FROM orders
WHERE order_date = today() - 1;
```

## Grouped Percentiles

```sql
-- p99 latency broken down by service and region
SELECT
    service_name,
    region,
    quantile(0.99)(latency_ms) AS p99_latency
FROM service_traces
WHERE trace_date >= today() - 1
GROUP BY service_name, region
ORDER BY p99_latency DESC;
```

## Accuracy and Algorithm

By default, `quantile()` uses reservoir sampling with a sample size of 8192. For most workloads the error is less than 1% relative to the true quantile. For higher accuracy or different memory/accuracy tradeoffs, ClickHouse offers specialized variants.

```sql
-- Exact quantile (sorts all values - use only on small datasets)
SELECT quantileExact(0.99)(response_time_ms) AS exact_p99
FROM api_requests
WHERE request_date = today();

-- Deterministic sampling (same result across runs)
SELECT quantileDeterministic(0.99)(response_time_ms, user_id) AS det_p99
FROM api_requests
WHERE request_date = today();

-- t-digest algorithm (better tail accuracy)
SELECT quantileTDigest(0.99)(response_time_ms) AS tdigest_p99
FROM api_requests
WHERE request_date = today();
```

## SLO Monitoring Example

```sql
-- Compute p50, p95, p99 per endpoint and flag SLO breaches
SELECT
    endpoint,
    quantile(0.50)(latency_ms)  AS p50,
    quantile(0.95)(latency_ms)  AS p95,
    quantile(0.99)(latency_ms)  AS p99,
    quantile(0.99)(latency_ms) > 500 AS breaches_slo
FROM api_requests
WHERE request_time >= now() - INTERVAL 1 HOUR
GROUP BY endpoint
HAVING p99 > 200
ORDER BY p99 DESC;
```

## Filtering Before Aggregation

Always push filters into WHERE before quantile aggregation. Because `quantile()` uses sampling, reducing the input set also reduces sampling variance.

```sql
-- Filter to successful requests only before computing latency percentiles
SELECT
    service_name,
    quantile(0.99)(latency_ms) AS p99_success_latency
FROM api_requests
WHERE status_code BETWEEN 200 AND 299
  AND request_date = today() - 1
GROUP BY service_name;
```

## Summary

`quantile(level)(col)` provides fast, approximate percentile computation suitable for real-time SLO monitoring, latency analysis, and distribution exploration at massive scale. For a single percentile level it is simple and efficient; when you need many levels on the same column, prefer `quantiles()` to compute them in one pass. Use `quantileExact()` only for small datasets where exactness is required and the full sort cost is acceptable.
