# Validation Summary: How to Use Redshift Materialized Views

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Redshift
- Redshift materialized views
- Redshift SQL
- Redshift system tables and views
- AWS Lambda
- Redshift Data API
- Amazon EventBridge scheduling

## Sources Consulted
- Amazon Redshift documentation: Materialized views in Amazon Redshift - https://docs.aws.amazon.com/redshift/latest/dg/materialized-view-overview.html
- Amazon Redshift documentation: CREATE MATERIALIZED VIEW - https://docs.aws.amazon.com/redshift/latest/dg/materialized-view-create-sql-command.html
- Amazon Redshift documentation: Refreshing a materialized view - https://docs.aws.amazon.com/redshift/latest/dg/materialized-view-refresh.html
- Amazon Redshift documentation: STV_MV_INFO - https://docs.aws.amazon.com/redshift/latest/dg/r_STV_MV_INFO.html
- Amazon Redshift documentation: SVL_MV_REFRESH_STATUS - https://docs.aws.amazon.com/redshift/latest/dg/r_SVL_MV_REFRESH_STATUS.html
- Amazon Redshift documentation: ALTER MATERIALIZED VIEW - https://docs.aws.amazon.com/redshift/latest/dg/r_ALTER_MATERIALIZED_VIEW.html
- Amazon Redshift documentation: Date and time functions - https://docs.aws.amazon.com/redshift/latest/dg/Date_functions_header.html
- OneUptime blog link target - https://oneuptime.com/blog/post/2026-02-06-aws-cloudwatch-logs-exporter-opentelemetry-collector/view

## Issues Found
- The manual refresh example described `REFRESH MATERIALIZED VIEW` as a full refresh. Redshift automatically chooses incremental refresh when the materialized view is eligible, so the comment was corrected.
- The `svl_mv_refresh_status` query used columns that are not in the documented view (`state`, `autorefresh`, `last_refresh_time`). It now uses documented columns: `status`, `refresh_type`, `starttime`, and `endtime`.
- The incremental refresh section incorrectly said HAVING and external tables broadly prevent incremental refresh and implied a non-existent `is_incremental` column. It now describes the documented eligibility rules and checks `stv_mv_info.state`, where `1` means incremental and `0` means full recompute.
- The nested materialized view section omitted Redshift's documented `CASCADE` behavior for refreshing nested MVs. Added a brief note to refresh in dependency order or use `CASCADE` on the top-level view.
- Several dashboard examples used `AUTO REFRESH YES` with `CURRENT_DATE`, a mutable date expression. Redshift does not allow `AUTO REFRESH YES` when an MV definition includes mutable functions, so auto-refresh was removed from those examples.
- The management section used `pg_matviews`, which is not the Redshift-documented way to monitor materialized views. It now uses `stv_mv_info` and `pg_get_viewdef`, matching AWS documentation examples.
- The limitations section overstated external table restrictions and understated incremental-refresh restrictions. It now distinguishes external table support, auto-refresh restrictions, and incremental-refresh restrictions.

## Review Notes
The performance numbers are illustrative and depend on data volume, distribution, sort keys, workload, and cluster or workgroup capacity. The AWS Lambda example is plausible for Redshift Serverless because it uses `WorkgroupName`; provisioned clusters would use `ClusterIdentifier` instead.
