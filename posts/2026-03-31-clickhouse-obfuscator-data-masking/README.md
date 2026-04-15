# How to Use clickhouse-obfuscator for Data Masking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, clickhouse-obfuscator, Data Masking, Privacy, Testing

Description: Learn how to use clickhouse-obfuscator to anonymize production data for safe use in development, testing, and bug reproduction without exposing PII.

---

`clickhouse-obfuscator` is a tool that transforms real ClickHouse data into statistically similar but irreversible anonymized data. It preserves data distributions and types while removing sensitive information.

## What clickhouse-obfuscator Does

- Generates new string values using a trained Markov model that preserves statistical properties
- Transforms numbers using pseudorandom permutations within the same magnitude range
- Keeps data types, nullability, and structure identical
- Produces deterministic output for the same seed

## Installation

Ships with ClickHouse:

```bash
which clickhouse-obfuscator
# /usr/bin/clickhouse-obfuscator
```

## Basic Usage

Export data from ClickHouse, obfuscate, and reimport:

```bash
# Step 1: Export as Native format
clickhouse-client --query "SELECT * FROM analytics.events FORMAT Native" \
  > events_raw.native

# Step 2: Obfuscate
clickhouse-obfuscator \
  --seed "my-secret-seed" \
  --input-format Native \
  --output-format Native \
  --structure "ts DateTime, user_id String, event String, value Float64" \
  < events_raw.native > events_masked.native

# Step 3: Import to dev cluster
clickhouse-client --query "INSERT INTO dev.events FORMAT Native" \
  < events_masked.native
```

## Getting the Table Structure

```bash
clickhouse-client --query \
  "DESCRIBE TABLE analytics.events FORMAT TSV" | \
  awk '{print $1, $2}' | paste -sd ',' | sed 's/,/, /g'
```

Or use `SHOW CREATE TABLE` and extract column definitions.

## Using with TSV Format

For simpler workflows:

```bash
# Export to a file first (clickhouse-obfuscator requires seekable input)
clickhouse-client --query "SELECT * FROM events LIMIT 100000 FORMAT TSV" \
  > events_raw.tsv

clickhouse-obfuscator \
  --seed "seed123" \
  --input-format TSV \
  --output-format TSV \
  --structure "ts DateTime, user_id String, event String" \
  < events_raw.tsv > events_masked.tsv
```

## What Gets Obfuscated

- Strings: new values generated using a trained Markov model that preserves statistical character patterns
- Numbers: permuted using a Feistel network within the same log2 magnitude bucket (0 and 1 are always preserved)
- DateTime: the date component is preserved, while the time-of-day component is transformed
- UUIDs: randomized while preserving UUID version and variant bits

## What Is NOT Changed

- Schema and column names
- NULL distribution
- Row count
- Date values (Date columns are left unchanged)
- Continuity of time values and floating-point values

## Practical Use Case: Bug Reproduction

When a query performs poorly in production, obfuscate a sample and share with the team:

```bash
# Export to a file first (clickhouse-obfuscator requires seekable input)
clickhouse-client --query \
  "SELECT * FROM slow_table WHERE ts > now() - INTERVAL 1 DAY FORMAT Native" \
  > slow_table_raw.native

clickhouse-obfuscator \
  --seed "repro-seed" \
  --input-format Native \
  --output-format Native \
  --structure "$(clickhouse-client -q 'DESCRIBE TABLE slow_table' | awk '{print $1" "$2}' | tr '\n' ',')" \
  < slow_table_raw.native > repro_data.native
```

## Summary

`clickhouse-obfuscator` is the right tool for creating realistic but anonymized datasets from production ClickHouse data. It enables safe developer access, reproducible bug reports, and compliant test environments.
