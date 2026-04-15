# Validation Summary: How to Read and Interpret EXPLAIN Output in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse SQL (EXPLAIN statement variants)
- ClickHouse MergeTree engine (query execution plans, index granularity)
- ClickHouse query pipeline architecture

## Sources Consulted
- ClickHouse official documentation — EXPLAIN statement: https://clickhouse.com/docs/en/sql-reference/statements/explain
- ClickHouse official documentation — MergeTree engine: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse official documentation — Understanding query execution with the analyzer: https://clickhouse.com/docs/en/guides/developer/understanding-query-execution-with-the-analyzer
- ClickHouse source code — `ReadFromMergeTree.cpp` (ReadType enum values and output formatting): https://github.com/ClickHouse/ClickHouse/blob/master/src/Processors/QueryPlan/ReadFromMergeTree.cpp

## Issues Found

### 1. EXPLAIN and EXPLAIN PLAN presented as separate variants
**What was wrong:** The post listed bare `EXPLAIN SELECT ...` ("Optimized query plan") and `EXPLAIN PLAN SELECT ...` ("Detailed execution plan") as two distinct variants. They are identical — `EXPLAIN` without a keyword defaults to `EXPLAIN PLAN`.
**What was changed:** Replaced the duplicate bare `EXPLAIN` entry with `EXPLAIN SYNTAX`, which is an actual distinct variant that shows query text after AST-level optimizations.

### 2. Invalid ReadType values (ReadType: Range and ReadType: All)
**What was wrong:** The post claimed `ReadType: Range` indicates a primary key range scan and `ReadType: All` indicates a full table scan. Neither value exists in ClickHouse. Verified from source code (`ReadFromMergeTree.cpp`), the valid ReadType values are: `Default`, `InOrder`, `InReverseOrder`, and `Parallel`.
**What was changed:** Replaced `ReadType: Range` with `ReadType: Default` in example output. Updated the "Key things to look for" bullet points to list the correct ReadType values with accurate descriptions.

### 3. Full table scan identification method was incorrect
**What was wrong:** The "Identifying Full Table Scans" section instructed readers to look for `ReadType: All` (a non-existent value). In ClickHouse, full table scans are identified by using `EXPLAIN PLAN indexes=1` and examining the Parts/Granules ratios (e.g., `Parts: 892/892` means no pruning occurred).
**What was changed:** Rewrote the section to demonstrate the correct approach using `EXPLAIN PLAN indexes=1`, showing the "after/before" format for Parts and Granules, and explaining that equal values indicate no index pruning.

### 4. Incorrect PIPELINE processor name for parallel reads
**What was wrong:** The PIPELINE example showed `MergeTreeInOrder` processors for a simple `SELECT count()` query without ORDER BY. For standard parallel reads, ClickHouse uses `MergeTreeThread` processors. `MergeTreeInOrder` only appears when reading data in primary key order.
**What was changed:** Replaced `MergeTreeInOrder` with `MergeTreeThread` in the PIPELINE example. Added a note mentioning that `MergeTreeInOrder` appears for ordered reads.

### 5. Common patterns section referenced non-existent ReadType
**What was wrong:** The "Common Patterns to Optimize" section referenced `ReadType: All, Parts: 1000+` which uses the non-existent `ReadType: All` value.
**What was changed:** Updated to use the correct full scan indicator: `Parts: 1000/1000, Granules: 50000/50000` with a note about the `indexes=1` output format.

## Review Notes
- The EXPLAIN ESTIMATE output columns (database, table, parts, rows, marks) are correct per official documentation.
- The default granularity of 8192 rows per granule is correct, though the post simplifies by calling granules "8192-row blocks" — in practice, the last granule in a part may contain fewer rows, and granularity is configurable.
- ClickHouse also supports `EXPLAIN QUERY TREE` and `EXPLAIN TABLE OVERRIDE` variants not mentioned in the post. These are more specialized and their omission is reasonable for an introductory guide.
- The filter pushdown section is conceptually correct — filters closer to ReadFromMergeTree in the plan are more efficient.
