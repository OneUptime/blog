# How to Profile ClickHouse Queries with Flamegraphs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Flamegraph, Query Profiling, Performance, Sampling Profiler

Description: Learn how to profile ClickHouse queries using the built-in sampling profiler and generate flamegraphs to identify CPU hotspots in slow queries.

---

## ClickHouse's Built-In Sampling Profiler

ClickHouse includes a CPU sampling profiler that captures stack traces during query execution. You can visualize these traces as flamegraphs to understand where CPU time is spent - in parsing, aggregation, decompression, or I/O.

## Enabling Query Profiling

Set the profiling interval before running a query:

```sql
SET query_profiler_cpu_time_period_ns = 1000000;  -- sample every 1ms
SET query_profiler_real_time_period_ns = 1000000;
SET log_queries = 1;
SET log_query_threads = 1;
SET allow_introspection_functions = 1;  -- required for demangle() and addressToSymbol()
```

## Running a Query to Profile

```sql
SELECT
    region,
    toStartOfMonth(event_time) AS month,
    uniq(user_id) AS unique_users,
    sum(amount) AS revenue
FROM large_events
WHERE event_time >= now() - INTERVAL 90 DAY
GROUP BY region, month
ORDER BY month, revenue DESC;
```

## Extracting Stack Traces

After the query runs, extract the trace data:

```sql
SELECT
    trace_type,
    arrayStringConcat(arrayMap(x -> demangle(addressToSymbol(x)), trace), '\n') AS trace
FROM system.trace_log
WHERE query_id = (
    SELECT query_id FROM system.query_log
    WHERE type = 'QueryFinish'
    ORDER BY event_time DESC LIMIT 1
)
ORDER BY trace_type;
```

## Generating a Flamegraph

Export stack traces in a format that `flamegraph.pl` understands:

```sql
SELECT
    arrayStringConcat(
        arrayMap(x -> demangle(addressToSymbol(x)), trace),
        ';'
    ) AS stack,
    count() AS samples
FROM system.trace_log
WHERE query_id = 'your-query-id'
  AND trace_type = 'CPU'
GROUP BY stack
ORDER BY samples DESC
INTO OUTFILE '/tmp/stacks.txt'
FORMAT TabSeparated;
```

Then generate the flamegraph:

```bash
# Install flamegraph tools
git clone https://github.com/brendangregg/FlameGraph.git

# Generate (convert tab-separated output to space-separated for flamegraph.pl)
cat /tmp/stacks.txt | \
    tr '\t' ' ' | \
    ./FlameGraph/flamegraph.pl > /tmp/query_flame.svg

# Open in browser
open /tmp/query_flame.svg
```

## Using clickhouse-flamegraph

For a more streamlined workflow, the community tool [`clickhouse-flamegraph`](https://github.com/Slach/clickhouse-flamegraph) can generate flamegraphs directly from `system.trace_log` without manual SQL exports:

```bash
# Install
go install github.com/Slach/clickhouse-flamegraph@latest

# Generate flamegraph for the most recent query
clickhouse-flamegraph --query-id='your-query-id'
```

## Analyzing Common Flamegraph Patterns

```text
Wide base in "MergeSort":        - Sort operation is bottleneck, consider removing ORDER BY
Wide base in "LZ4Decompress":    - Too much data scanned, improve index selectivity
Wide base in "Aggregator":       - High cardinality GROUP BY, consider pre-aggregation
Wide base in "HashJoin":         - Large join, use IN or optimize join key
```

## Comparing Flamegraphs Before and After

```bash
# Before optimization
clickhouse-client --query "..." 2>&1
clickhouse-client --query "SELECT ... FROM system.trace_log WHERE ..." \
    --format TabSeparated > stacks_before.txt

# After optimization (e.g., add index)
clickhouse-client --query "ALTER TABLE ..."
clickhouse-client --query "..."
clickhouse-client --query "SELECT ... FROM system.trace_log WHERE ..." \
    --format TabSeparated > stacks_after.txt

# Generate both flamegraphs and compare
./FlameGraph/flamegraph.pl stacks_before.txt > before.svg
./FlameGraph/flamegraph.pl stacks_after.txt > after.svg
```

## Summary

ClickHouse's sampling profiler writes CPU stack traces to `system.trace_log`. Export these traces and pipe them through `flamegraph.pl` to visualize where CPU time is spent. Wide flamegraph towers indicate decompression, sorting, or aggregation bottlenecks that guide targeted optimizations.
