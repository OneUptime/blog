# How to Benchmark Before Capacity Planning for ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Benchmark, Capacity Planning, Performance, Testing

Description: Run representative benchmarks on a ClickHouse staging cluster to measure actual throughput and latency before committing to a production cluster size.

---

Generic sizing rules are a starting point, not a guarantee. Benchmarking on your actual data and queries gives accurate numbers that translate directly into your production capacity plan.

## Set Up a Staging Cluster

Use the smallest configuration that mirrors production topology (same ratio of replicas/shards, same ClickHouse version):

```bash
docker run -d \
  --name ch-bench \
  -p 8123:8123 -p 9000:9000 \
  -v $(pwd)/config:/etc/clickhouse-server \
  clickhouse/clickhouse-server:latest
```

## Load Representative Data

Insert a sample of real production data (or synthetic data with the same cardinality):

```bash
clickhouse-client --query "
INSERT INTO events SELECT * FROM s3(
    's3://my-bucket/sample/*.parquet', 'KEY', 'SECRET', 'Parquet'
)
"
```

## Run clickhouse-benchmark

```bash
clickhouse-benchmark \
  --concurrency 10 \
  --iterations 100 \
  --host localhost \
  --port 9000 <<EOF
SELECT count(), uniq(user_id) FROM events WHERE ts >= today() - 1;
SELECT category, sum(amount) FROM events GROUP BY category ORDER BY 2 DESC LIMIT 20;
EOF
```

Sample output:

```text
QPS: 45.3
50th percentile: 210ms
95th percentile: 480ms
99th percentile: 820ms
```

## Ingestion Throughput Test

```bash
# Generate and insert 10M rows, measure time
time clickhouse-client --query "
INSERT INTO events SELECT
    rand() % 1000000 AS user_id,
    now() - rand() % 86400 AS ts,
    toString(rand()) AS data
FROM numbers(10000000)
"
```

## Scaling the Results to Production

```text
Benchmark cluster: 2 nodes, 16 cores, 32 GB RAM
Achieved QPS: 45 at 10 concurrency, p95 = 480ms

Production target: p95 < 200ms at 50 concurrency
Required throughput: 50/10 = 5x more concurrency
Expected nodes: 2 * 5 = 10 nodes (adjust with actual core scaling tests)
```

## Key Metrics to Capture

- Insert throughput (rows/sec, bytes/sec)
- Query QPS at each concurrency level
- p50, p95, p99 query latency
- Peak memory per query
- CPU utilization at peak load

## Summary

Benchmark with representative data and queries on a scaled-down version of your production topology. Use the results to extrapolate node counts and instance sizes, then add 30% headroom for growth and background merges.
