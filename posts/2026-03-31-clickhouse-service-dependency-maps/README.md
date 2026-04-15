# How to Build Service Dependency Maps with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Service Dependency, Observability, Microservice, Topology

Description: Build dynamic service dependency maps from distributed trace data in ClickHouse to visualize inter-service call patterns and latency.

---

Service dependency maps show how microservices communicate, which services are the most critical, and where latency bottlenecks occur. By querying span data in ClickHouse you can generate accurate, up-to-date topology maps without manual configuration.

## Source: Spans Table

Assume the `otel_traces` table from the distributed tracing post exists. We derive edges from parent-child span relationships across services.

```sql
CREATE TABLE service_call_edges
(
    caller_service LowCardinality(String),
    callee_service LowCardinality(String),
    operation_name LowCardinality(String),
    call_time DateTime,
    duration_ms Float64,
    error UInt8 DEFAULT 0
)
ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(call_time)
ORDER BY (caller_service, callee_service, call_time);
```

## Populate Edges from Trace Spans

```sql
INSERT INTO service_call_edges
SELECT
    parent.service_name AS caller_service,
    child.service_name AS callee_service,
    child.span_name AS operation_name,
    toDateTime(intDiv(child.start_time_unix_nano, 1000000000)) AS call_time,
    child.duration_nano / 1e6 AS duration_ms,
    if(child.status_code = 2, 1, 0) AS error
FROM otel_traces child
JOIN otel_traces parent ON child.parent_span_id = parent.span_id
WHERE child.service_name != parent.service_name
  AND toDateTime(intDiv(child.start_time_unix_nano, 1000000000)) >= now() - INTERVAL 1 HOUR;
```

## Service Dependency Graph Edges with Traffic Volume

```sql
SELECT
    caller_service,
    callee_service,
    count() AS call_count,
    round(quantile(0.95)(duration_ms), 2) AS p95_ms,
    round(countIf(error = 1) * 100.0 / count(), 3) AS error_rate_pct
FROM service_call_edges
WHERE call_time >= now() - INTERVAL 1 HOUR
GROUP BY caller_service, callee_service
ORDER BY call_count DESC;
```

## Find Critical Services (High In-Degree)

```sql
SELECT
    callee_service,
    countDistinct(caller_service) AS upstream_dependencies,
    sum(call_count) AS total_calls,
    max(p95_ms) AS max_p95_ms
FROM (
    SELECT
        callee_service,
        caller_service,
        count() AS call_count,
        quantile(0.95)(duration_ms) AS p95_ms
    FROM service_call_edges
    WHERE call_time >= now() - INTERVAL 1 HOUR
    GROUP BY callee_service, caller_service
)
GROUP BY callee_service
ORDER BY upstream_dependencies DESC
LIMIT 10;
```

## Latency Heatmap Between Services

```sql
SELECT
    caller_service,
    callee_service,
    countIf(duration_ms < 10) AS lt_10ms,
    countIf(duration_ms >= 10 AND duration_ms < 100) AS ms_10_100,
    countIf(duration_ms >= 100 AND duration_ms <= 500) AS ms_100_500,
    countIf(duration_ms > 500) AS gt_500ms
FROM service_call_edges
WHERE call_time >= now() - INTERVAL 1 HOUR
GROUP BY caller_service, callee_service
ORDER BY caller_service, callee_service;
```

## Detect Circular Dependencies

```sql
SELECT
    a.caller_service,
    a.callee_service,
    b.callee_service AS back_to
FROM (
    SELECT DISTINCT caller_service, callee_service
    FROM service_call_edges
    WHERE call_time >= now() - INTERVAL 1 HOUR
) a
JOIN (
    SELECT DISTINCT caller_service, callee_service
    FROM service_call_edges
    WHERE call_time >= now() - INTERVAL 1 HOUR
) b ON a.callee_service = b.caller_service AND b.callee_service = a.caller_service;
```

## Summary

ClickHouse enables dynamic service dependency mapping by deriving edges from parent-child span relationships. Aggregating edges with call counts, latency percentiles, and error rates produces a weighted dependency graph that can feed visualization tools like Grafana or D3.js. Refreshing the graph every few minutes using materialized views keeps topology maps accurate without manual updates.
