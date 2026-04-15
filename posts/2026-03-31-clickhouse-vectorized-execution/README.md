# How ClickHouse Vectorized Query Execution Works

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Vectorized Execution, SIMD, Performance, Internal

Description: Understand how ClickHouse processes queries column by column using vectorized execution and SIMD instructions, achieving orders of magnitude better performance than row-at-a-time processing.

---

## Row-at-a-Time vs. Vectorized Processing

Traditional databases process one row at a time through an iterator (Volcano) model. Each function call retrieves a single row, introducing high per-row overhead from virtual function dispatch and branch prediction misses.

ClickHouse processes data in columnar blocks - vectors of up to 65,536 values at a time (the default `max_block_size`). This enables SIMD (Single Instruction Multiple Data) CPU instructions to operate on 8, 16, or 32 values simultaneously using 256-bit or 512-bit AVX/AVX-512 registers.

## Blocks - The Unit of Processing

Every pipeline processor in ClickHouse receives and emits a `Block` - a set of columns each represented as a contiguous array. For example, processing `WHERE event_type = 'login'` creates a filter bitmask over the entire block at once:

```text
event_type column: ['login', 'click', 'login', 'logout', ...]
filter bitmask:    [  1,       0,       1,        0,     ...]
```

## SIMD in Practice

For numeric operations like `SUM(value)`, ClickHouse uses auto-vectorized loops that the compiler (Clang) compiles to AVX2 instructions:

```text
// Conceptually (compiler generates actual SIMD):
for (size_t i = 0; i < n; i += 8) {
    sum += _mm256_load_si256(&data[i]);  // load 8 int32s at once
}
```

On modern CPUs, this processes 8 integers per clock cycle instead of 1.

## String Operations

String filtering uses SIMD-accelerated substring search via the `memmem` family of functions and ClickHouse's own implementations that scan 16 or 32 bytes at once.

```sql
-- This filter benefits from SIMD string scanning
SELECT count() FROM events WHERE event_type LIKE '%error%';
```

## Checking Actual CPU Usage

Use `EXPLAIN PIPELINE` to see how many threads process your query, and use `system.query_log` to see CPU microseconds used:

```sql
SELECT
    query,
    read_rows,
    query_duration_ms,
    ProfileEvents['UserTimeMicroseconds'] AS cpu_us
FROM system.query_log
WHERE type = 'QueryFinish'
ORDER BY event_time DESC
LIMIT 5;
```

## Multi-Threading and Vectorization

ClickHouse combines vectorization with multi-threading. Each CPU thread processes a separate range of granules, and each thread uses SIMD within its own block processing. This means a 16-core server gets both 16x parallelism and 8x SIMD width simultaneously.

```sql
-- Control thread count
SET max_threads = 8;
```

## Data Layout Matters

For vectorization to be effective, data must be in contiguous memory. ClickHouse's columnar storage ensures each column's values are stored contiguously in `.bin` files and loaded into contiguous arrays in RAM, giving SIMD instructions exactly what they need.

## Summary

ClickHouse achieves high performance by processing data in large columnar blocks, enabling SIMD CPU instructions to operate on dozens of values per clock cycle. Combined with multi-threaded execution where each thread processes separate granules, ClickHouse can sustain billions of rows per second of throughput on analytical queries.
