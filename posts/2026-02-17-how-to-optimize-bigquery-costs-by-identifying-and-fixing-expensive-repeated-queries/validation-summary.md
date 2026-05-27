# Validation Summary: How to Optimize BigQuery Costs by Identifying

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google BigQuery
- BigQuery INFORMATION_SCHEMA
- GoogleSQL
- BigQuery materialized views
- BigQuery query cache
- BigQuery partitioned and clustered tables
- BigQuery custom query quotas
- BigQuery reservations and capacity-based pricing

## Sources Consulted
- BigQuery pricing: https://cloud.google.com/bigquery/pricing
- BigQuery INFORMATION_SCHEMA JOBS view: https://cloud.google.com/bigquery/docs/information-schema-jobs
- BigQuery cached query results: https://docs.cloud.google.com/bigquery/docs/cached-results
- BigQuery materialized views: https://docs.cloud.google.com/bigquery/docs/materialized-views-create
- BigQuery materialized view DDL: https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/data-definition-language#create_materialized_view_statement
- BigQuery partitioned tables: https://docs.cloud.google.com/bigquery/docs/partitioned-tables
- Managing BigQuery partitioned tables: https://docs.cloud.google.com/bigquery/docs/managing-partitioned-tables
- BigQuery clustered tables: https://docs.cloud.google.com/bigquery/docs/clustered-tables
- BigQuery custom query quotas: https://docs.cloud.google.com/bigquery/docs/custom-quotas
- gcloud alpha services quota update reference: https://cloud.google.com/sdk/gcloud/reference/alpha/services/quota/update

## Issues Found
- BigQuery on-demand pricing was described as "$6.25 per TB"; updated to "$6.25 per TiB" for regions such as the US multi-region, matching Google pricing units and the post's `POWER(1024, 4)` calculations.
- Several query aliases used `tb` or `gb` while dividing by powers of 1024; updated them to `tib` and `gib`.
- The repeated-query normalization comment said parameters were removed, but the SQL only normalizes whitespace; corrected the comment.
- The partition-filter discovery query implied it could prove filters were missing; changed the wording to make it a candidate query that requires reviewing `query_preview`.
- The materialized view example used `COUNT(DISTINCT user_id)`, which is not in the documented supported aggregate list for standard BigQuery materialized views; changed it to `APPROX_COUNT_DISTINCT(user_id)`.
- The clustering example filtered only on the second clustering column; added a `user_id` filter so the example demonstrates filtering on the leading clustered column.
- The custom quota section implied quotas can be assigned to a specific user; corrected it to explain that user-level custom quotas apply separately to every user or service account in the project and cannot target one named user.
- The project-level quota example used an unverified `gcloud` command; replaced it with the documented Google Cloud console/API guidance for BigQuery custom quotas.
- The flat-rate pricing section used outdated terminology and a fixed cost threshold; updated it to capacity-based pricing and current BigQuery reservations guidance.

## Review Notes
The cost calculations are estimates and assume on-demand analysis pricing in regions where the documented price is $6.25 per TiB. Actual billing can vary by region, free tier, BigQuery ML operations, reservations, and other pricing details.
