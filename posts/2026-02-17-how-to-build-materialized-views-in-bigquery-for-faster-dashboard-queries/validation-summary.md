# Validation Summary: How to Build Materialized Views in BigQuery for Faster Dashboard Queries

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud BigQuery
- BigQuery materialized views
- GoogleSQL
- BigQuery `bq` command-line tool
- BigQuery INFORMATION_SCHEMA

## Sources Consulted
- BigQuery materialized views introduction: https://docs.cloud.google.com/bigquery/docs/materialized-views-intro
- BigQuery create materialized views documentation: https://cloud.google.com/bigquery/docs/materialized-views-create
- BigQuery use materialized views documentation: https://cloud.google.com/bigquery/docs/materialized-views-use
- BigQuery manage materialized views documentation: https://cloud.google.com/bigquery/docs/materialized-views-manage
- BigQuery INFORMATION_SCHEMA MATERIALIZED_VIEWS documentation: https://docs.cloud.google.com/bigquery/docs/information-schema-materialized-views
- BigQuery pricing documentation: https://cloud.google.com/bigquery/pricing

## Issues Found
- Replaced `COUNT(DISTINCT ...)` in materialized view examples with `APPROX_COUNT_DISTINCT(...)`, because BigQuery materialized views support a limited aggregate function set that includes `APPROX_COUNT_DISTINCT` but not exact `COUNT(DISTINCT ...)` as shown.
- Corrected the dashboard query optimization example so it describes directly querying the materialized view instead of claiming automatic rewrite while the SQL already referenced the materialized view.
- Corrected partitioning language. BigQuery materialized views do not simply inherit partitioning; partitioned materialized views are explicitly partitioned and aligned with the base table partitioning column.
- Updated the supported and unsupported operations lists to remove exact `COUNT DISTINCT`, narrow unsupported subqueries to `ARRAY` subqueries, and reflect current join limitations including preview LEFT OUTER JOIN support and non-incremental materialized views.
- Updated manual refresh commands to pass a backtick-qualified materialized view name to `BQ.REFRESH_MATERIALIZED_VIEW`, matching the documented system procedure usage and handling the hyphenated project ID.
- Recalculated the cost comparison using current BigQuery on-demand pricing of about $6.25 per TiB, and changed TB/GB labels to TiB/GiB to match pricing units.
- Reworded the common smart tuning issue from "not disabled" to checking materialized-view eligibility, because smart tuning has documented eligibility requirements and exclusions.

## Review Notes
The examples remain intentionally simplified. In a production dashboard, users should also verify refresh maintenance costs, storage costs, IAM requirements, and whether smart tuning applies to their exact query shape.
