# Validation Summary: How to Optimize Query Performance in Azure Synapse Dedicated SQL Pool

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Azure Synapse Analytics dedicated SQL pool
- T-SQL
- Dedicated SQL pool table distribution strategies
- Hash, round-robin, and replicated tables
- CREATE TABLE AS SELECT (CTAS)
- Dedicated SQL pool execution plans and data movement

## Sources Consulted
- Microsoft Learn: Guidance for designing distributed tables using dedicated SQL pool in Azure Synapse Analytics: https://learn.microsoft.com/en-us/azure/synapse-analytics/sql-data-warehouse/sql-data-warehouse-tables-distribute
- Microsoft Learn: Design tables using Synapse SQL pool: https://learn.microsoft.com/en-us/azure/synapse-analytics/sql/develop-tables-overview
- Microsoft Learn: DBCC PDW_SHOWSPACEUSED (Transact-SQL): https://learn.microsoft.com/en-us/sql/t-sql/database-console-commands/dbcc-pdw-showspaceused-transact-sql
- Microsoft Learn: sys.pdw_table_distribution_properties (Transact-SQL): https://learn.microsoft.com/en-us/sql/relational-databases/system-catalog-views/sys-pdw-table-distribution-properties-transact-sql
- Microsoft Learn: sys.dm_db_partition_stats / sys.dm_pdw_nodes_db_partition_stats (Transact-SQL): https://learn.microsoft.com/en-us/sql/relational-databases/system-dynamic-management-views/sys-dm-db-partition-stats-transact-sql
- Microsoft Learn: EXPLAIN (Transact-SQL): https://learn.microsoft.com/en-us/sql/t-sql/queries/explain-transact-sql
- Microsoft Learn: CREATE TABLE AS SELECT for Azure Synapse Analytics: https://learn.microsoft.com/en-us/sql/t-sql/statements/create-table-as-select-azure-sql-data-warehouse
- Microsoft Learn: Design guidance for replicated tables in Synapse SQL pool: https://learn.microsoft.com/en-us/azure/synapse-analytics/sql-data-warehouse/design-guidance-for-replicated-tables

## Issues Found
- The round-robin explanation and diagram implied deterministic row placement. Microsoft documents round-robin placement as even but not tied to column values, and rows with equal values are not guaranteed to be placed together. Updated the description and diagram labels to avoid implying modulo-style placement.
- The hash distribution diagram implied simple numeric modulo placement for CustomerId values. Azure Synapse uses a deterministic hash function, so the diagram labels were changed to generic hashed-value examples.
- The post stated that both round-robin tables must be shuffled for a join. Microsoft documentation says round-robin joins usually require reshuffling rows, so the wording was softened to avoid an absolute claim.
- The post said to always use HASH distribution on fact tables. Microsoft guidance recommends hash distribution for fact tables when an appropriate distribution column exists, so the wording was changed to reflect that condition.
- The replicated dimension guidance used "under a few hundred MB" and said replication eliminates joins. Microsoft guidance says replicated tables work best under 2 GB compressed and eliminate data movement for joins, not the joins themselves. Updated the statement.
- The post said two tables distributed on the same key always join locally. Microsoft guidance requires matching data types and an equals join operator, so the caveat was added.
- The skew-detection query incorrectly used `sys.pdw_table_distribution_properties` for per-distribution row counts. That catalog view stores distribution policy metadata, not distribution row counts. Replaced the query with `sys.dm_pdw_nodes_db_partition_stats`, grouping by `distribution_id`.
- The skew remediation advice recommended a computed composite column. Current Azure Synapse guidance supports multi-column HASH distribution with compatibility level 50, so the advice was updated to recommend multi-column HASH distribution where enabled.

## Review Notes
The CTAS example, `RENAME OBJECT` workflow, `DBCC PDW_SHOWSPACEUSED` usage, and `EXPLAIN` example are consistent with Microsoft documentation for dedicated SQL pool. Multi-column HASH distribution requires the appropriate dedicated SQL pool compatibility setting, which is now noted briefly in the remediation advice.
