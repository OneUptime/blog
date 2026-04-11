# Validation Summary: How to Use redis-benchmark for Performance Testing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (redis-benchmark CLI tool)
- Bash scripting
- Python (csv module for parsing results)

## Sources Consulted
- Redis official benchmarks documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/benchmarks/
- Redis source code (src/redis-benchmark.c): https://github.com/redis/redis/blob/unstable/src/redis-benchmark.c
- Redis PR #7600 (extended CSV latency metrics): https://github.com/redis/redis/pull/7600
- Redis bulk loading documentation (redis-cli --pipe): https://redis.io/docs/latest/develop/clients/patterns/bulk-loading/

## Issues Found

### 1. Incorrect `--pipe` flag in Common Flags table
- **What was wrong:** The flags table listed `--pipe` as a redis-benchmark option for pipelining. `--pipe` is a `redis-cli` feature for bulk loading/mass insertion, not a `redis-benchmark` flag. Pipelining in `redis-benchmark` is controlled by `-P <numreq>`, which was already correctly listed in the same table.
- **What was changed:** Removed the `--pipe` row from the Common Flags table.
- **Why:** Including a non-existent flag would cause errors for readers who try to use it and creates confusion between `redis-cli --pipe` (mass insertion) and `redis-benchmark -P` (pipelining).

### 2. Incorrect Python CSV parsing code
- **What was wrong:** The Python example used `csv.DictReader(f)` without specifying `fieldnames`. However, `redis-benchmark --csv` does not emit a header row, so `DictReader` without explicit field names would incorrectly treat the first data row as headers. Additionally, the code referenced `row['p99']`, but the conventional column name is `p99_latency_ms`.
- **What was changed:** Added an explicit `fieldnames` list matching the 8-column CSV output format (`test`, `rps`, `avg_latency_ms`, `min_latency_ms`, `p50_latency_ms`, `p95_latency_ms`, `p99_latency_ms`, `max_latency_ms`) and updated the column reference from `row['p99']` to `row['p99_latency_ms']`.
- **Why:** Without this fix, the Python code would silently produce wrong results (first data row consumed as headers) and the `p99` key would raise a `KeyError`.

## Review Notes
- The 8-column CSV format (with latency percentiles) was introduced in Redis ~6.2 via PR #7600. Older Redis versions only output 2 columns (test name and rps). The post does not mention version requirements, but since it targets a 2026 audience, modern Redis (7.x+) is a reasonable assumption.
- The EVAL example for custom commands is correct but readers should note that `redis-benchmark` uses random keys by default with `-r`; the example uses a fixed key (`testkey`), which is fine for demonstrating the syntax but doesn't simulate realistic key distribution.
- The throughput claim of "100k-200k ops/sec" for a single Redis node is a reasonable ballpark for non-pipelined operations on modern hardware, though actual numbers vary significantly by hardware, OS tuning, and command complexity.
