# Validation Summary: How to Troubleshoot BigQuery BI Engine Cache Hit Rate Low

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Google Cloud BigQuery
- BigQuery BI Engine
- BigQuery INFORMATION_SCHEMA views
- GoogleSQL DDL
- BigQuery performance monitoring

## Sources Consulted
- BigQuery BI Engine monitoring: https://docs.cloud.google.com/bigquery/docs/bi-engine-monitor
- BigQuery BI Engine capacity reservations: https://docs.cloud.google.com/bigquery/docs/bi-engine-reserve-capacity
- BigQuery BI Engine introduction and limitations: https://docs.cloud.google.com/bigquery/docs/bi-engine-intro
- BigQuery INFORMATION_SCHEMA.BI_CAPACITIES view: https://docs.cloud.google.com/bigquery/docs/information-schema-bi-capacities
- BigQuery REST Job resource, BiEngineStatistics and BiEngineReason enums: https://docs.cloud.google.com/bigquery/docs/reference/rest/v2/Job
- GoogleSQL DDL reference for ALTER BI_CAPACITY: https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/data-definition-language
- bq command-line tool reference: https://docs.cloud.google.com/bigquery/docs/reference/bq-cli-reference

## Issues Found
- The original status check used `bq ls --reservation` and `bq show --reservation`, which refer to BigQuery slot reservations rather than the documented BI Engine capacity verification path. Replaced this with a query against `INFORMATION_SCHEMA.BI_CAPACITIES`.
- The original query examples used `INFORMATION_SCHEMA.JOBS`; Google documents BI Engine statistics as part of the `INFORMATION_SCHEMA.JOBS_BY_*` views. Updated the examples to use `JOBS_BY_PROJECT`.
- The original text described `acceleration_mode` as having `FULL`, `PARTIAL`, and `DISABLED` values. Those are `bi_engine_mode` values; `acceleration_mode` uses values such as `FULL_QUERY`, `FULL_INPUT`, `PARTIAL_INPUT`, and `BI_ENGINE_DISABLED`. Updated the explanation.
- The original reason-code list included unsupported codes such as `TABLE_TOO_LARGE` and `OTHER_BILLING_ACCOUNT`. Replaced them with documented `BiEngineReason` codes.
- The original BI Engine capacity update commands used non-documented flags such as `--bi_engine_preferred_tables` and `--reservation_size`. Replaced them with documented `ALTER BI_CAPACITY ... SET OPTIONS` examples.
- The unsupported-feature list included unsupported or misleading examples. Updated it to match the current BI Engine limitations documented by Google Cloud.

## Review Notes
The post is technically relevant and now aligns with the current Google Cloud BI Engine documentation. The local environment did not have the `bq` CLI installed, so CLI checks were performed against official documentation rather than local `bq help` output.
