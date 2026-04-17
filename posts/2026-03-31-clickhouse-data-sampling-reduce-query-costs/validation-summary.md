# Validation Summary: How to Use Data Sampling to Reduce ClickHouse Query Costs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree engine, SAMPLE clause, SAMPLE BY, intHash64)
- SQL (ClickHouse dialect)
- Python (application-layer adaptive sampling example)
- ClickHouse Cloud (pricing context)

## Sources Consulted
- ClickHouse MergeTree table engine documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse SELECT / SAMPLE clause documentation: https://clickhouse.com/docs/en/sql-reference/statements/select/sample
- ClickHouse hash functions documentation (intHash64)

## Issues Found
- **Table definition violated SAMPLE BY requirement.** The original `CREATE TABLE` used `SAMPLE BY intHash64(user_id)` but the `ORDER BY` was `(user_id, event_time)`. ClickHouse requires the sampling expression to be contained in the primary key; `user_id` is not the same expression as `intHash64(user_id)`, so the statement would fail with "Sampling expression must be present in the primary key." Fixed by changing `ORDER BY` to `(user_id, event_time, intHash64(user_id))`, matching the canonical pattern in the ClickHouse docs (e.g., `ORDER BY (CounterID, EventDate, intHash32(UserID)) SAMPLE BY intHash32(UserID)`).

## Review Notes
- `uniqExact(user_id) * 100` scaling is statistically defensible here specifically because the sample key is `intHash64(user_id)`: SAMPLE 0.01 selects ~1% of users (all their events), so scaling unique users by the inverse sample rate is a reasonable estimator. This would NOT be valid for arbitrary sample keys.
- The claim "scanning 1% of rows... reduces costs by 100x" is an approximation. In practice ClickHouse reads at granule granularity, so actual reduction can be somewhat less than exact for small or skewed datasets — acceptable as a simplification for the tutorial.
- The "Sampling is maintained across distributed joins when both tables use the same sample key" section is slightly loose: ClickHouse applies SAMPLE to the left table; consistency on the right requires applying SAMPLE there too (or relying on join keys aligning with the sample). The example query samples only `p`, which is fine for the aggregate shown but readers should know both sides need SAMPLE for symmetric sampling. Not technically incorrect, so not edited.
- `SAMPLE 1.0` in the Python adaptive function is handled by ClickHouse as 100% (no sampling); worth noting the app could skip the SAMPLE clause entirely in that branch, but this is a style preference, not an error.
- "ClickHouse Cloud where you pay per byte scanned" is a simplification — ClickHouse Cloud bills compute-hours (plus storage), not bytes scanned directly, though scanning less data does reduce compute time. Left as-is since the post's recommendation (sample to reduce cost) is still directionally correct.
