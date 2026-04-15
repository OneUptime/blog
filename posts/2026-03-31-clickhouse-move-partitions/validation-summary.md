# Validation Summary: How to Move Partitions Between Tables in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (MergeTree engine family)
- SQL DDL (`ALTER TABLE` partition operations)
- `MOVE PARTITION TO TABLE` and `REPLACE PARTITION FROM` commands
- `system.parts` system table for partition inspection

## Sources Consulted
- ClickHouse official documentation: ALTER TABLE partition operations — https://clickhouse.com/docs/en/sql-reference/statements/alter/partition
- ClickHouse official documentation: MergeTree engine — https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree

## Issues Found

1. **Incorrect "zero-copy" terminology in description (line 7):** The term "zero-copy" in ClickHouse refers specifically to zero-copy replication for S3/object storage, not partition move/replace operations. Changed to "atomic data transfers."

2. **Incorrect "hard-link-based" claim in introduction (line 11):** The official docs do not describe MOVE/REPLACE PARTITION as "hard-link-based" (hard links are documented only for FREEZE PARTITION). Changed to "lightweight, metadata-level operations" which accurately describes the behavior without making unsupported implementation claims.

3. **Incorrect schema compatibility requirement — index granularity (line 20):** The blog listed "same index granularity" as a requirement for partition operations. The official documentation does not list index_granularity as a compatibility requirement. Removed this claim.

4. **Incorrect "physical data copy" fallback claim (line 20):** The parenthetical "(or the operation involves a physical data copy)" is not supported by the documentation. Removed.

5. **Missing schema requirement — PRIMARY KEY (lines 15-21):** The official docs list PRIMARY KEY as a separate requirement from ORDER BY. While they are often the same, the docs list them independently. Added PRIMARY KEY to the requirements list.

6. **Missing schema requirement — indices and projections (lines 15-21):** The official docs require that the destination table must include all indices and projections from the source table. This was not mentioned. Added to the requirements list.

7. **Missing schema requirement — same engine family for MOVE (lines 15-23):** For MOVE PARTITION, both tables must be the same engine family (both replicated or both non-replicated). The blog only stated the destination must be MergeTree family. Added the replicated/non-replicated matching requirement.

## Review Notes
- The core SQL syntax for both `MOVE PARTITION TO TABLE` and `REPLACE PARTITION FROM` is correct and matches the official documentation.
- The behavioral descriptions (source deleted for MOVE, source intact for REPLACE) are accurate.
- The `ON CLUSTER` syntax placement is correct.
- The `tuple()` usage for non-partitioned tables is correct per the docs.
- The partition expression examples (numeric `202401`, string date `'2024-01-01'`) are valid formats.
- The `storage_policy` SETTINGS parameter usage is correct.
- The complete examples (archival pipeline and staging refresh) are well-structured and demonstrate realistic use cases.
- The post does not cover the `PARTITION ID` syntax or the `ALL` keyword for partition expressions, which could be useful additions in the future but are not errors.
