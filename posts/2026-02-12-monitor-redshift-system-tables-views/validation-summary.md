# Validation Summary: How to Monitor Redshift with System Tables and Views

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Redshift system tables and views
- Amazon Redshift SQL
- Amazon Redshift WLM monitoring
- Amazon Redshift Data API
- AWS Lambda
- Amazon CloudWatch custom metrics
- Python boto3

## Sources Consulted
- Amazon Redshift system tables and views reference: https://docs.aws.amazon.com/redshift/latest/dg/cm_chap_system-tables.html
- Amazon Redshift STL views for logging: https://docs.aws.amazon.com/redshift/latest/dg/c_intro_STL_tables.html
- Amazon Redshift STV_RECENTS: https://docs.aws.amazon.com/redshift/latest/dg/r_STV_RECENTS.html
- Amazon Redshift STL_QUERY: https://docs.aws.amazon.com/redshift/latest/dg/r_STL_QUERY.html
- Amazon Redshift STL_QUERY_METRICS: https://docs.aws.amazon.com/redshift/latest/dg/r_STL_QUERY_METRICS.html
- Amazon Redshift STL_WLM_QUERY: https://docs.aws.amazon.com/redshift/latest/dg/r_STL_WLM_QUERY.html
- Amazon Redshift SVV_TABLE_INFO: https://docs.aws.amazon.com/redshift/latest/dg/r_SVV_TABLE_INFO.html
- Amazon Redshift STV_PARTITIONS: https://docs.aws.amazon.com/redshift/latest/dg/r_STV_PARTITIONS.html
- Amazon Redshift STV_SESSIONS: https://docs.aws.amazon.com/redshift/latest/dg/r_STV_SESSIONS.html
- Amazon Redshift STL_CONNECTION_LOG: https://docs.aws.amazon.com/redshift/latest/dg/r_STL_CONNECTION_LOG.html
- Amazon Redshift SVV_TRANSACTIONS: https://docs.aws.amazon.com/redshift/latest/dg/r_SVV_TRANSACTIONS.html
- boto3 Redshift Data API execute_statement: https://docs.aws.amazon.com/botocore/latest/reference/services/redshift-data/client/execute_statement.html
- boto3 Redshift Data API describe_statement: https://docs.aws.amazon.com/boto3/latest/reference/services/redshift-data/client/describe_statement.html
- boto3 Redshift Data API get_statement_result: https://docs.aws.amazon.com/boto3/latest/reference/services/redshift-data/client/get_statement_result.html

## Issues Found
- STL retention was described as "a few days"; updated it to seven days to match AWS documentation.
- STV_RECENTS examples referenced non-existent `querytxt` and `suspended` columns and treated `query` as a query ID. Updated the examples to use `query` as query text and removed unsupported columns.
- Queued query examples used `status = 'Queued'`, but STV_RECENTS documents `Running` and `Done`; updated queued detection to use `status <> 'Done'` with `stv_inflight`.
- The slow query example referenced a non-existent `stl_query.elapsed` column. Updated sorting to use the computed `DATEDIFF` duration.
- The STL_QUERY_METRICS example referenced non-existent `label`, `bytes`, `elapsed`, and `is_diskbased` columns. Replaced them with documented metrics such as `step_type`, `query_scan_size`, `blocks_to_disk`, and `run_time`.
- The STL_WLM_QUERY example used a non-existent `starttime` column. Updated it to use the documented `queue_start_time` column.
- The table-size example grouped by unsupported STV_BLOCKLIST fields. Replaced it with an SVV_TABLE_INFO query using documented `size` and `tbl_rows` columns.
- STV_PARTITIONS examples filtered on a non-existent `type` column and did not account for `tossed` blocks. Updated disk utilization to use documented columns and AWS's `(used - tossed) / capacity` pattern.
- The maintenance query referenced non-existent `svv_table_info.unsorted_rows` and used `empty`, which AWS documents as internal and no longer used. Updated the query to use documented `unsorted`, `stats_off`, `tbl_rows`, and `size`.
- STL_CONNECTION_LOG history used non-existent `starttime` and `user_name` columns. Updated it to use documented `recordtime` and `username`.
- The lock monitoring example used PG_LOCKS-style column names that did not match the query. Updated it to use Redshift's documented SVV_TRANSACTIONS view.
- The stored procedure repeated the queued query and STV_PARTITIONS issues. Updated those statements.
- The Lambda example imported `redshift_connector` without using it and slept a fixed amount before fetching results. Removed the unused import and added polling with `describe_statement` before `get_statement_result`.

## Review Notes
AWS now recommends SYS monitoring views for many Redshift monitoring queries, especially when supporting both provisioned clusters and Serverless. The post remains technically valid as a system table/view guide, but a future update could add SYS-view equivalents.
