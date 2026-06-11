# Validation Summary: How to Create Distribution Keys

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon Redshift
- Azure Synapse dedicated SQL pools
- Snowflake
- SQL
- MPP data warehouses

## Sources Consulted
- Amazon Redshift CREATE TABLE documentation: https://docs.aws.amazon.com/redshift/latest/dg/r_CREATE_TABLE_NEW.html
- Amazon Redshift distribution styles documentation: https://docs.aws.amazon.com/redshift/latest/dg/c_choosing_dist_sort.html
- Amazon Redshift distribution style best practices: https://docs.aws.amazon.com/redshift/latest/dg/c_best-practices-best-dist-key.html
- Amazon Redshift query plan redistribution documentation: https://docs.aws.amazon.com/redshift/latest/dg/c_data_redistribution.html
- Amazon Redshift SVV_TABLE_INFO documentation: https://docs.aws.amazon.com/redshift/latest/dg/r_SVV_TABLE_INFO.html
- Amazon Redshift STV_TBL_PERM documentation: https://docs.aws.amazon.com/redshift/latest/dg/r_STV_TBL_PERM.html
- Amazon Redshift STV_BLOCKLIST documentation: https://docs.aws.amazon.com/redshift/latest/dg/r_STV_BLOCKLIST.html
- Amazon Redshift table design best practices: https://docs.aws.amazon.com/redshift/latest/dg/c_designing-tables-best-practices.html
- Snowflake micro-partitions and data clustering documentation: https://docs.snowflake.com/en/user-guide/tables-clustering-micropartitions
- Azure Synapse distributed table design guidance: https://learn.microsoft.com/en-us/azure/synapse-analytics/sql-data-warehouse/sql-data-warehouse-tables-distribute
- Azure Synapse replicated table design guidance: https://learn.microsoft.com/en-us/azure/synapse-analytics/sql-data-warehouse/design-guidance-for-replicated-tables

## Issues Found
- The introduction implied Snowflake uses Redshift-style distribution keys. Updated it to explain that Snowflake automatically micro-partitions table data and that the distribution-key examples are Amazon Redshift examples.
- The distribution style section said there were three main styles. Updated it to note Redshift supports AUTO, KEY, ALL, and EVEN, with AUTO as the default when no style is specified.
- The ALL distribution guidance presented small dimension tables as an unconditional best fit. Adjusted the wording to reflect Redshift's documented storage, load, and maintenance tradeoffs for ALL distribution.
- The KEY distribution diagrams used numeric ranges, which can imply range partitioning. Updated labels to describe hash groups instead.
- The skew-check query used STV_BLOCKLIST row counts as if they were table row counts. Replaced it with STV_TBL_PERM rows per slice, matching the documented system table columns.
- The skew solution diagram recommended composite keys, but Redshift supports only one DISTKEY column. Updated it to recommend a different key or EVEN distribution.
- The low-cardinality-key example said only five nodes would have data. Updated it to say at most five slices receive those hash values.
- The monitoring query selected an owner column from STV_TBL_PERM, but that column is not documented for the view. Removed the invalid column.
- Added a caveat to the surrogate-key example that it is appropriate when join co-location is less important.

## Review Notes
The SQL examples use Redshift-specific DDL and system views. Primary key constraints in Redshift are informational rather than enforced, but their use in the examples is syntactically valid and can provide planner metadata. STV_TBL_PERM and STV_BLOCKLIST visibility can require superuser access; SVV_TABLE_INFO can also require appropriate permissions.
