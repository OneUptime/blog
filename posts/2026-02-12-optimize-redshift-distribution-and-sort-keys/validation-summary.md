# Validation Summary: How to Optimize Redshift Distribution and Sort Keys

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon Redshift
- Redshift SQL DDL
- Redshift distribution styles and distribution keys
- Redshift compound and interleaved sort keys
- Redshift system views
- Redshift VACUUM maintenance

## Sources Consulted
- Amazon Redshift distribution styles: https://docs.aws.amazon.com/redshift/latest/dg/c_choosing_dist_sort.html
- Amazon Redshift CREATE TABLE syntax: https://docs.aws.amazon.com/redshift/latest/dg/r_CREATE_TABLE_NEW.html
- Amazon Redshift sort keys: https://docs.aws.amazon.com/redshift/latest/dg/t_Sorting_data.html
- Amazon Redshift VACUUM command: https://docs.aws.amazon.com/redshift/latest/dg/r_VACUUM_command.html
- Amazon Redshift vacuuming tables and automatic table sort: https://docs.aws.amazon.com/redshift/latest/dg/t_Reclaiming_storage_space202.html
- Amazon Redshift SVV_TABLE_INFO: https://docs.aws.amazon.com/redshift/latest/dg/r_SVV_TABLE_INFO.html
- Amazon Redshift SVV_DISKUSAGE: https://docs.aws.amazon.com/redshift/latest/dg/r_SVV_DISKUSAGE.html
- Amazon Redshift SVL_QUERY_SUMMARY: https://docs.aws.amazon.com/redshift/latest/dg/r_SVL_QUERY_SUMMARY.html
- Amazon Redshift query summary guidance: https://docs.aws.amazon.com/redshift/latest/dg/using-SVL-Query-Summary.html
- Amazon Redshift STL_BCAST: https://docs.aws.amazon.com/redshift/latest/dg/r_STL_BCAST.html

## Issues Found
- The post described distribution as assigning rows only to compute nodes. Amazon Redshift documentation describes distribution across node slices, with matching distribution key values placed on the same node slice. Updated the wording from nodes to node slices/slices where precision matters.
- The `SVV_DISKUSAGE` example selected one row per block and labeled `num_values` as a slice row count. `SVV_DISKUSAGE` contains block-level rows, so the example now aggregates `SUM(num_values)` by slice and filters to one user column with `col = 0`.
- The `DISTSTYLE ALL` example described a table size threshold as if it were a firm rule. AWS documentation frames `ALL` as appropriate for relatively slow-moving tables where the join benefit outweighs storage and maintenance cost, so the example comments were adjusted.
- The interleaved sort key warning said every batch requires `VACUUM REINDEX`. AWS documentation says interleaved sort keys add load/vacuum overhead and that `VACUUM REINDEX` is specifically for reanalyzing interleaved sort key distribution. Updated the wording to avoid overstating the requirement.
- The vacuum warning said Redshift does not automatically re-sort new data. Current AWS documentation says Amazon Redshift automatically sorts table data in the background, reducing the need for manual `VACUUM`, while manual vacuum can still be useful when data must be fully sorted after a large load. Updated the maintenance guidance.

## Review Notes
The SQL DDL examples for `DISTSTYLE`, `DISTKEY`, `COMPOUND SORTKEY`, `INTERLEAVED SORTKEY`, and `VACUUM SORT ONLY`/`VACUUM FULL` are syntactically consistent with current Amazon Redshift documentation. `SVV_TABLE_INFO` and `SVL_QUERY_SUMMARY` are valid system views for the examples shown, with the caveat that AWS now recommends the newer `SYS` monitoring views for easier-to-use query monitoring in some cases.
