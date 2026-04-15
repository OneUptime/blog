# How to Use ClickHouse Performance Tests Framework

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Performance, Testing, Framework, Benchmark, Regression

Description: Use the ClickHouse performance tests framework to run standardized benchmarks and detect performance regressions across versions.

---

The ClickHouse project ships a built-in performance testing framework located in `tests/performance`. This framework is used by the ClickHouse team to catch query regressions between releases and can be adapted for your own workloads.

## Overview of the Framework

The performance tests framework consists of XML test definition files and a Python runner (`scripts/perf.py`). Each test file defines:
- Table creation and data loading queries
- Queries to benchmark
- Optional settings and substitutions for parameterized tests

## Running a Single Performance Test

```bash
# Clone ClickHouse repository
git clone --depth=1 https://github.com/ClickHouse/ClickHouse.git
cd ClickHouse

# Install dependencies
pip3 install clickhouse_driver scipy

# Run a specific test (test file is a positional argument)
python3 tests/performance/scripts/perf.py \
  --host localhost --port 9000 \
  tests/performance/hits.xml
```

## Writing a Custom Test File

Create an XML file defining your benchmark:

```xml
<test>
    <create_query>
        CREATE TABLE IF NOT EXISTS perf_events (
            event_time DateTime,
            event_type LowCardinality(String),
            user_id UInt32
        ) ENGINE = MergeTree()
        ORDER BY (event_type, event_time)
    </create_query>
    <fill_query>
        INSERT INTO perf_events
        SELECT now() - rand() % 86400, toString(rand() % 5), rand() % 100000
        FROM numbers(5000000)
    </fill_query>

    <query>SELECT count() FROM perf_events WHERE event_type = '3'</query>
    <query>SELECT uniq(user_id) FROM perf_events WHERE event_time >= today()</query>
    <query>SELECT event_type, count() FROM perf_events GROUP BY event_type</query>

    <drop_query>DROP TABLE IF EXISTS perf_events</drop_query>
</test>
```

The `<create_query>`, `<fill_query>`, `<query>`, and `<drop_query>` tags are all direct children of `<test>`. The runner controls iteration count via its `--runs` command-line flag.

## Comparing Two ClickHouse Versions

The framework supports side-by-side comparison by specifying multiple hosts and ports as space-separated values:

```bash
python3 tests/performance/scripts/perf.py \
  --host localhost new-server \
  --port 9000 9000 \
  tests/performance/my_test.xml
```

The runner executes each query against both servers and outputs a TSV comparison of query times directly to stdout.

## Interpreting Results

When comparing two servers, the framework outputs TSV-formatted results including:
- Query run times for each server
- Statistical comparison between the two servers

You can redirect the output and further analyze the results using standard tools or the `system.query_log` table.

## Using Query Log for Regression Analysis

After running the framework, query the performance log:

```sql
SELECT
    query,
    median(query_duration_ms) AS median_ms,
    count() AS runs
FROM system.query_log
WHERE type = 'QueryFinish'
  AND event_time > now() - INTERVAL 30 MINUTE
GROUP BY query
ORDER BY median_ms DESC;
```

## Integrating into CI/CD

Run performance tests in your CI pipeline to catch regressions before deploying new ClickHouse versions:

```bash
#!/bin/bash
# Compare staging (new version) against production (current version)
python3 tests/performance/scripts/perf.py \
  --host staging production \
  --port 9000 9000 \
  --runs 10 \
  tests/performance/my_test.xml > results.tsv
```

## Summary

The ClickHouse performance tests framework provides a repeatable, structured way to benchmark queries and detect regressions. Write XML test files for your critical queries, run comparisons across ClickHouse versions or server configurations, and integrate into CI/CD to prevent performance degradation from reaching production.
