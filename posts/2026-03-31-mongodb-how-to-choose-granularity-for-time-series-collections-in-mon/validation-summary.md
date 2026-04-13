# Validation Summary: How to Choose Granularity for Time Series Collections in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB Time Series Collections
- MongoDB granularity settings (`seconds`, `minutes`, `hours`)
- MongoDB bucketing and columnar compression
- Custom bucket configuration (`bucketMaxSpanSeconds`, `bucketRoundingSeconds`) introduced in MongoDB 6.3
- `collMod` command for modifying time series granularity (MongoDB 6.0+)

## Sources Consulted
- MongoDB official documentation: Time Series Collections — https://www.mongodb.com/docs/manual/core/timeseries-collections/
- MongoDB official documentation: `collMod` for Time Series — https://www.mongodb.com/docs/manual/reference/command/collMod/#time-series-collections
- MongoDB official documentation: Set Granularity for Time Series Data — https://www.mongodb.com/docs/manual/core/timeseries/timeseries-granularity/
- MongoDB official documentation: `$out` aggregation stage — https://www.mongodb.com/docs/manual/reference/operator/aggregation/out/

## Issues Found
1. **Incorrect claim about changing granularity (line 177):** The post stated "You cannot modify granularity on an existing collection" and recommended recreating the collection as the only option. This is incorrect since MongoDB 6.0, which introduced `collMod` support for increasing time series granularity (e.g., `seconds` → `minutes` → `hours`). Decreasing granularity still requires recreating the collection. **Fix:** Rewrote the "Changing Granularity" section to explain that `collMod` can increase granularity, added a code example using `db.runCommand({ collMod: ... })`, and clarified that recreation is only needed when decreasing granularity.

## Review Notes
- The granularity table values (seconds=1hr, minutes=24hr, hours=30d) are accurate per current MongoDB documentation.
- The custom bucket configuration section correctly identifies MongoDB 6.3 as the version that introduced `bucketMaxSpanSeconds` and `bucketRoundingSeconds`, and correctly states these two values must be equal.
- The "too coarse" calculation of ~2.6 million readings per bucket (1/sec × 30 days) is mathematically correct (2,592,000).
- The aggregation pipeline for checking data frequency is syntactically correct and would work as described.
- The guideline thresholds for choosing granularity (< 60/hr → hours, 60-1440/hr → minutes, > 1440/hr → seconds) are reasonable practical advice, though not official MongoDB recommendations.
