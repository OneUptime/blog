# Validation Summary: How to Run the ClickHouse Benchmark Suite

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (database engine)
- ClickBench (official benchmark suite)
- clickhouse-client (CLI client)
- clickhouse-benchmark (built-in benchmark tool)

## Sources Consulted
- ClickBench GitHub repository: https://github.com/ClickHouse/ClickBench
- ClickBench `create.sql` (official schema): https://raw.githubusercontent.com/ClickHouse/ClickBench/main/clickhouse/create.sql
- ClickBench `queries.sql` (official queries): https://raw.githubusercontent.com/ClickHouse/ClickBench/main/clickhouse/queries.sql
- ClickBench `run.sh` (official run script, confirms `--time` flag usage)
- ClickHouse `clickhouse-benchmark` documentation: https://clickhouse.com/docs/operations/utilities/clickhouse-benchmark
- ClickHouse datasets endpoint: https://datasets.clickhouse.com/hits_compatible/hits.csv.gz (verified exists, ~15 GB compressed)
- ClickHouse hardware benchmark results: https://benchmark.clickhouse.com/hardware/

## Issues Found

### 1. Non-existent sample dataset (CRITICAL)
**What was wrong:** The post referenced a 10M-row sample dataset at `https://datasets.clickhouse.com/hits_compatible/hits_10m.csv.gz`. This file does not exist (returns 404).
**What was changed:** Removed the sample dataset download section entirely. The post now only references the full dataset.

### 2. Incorrect dataset size claim (ERROR)
**What was wrong:** The post described the dataset as "~15 GB uncompressed." In reality, ~15 GB is the *compressed* size; the uncompressed CSV is approximately 75 GB.
**What was changed:** Updated to "~15 GB compressed, ~75 GB uncompressed" and added a `gunzip` step.

### 3. Incomplete table schema would break data import (CRITICAL)
**What was wrong:** The post provided a CREATE TABLE statement with only 14 columns, but the actual ClickBench `hits` table has 105 columns. The CSV data file contains all 105 columns, so attempting to load it into a 14-column table would fail. Additionally, one of the listed columns (`EventTypeID`) does not exist in the official schema, and the ENGINE/ORDER BY/PARTITION BY clauses differed from the official schema.
**What was changed:** Replaced the inline partial schema with instructions to download and run the official `create.sql` from the ClickBench GitHub repository.

### 4. Broken documentation URL (ERROR)
**What was wrong:** A comment in the schema referenced `https://clickhouse.com/docs/getting-started/example-datasets/clickbench`, which returns a 404 error.
**What was changed:** The inline schema (including the broken link comment) was replaced with the official `create.sql` download approach, eliminating the dead link.

### 5. Data loading referenced non-existent file (ERROR)
**What was wrong:** The `INSERT INTO hits FORMAT CSV` command referenced `hits_10m.csv` (the non-existent sample dataset).
**What was changed:** Updated to reference `hits.csv` (the full dataset).

## Review Notes
- The "100-million-row" claim is approximate; the actual dataset has 99,997,497 rows. This is a standard rounding used even in the official ClickBench documentation, so it was left as-is.
- The hardware benchmark comparison URL `https://clickhouse.com/benchmark/hardware` redirects to `https://benchmark.clickhouse.com/hardware/`. The redirect works, so the URL was left as-is.
- The "Typical single-node results" timings in the Comparing Results section are illustrative estimates and will vary by hardware. They are presented as approximations, which is appropriate.
- The `--time` flag for `clickhouse-client` is not well-documented on the ClickHouse docs site but is used in the official ClickBench scripts (`run.sh`, `benchmark.sh`) and is a real, functional flag.
- The `clickhouse-benchmark` flags `--concurrency` and `--iterations` are verified correct per official documentation.
