# Validation Summary: How to Use Sampling for Approximate Query Results in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree engine, SAMPLE clause, SAMPLE BY key)
- SQL (aggregate functions, GROUP BY, ORDER BY)

## Sources Consulted
- ClickHouse official documentation — SAMPLE clause: https://clickhouse.com/docs/en/sql-reference/statements/select/sample
- ClickHouse official documentation — MergeTree engine (SAMPLE BY): https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree

## Issues Found

1. **SAMPLE BY expression missing hash function**: The CREATE TABLE used `SAMPLE BY user_id` directly without a hash function. ClickHouse documentation recommends using a hash function like `intHash32()` to ensure uniform distribution across the sample space. Without hashing, sequential or clustered column values produce biased samples. Fixed to `SAMPLE BY intHash32(user_id)` and updated `ORDER BY` to include `intHash32(user_id)` since the SAMPLE BY expression must be part of the primary key.

2. **Misleading explanation about automatic hashing**: The text stated "A hash of `user_id` determines which rows belong to each sample shard," implying ClickHouse automatically hashes the column. It does not — the user must explicitly include a hash function in the SAMPLE BY expression. Rewrote to explain the role of the hash function and why it matters for uniform sampling.

3. **Reference to undefined column `event_date`**: The first sampled query used `WHERE event_date = today()` but the CREATE TABLE only defines `event_time DateTime`. There is no `event_date` column. Fixed to `WHERE toDate(event_time) = today()`.

## Review Notes
- The error estimation formula (`1 / sqrt(n * f)`) is a reasonable approximation for the relative standard error of count estimates under simple random sampling, though ClickHouse uses systematic sampling on hash ranges which may have slightly different error characteristics. The worked example (0.3% at 10% of 1M rows) is consistent with the formula.
- The `_sample_factor` virtual column section is correct and is the preferred approach over manual scaling by the inverse sample rate.
- The "When NOT to Use Sampling" section gives sound advice. Sampling is indeed inappropriate for exact distinct counts, specific record lookups, and compliance/billing queries.
