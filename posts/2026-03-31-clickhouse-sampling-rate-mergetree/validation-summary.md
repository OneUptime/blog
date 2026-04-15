# Validation Summary: How to Configure Sampling Rate in MergeTree Tables

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- MergeTree table engine
- SAMPLE BY clause
- SAMPLE query clause
- intHash32 hash function

## Sources Consulted
- ClickHouse MergeTree engine documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse SELECT SAMPLE clause documentation: https://clickhouse.com/docs/en/sql-reference/statements/select/sample
- ClickHouse ALTER TABLE SAMPLE BY documentation: https://clickhouse.com/docs/en/sql-reference/statements/alter/sample-by

## Issues Found

1. **Incorrect internal hash function claim (How SAMPLE BY Works section)**: The post stated "ClickHouse computes `sipHash64(sample_key) % (2^64)` and uses the result to divide rows into deterministic subsets." This is not documented and appears inaccurate. ClickHouse uses the SAMPLE BY expression value directly — the expression must evaluate to an unsigned integer, and values are divided into ranges. Replaced with an accurate description of how the value range determines sampling, and noted the importance of uniform distribution.

2. **Misleading ORDER BY position comment (SAMPLE BY Must Be in ORDER BY section)**: The comment "Correct: user_id is first in ORDER BY" implied that the SAMPLE BY column must be first in the ORDER BY. Official documentation shows it can be at any position — it only needs to be contained in the primary key. Changed "is first in" to "appears in".

3. **Incorrect claim about adding SAMPLE BY to existing tables (Adding SAMPLE BY to Existing Tables section)**: The post stated "You cannot add SAMPLE BY to an existing MergeTree table without recreating it" and showed a recreate-and-rename workflow. This is incorrect — ClickHouse supports `ALTER TABLE ... MODIFY SAMPLE BY` and `ALTER TABLE ... REMOVE SAMPLE BY` as lightweight metadata operations. Replaced the entire section with the correct ALTER TABLE syntax.

4. **Unfounded statistical error claim (Summary section)**: The post claimed SAMPLE 0.1 provides "10x query speedups with ~1% statistical error." The ~1% error figure is not supported by documentation and is misleading — statistical error depends on the metric being computed, data distribution, and actual row count. Replaced with a more accurate general statement about "significant query speedups on large datasets."

## Review Notes
- The basic SAMPLE BY definition example using raw `user_id UInt64` is valid since UInt64 satisfies the unsigned integer requirement, though the post correctly notes later that wrapping in `intHash32` improves distribution.
- The `system.tables` query using `sampling_key` column is correct.
- The SAMPLE clause placement in SELECT queries (after FROM, before WHERE) matches documented usage.
- The join consistency advice is sound — the official docs confirm sampling works consistently across tables with the same sampling key.
- The summary was updated to mention ALTER TABLE support, consistent with the corrected section.
