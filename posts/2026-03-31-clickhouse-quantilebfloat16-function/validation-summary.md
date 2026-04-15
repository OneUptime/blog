# Validation Summary: How to Use quantileBFloat16() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse
- SQL (ClickHouse dialect)
- quantileBFloat16() aggregate function
- bfloat16 (Brain Float 16) numeric format
- Related functions: quantilesBFloat16(), quantile(), quantileTDigest(), quantileExact(), quantileTiming()

## Sources Consulted
- ClickHouse official documentation for quantileBFloat16: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantilebfloat16
- ClickHouse official documentation for quantile: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantile
- ClickHouse official documentation for quantileTiming: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantiletiming
- ClickHouse source code: QuantileBFloat16Histogram.h (implementation details for memory/data structure)

## Issues Found

1. **Return type incorrect (line 29)**: The post stated the result of `quantilesBFloat16()` is "an Array of Float32 values." The ClickHouse documentation specifies the return type of `quantileBFloat16()` is Float64, so the array variant returns Array(Float64). Changed to "Array of Float64 values."

2. **Relative error overstated (multiple locations)**: The post claimed "roughly 1% relative error" due to the 7-bit mantissa. The ClickHouse documentation explicitly states the error is "no more than 0.390625%" (1/256, which is the half-step precision of the 7 fraction bits). Corrected all instances from ~1% to ~0.39%.

3. **Error range example incorrect (line 66)**: The SQL comment stated "For a true value of 1000ms, bfloat16 result may be 990-1010ms" which corresponds to the incorrect ±1% claim. With the correct ~0.39% error bound, the range for 1000ms is approximately 996-1004ms. Updated the example accordingly.

4. **Memory claim "128 KB" incorrect (lines 49, 59, 108)**: The post claimed a fixed 128 KB internal state (derived from 65,536 x 2 bytes). The actual implementation uses a sparse hash map (`HashMapWithStackMemory`) with UInt64 weight counters per entry, not a simple array of 2-byte values. The total memory per entry includes the bfloat16 key (2 bytes) plus UInt64 weight (8 bytes) plus hash map overhead. The memory IS bounded (at most 65,536 distinct bfloat16 values), but the maximum is substantially more than 128 KB. In practice, far fewer distinct values are observed (e.g., ~2,623 for 100 million integers). Rewrote the memory section to accurately describe the sparse, data-dependent nature of the memory usage without citing the incorrect 128 KB figure.

## Review Notes
- The SQL syntax for all code examples is correct and follows ClickHouse conventions.
- The comparison of quantile functions is reasonable. The characterization of `quantile()` as reservoir sampling is confirmed by the documentation (reservoir size up to 8,192).
- The claim that `quantileTiming()` is restricted to 0-30,000ms is confirmed: values exceeding 30,000 are capped.
- The bfloat16 format description (1 sign bit, 8 exponent bits, 7 mantissa/fraction bits) matches the official documentation exactly.
- The t-digest comparison ("~100 centroids") is a reasonable approximation of the default compression parameter in ClickHouse's quantileTDigest implementation.
- The `quantilesBFloat16()` multi-quantile variant follows ClickHouse's standard naming convention for all quantile functions and is valid.
