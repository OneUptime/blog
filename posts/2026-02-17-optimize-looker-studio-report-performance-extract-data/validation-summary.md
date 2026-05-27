# Validation Summary: How to Optimize Looker Studio Report Performance with Extract Data Sources

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Looker Studio
- Looker Studio data extracts
- BigQuery
- BigQuery BI Engine
- BigQuery partitioning and clustering
- BigQuery INFORMATION_SCHEMA views
- Google Cloud CLI / BigQuery CLI

## Sources Consulted
- Looker Studio Extract Data documentation: https://docs.cloud.google.com/looker/docs/studio/extract-data-for-faster-performance
- Looker Studio BigQuery connector documentation: https://docs.cloud.google.com/looker/docs/studio/connect-to-google-bigquery
- Looker Studio data freshness documentation: https://docs.cloud.google.com/looker/docs/studio/manage-data-freshness
- BigQuery BI Engine introduction: https://cloud.google.com/bigquery/docs/bi-engine-intro
- BigQuery BI Engine reservation documentation: https://cloud.google.com/bigquery/docs/bi-engine-reserve-capacity
- BigQuery BI Engine INFORMATION_SCHEMA documentation: https://cloud.google.com/bigquery/docs/information-schema-bi-capacities
- BigQuery partitioned table documentation: https://cloud.google.com/bigquery/docs/creating-column-partitions
- BigQuery clustered table documentation: https://cloud.google.com/bigquery/docs/clustered-tables
- BigQuery INFORMATION_SCHEMA JOBS documentation: https://cloud.google.com/bigquery/docs/information-schema-jobs
- BigQuery Standard SQL query syntax documentation: https://cloud.google.com/bigquery/docs/reference/standard-sql/query-syntax

## Issues Found
- The post stated that extracts support a maximum of 100 million rows. Official Looker Studio documentation lists extract limits as 100 MB and 750,000 rows, so the limitation section was corrected.
- The post stated that extracts do not support custom SQL and must use a table or view. Looker Studio extracts are created from an existing data source, so the wording was changed to avoid incorrectly ruling out source-level query shaping.
- The BI Engine description described it primarily as a query-result cache that intercepts queries. Official BigQuery documentation describes BI Engine as an in-memory analysis service with caching and vectorized execution, so the explanation was corrected.
- The BI Engine creation command used unsupported `bq mk --bi_reservation --size` syntax. It was changed to the documented `bq update --bi_reservation_size` form.
- The BI Engine monitoring command used unsupported `bq show --bi_reservation` syntax. It was replaced with a query against `INFORMATION_SCHEMA.BI_CAPACITIES`.
- The BI Engine sizing guidance overclaimed that 1 GB is enough for dashboards querying up to a few hundred million rows. It was softened to describe 1 GB as suitable for small aggregated datasets or initial testing.
- The caching section said Looker Studio has an approximately 15-minute TTL. Official Looker Studio data freshness documentation lists BigQuery's default freshness as 12 hours with configurable minute/hour options, so the section was corrected.
- The dynamic date range guidance said "Last 7 days" always misses the cache. The wording was softened because cache reuse depends on the effective query and freshness settings.
- The INFORMATION_SCHEMA query filtered for service-account-style `user_email` values. Looker Studio BigQuery jobs can appear under viewer credentials or owner credentials depending on data source settings, so that overly specific filter was removed.

## Review Notes
The SQL examples for partitioning, clustering, aggregation, date filtering, and INFORMATION_SCHEMA job analysis are syntactically valid BigQuery Standard SQL examples. The guidance remains high-level; exact BI Engine reservation sizing should be based on monitored reservation usage and workload characteristics.
