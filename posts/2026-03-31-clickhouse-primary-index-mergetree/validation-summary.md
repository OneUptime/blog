# Validation Summary: How to Use Primary Index in ClickHouse MergeTree

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree engine)
- ClickHouse sparse primary indexes
- ClickHouse SQL (CREATE TABLE, EXPLAIN, system.parts)

## Sources Consulted
- ClickHouse official documentation: Sparse Primary Indexes guide (https://clickhouse.com/docs/en/optimize/sparse-primary-indexes)
- ClickHouse official documentation: MergeTree engine reference (https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree)

## Issues Found

### 1. Cardinality ordering advice was reversed
- **What was wrong:** The "Cardinality and Column Order" section advised putting the "highest-cardinality column that you frequently filter on first." This directly contradicts the official ClickHouse documentation, which recommends ascending cardinality (lowest cardinality first) for compound primary keys. Ascending cardinality produces more contiguous value groupings, better granule skipping, and improved compression.
- **What was changed:** Updated the bullet points to recommend putting frequently filtered columns first and ordering by ascending cardinality (lowest first). Updated the tenant_id example comment to correctly explain that tenant_id goes first because it has lower cardinality than ts, not because it has high cardinality. Also fixed the Summary section which repeated the "highest-cardinality first" advice.
- **Why:** The official ClickHouse sparse primary indexes guide explicitly demonstrates that ascending cardinality order outperforms descending cardinality order in both query speed and compression.

## Review Notes
- The post describes the primary index as mapping "the minimum value of each granule" to offsets. More precisely, the index stores the primary key column values of the first row of each granule. Since data is sorted by the primary key, the first row's values are effectively the minimum within the granule, so this description is functionally correct but slightly imprecise.
- The `primary_key_bytes_in_memory` column used in the "Viewing the Index File" query exists in `system.parts` but is not prominently documented on the MergeTree reference page. It works in practice.
- All SQL syntax (CREATE TABLE, EXPLAIN indexes = 1, system.parts queries) is correct and current.
- The explanation of PRIMARY KEY as a prefix of ORDER BY is accurate.
- The skip index recommendation (set, minmax) for non-primary-key columns is correct.
