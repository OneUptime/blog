# Validation Summary: How to Use $expMovingAvg for Exponential Moving Averages in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Aggregation Framework
- `$setWindowFields` stage
- `$expMovingAvg` window operator
- `$avg` accumulator with document windows
- `$addFields` / `$subtract` for MACD computation

## Sources Consulted
- MongoDB official documentation for `$expMovingAvg`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/expMovingAvg/
- MongoDB official documentation for `$setWindowFields`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/setWindowFields/
- MongoDB raw docs source on GitHub (`expMovingAvg.txt`, `setWindowFields.txt`, `expMovingAvg-N-or-alpha.rst`)

## Issues Found
No technical issues found.

## Review Notes
- All code examples use correct `$setWindowFields` / `$expMovingAvg` syntax and would work as described.
- The EMA formula (`EMA(t) = alpha * value(t) + (1 - alpha) * EMA(t-1)`) matches the official docs exactly.
- The alpha derivation from N (`alpha = 2 / (N + 1)`) is correct per MongoDB docs, and the worked example (N=7 giving alpha=0.25) is mathematically accurate.
- `N` and `alpha` are correctly described as mutually exclusive parameters.
- The SMA comparison example correctly uses `window: { documents: [-6, 0] }` for a 7-document sliding window with `$avg`.
- The MACD example correctly uses 12-period and 26-period EMAs with `$subtract` to compute the MACD line.
- The post does not specify a `window` field for `$expMovingAvg`, which is correct since this operator does not accept one — it operates cumulatively across the partition.
- The blog's claim about `sortBy` being used with `$expMovingAvg` is practically correct; while the docs don't list it as strictly required for `$expMovingAvg`, the operator is order-dependent and all official examples include `sortBy`.
