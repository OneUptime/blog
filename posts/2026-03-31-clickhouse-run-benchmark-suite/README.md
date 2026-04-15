# How to Run the ClickHouse Benchmark Suite

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Benchmark, Performance, ClickBench, Testing

Description: Learn how to run the official ClickHouse benchmark suite (ClickBench) to measure query performance on standard analytical workloads.

---

## The ClickHouse Benchmark Suite

ClickBench is the official benchmark used by the ClickHouse team to compare performance across versions and hardware. It uses 43 analytical queries on a 100-million-row web analytics dataset. Running it gives you a reproducible performance baseline.

## Downloading the Dataset

The dataset is available on S3 as a compressed file (~15 GB compressed, ~75 GB uncompressed):

```bash
wget https://datasets.clickhouse.com/hits_compatible/hits.csv.gz
gunzip hits.csv.gz
```

## Creating the Table

The `hits` table has 105 columns. Download the official schema from the ClickBench repository:

```bash
wget https://raw.githubusercontent.com/ClickHouse/ClickBench/main/clickhouse/create.sql
clickhouse-client < create.sql
```

## Loading the Data

```bash
clickhouse-client --query "INSERT INTO hits FORMAT CSV" < hits.csv
```

## Running ClickBench Queries

Download the official benchmark queries:

```bash
wget https://raw.githubusercontent.com/ClickHouse/ClickBench/main/clickhouse/queries.sql
```

Run all queries and record timings:

```bash
while read -r query; do
    echo "Running: ${query:0:60}..."
    clickhouse-client \
        --query "$query" \
        --time \
        --format Null \
        2>&1 | tail -1
done < queries.sql
```

## Running with clickhouse-benchmark

Use the built-in benchmark tool for concurrency testing:

```bash
clickhouse-benchmark \
    --concurrency 4 \
    --iterations 100 \
    --query "SELECT count() FROM hits WHERE URL LIKE '%google%'"
```

## Comparing Results

After running the benchmark, compare your numbers against the published results at https://clickhouse.com/benchmark/hardware:

```text
Typical single-node results on NVMe hardware:
- Q1 (count distinct users): ~0.01s
- Q37 (regex search in URL): ~0.8s
- Q43 (complex aggregation): ~1.2s
```

## Automating the Full Suite

```bash
#!/bin/bash
OUTPUT="results_$(date +%Y%m%d).tsv"
echo -e "query_num\ttime_ms" > "$OUTPUT"

i=1
while read -r query; do
    TIME=$(clickhouse-client --query "$query" --time --format Null 2>&1 | tail -1)
    echo -e "$i\t$TIME" >> "$OUTPUT"
    i=$((i + 1))
done < queries.sql
```

## Summary

ClickBench provides 43 standard queries on 100M web analytics rows for reproducible ClickHouse performance testing. Download the dataset, create the table with the official schema, and run queries with timing to establish a performance baseline you can compare against hardware and version upgrades.
