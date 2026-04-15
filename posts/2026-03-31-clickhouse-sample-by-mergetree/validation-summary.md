# Validation Summary: How to Use SAMPLE BY Clause in MergeTree in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree engine)
- SQL (ClickHouse dialect)
- SAMPLE BY clause and SAMPLE query syntax
- Hash functions: sipHash64(), cityHash64(), intHash32()
- _sample_factor virtual column

## Sources Consulted
- ClickHouse MergeTree engine documentation — https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree (SAMPLE BY section)
- ClickHouse SELECT SAMPLE clause documentation — https://clickhouse.com/docs/en/sql-reference/statements/select/sample
- ClickHouse ALTER TABLE SAMPLE BY documentation — https://clickhouse.com/docs/en/sql-reference/statements/alter/sample-by

## Issues Found

1. **Constraint #1 was imprecise about primary key requirement**: The post stated "The SAMPLE BY expression must be included in the ORDER BY clause." The official ClickHouse docs specify the expression must be in the **primary key** (which is always a prefix of the sorting/ORDER BY key). Being in ORDER BY is necessary but not sufficient when an explicit PRIMARY KEY is defined that is shorter than ORDER BY. Fixed to: "must be included in the primary key (and consequently in the ORDER BY clause)."

2. **Performance Impact section had confusing wording**: The post said "SAMPLE BY requires that the hash of the sample key is part of the ORDER BY." Since the sample key itself is typically already a hash expression (e.g., sipHash64(user_id)), saying "hash of the sample key" implied double-hashing. Fixed to: "the sample key expression is part of the primary key (and therefore the ORDER BY)."

3. **Incorrect claim that SAMPLE BY cannot be added after table creation**: The summary stated "Define SAMPLE BY at table creation time - it cannot be added later without recreating the table." ClickHouse supports `ALTER TABLE ... MODIFY SAMPLE BY` and `ALTER TABLE ... REMOVE SAMPLE BY` as lightweight metadata operations. The constraint is that the new expression must already be part of the primary key. Fixed to reflect ALTER TABLE support.

4. **Summary bullet about ORDER BY**: The summary said "The sample key must appear in ORDER BY" — updated to "must appear in the primary key (and therefore in ORDER BY)" for consistency with the corrected constraint.

## Review Notes
- The post uses `sipHash64()` as its primary recommended hash function. While the official MergeTree docs only show `intHash32()` and `cityHash64()` as examples, `sipHash64()` returns UInt64 (unsigned integer) and is a widely-used hash function in ClickHouse, so this recommendation is valid.
- The `_sample_factor` virtual column is used correctly throughout the post. The docs emphasize it for count-based sampling (`SAMPLE n`), but it also works with fraction-based sampling (`SAMPLE k`), as used in the post.
- The note about `uniq()` compounding approximation with sampling is a good caveat. In this case, since the SAMPLE BY key is the same column being counted by `uniq()`, the estimation is reasonably accurate because entire users (not random rows) are included or excluded from the sample.
- The parallel sampling with OFFSET section is correct. All four buckets (0/4 through 3/4) partition the full key space without overlap.
