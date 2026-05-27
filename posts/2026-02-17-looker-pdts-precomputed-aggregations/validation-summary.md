# Validation Summary: How to Set Up Looker PDTs for Precomputed Aggregations

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Looker
- LookML
- Persistent Derived Tables (PDTs)
- Datagroups
- Incremental PDTs
- Looker API 4.0
- BigQuery Standard SQL
- BigQuery INFORMATION_SCHEMA

## Sources Consulted
- Looker `datagroup_trigger` parameter: https://docs.cloud.google.com/looker/docs/reference/param-view-datagroup-trigger
- Looker `datagroup` parameter: https://docs.cloud.google.com/looker/docs/reference/param-model-datagroup
- Looker derived tables and PDT regenerator documentation: https://docs.cloud.google.com/looker/docs/derived-tables
- Looker incremental PDTs: https://docs.cloud.google.com/looker/docs/incremental-pdts
- Looker `increment_key` parameter: https://docs.cloud.google.com/looker/docs/reference/param-view-increment-key
- Looker `increment_offset` parameter: https://docs.cloud.google.com/looker/docs/reference/param-view-increment-offset
- Looker `partition_keys` parameter: https://docs.cloud.google.com/looker/docs/reference/param-view-partition-keys
- Looker `cluster_keys` parameter: https://docs.cloud.google.com/looker/docs/reference/param-view-cluster-keys
- Looker Persistent Derived Tables admin page: https://docs.cloud.google.com/looker/docs/admin-panel-database-pdts
- Looker API derived table graph endpoint: https://cloud.google.com/looker/docs/reference/looker-api/latest/methods/DerivedTable/graph_derived_tables_for_model
- Looker API authentication: https://cloud.google.com/looker/docs/api-auth
- BigQuery INFORMATION_SCHEMA JOBS view: https://cloud.google.com/bigquery/docs/information-schema-jobs

## Issues Found
- The SQL-based incremental PDT example used `{% date_start order_date %}` and `{% date_end order_date %}` as the incremental boundary. Looker documentation requires SQL-based incremental PDTs to use the `{% incrementcondition %}` Liquid tag against the underlying database time column. I changed the example to filter on `{% incrementcondition %} orders.created_at {% endincrementcondition %}`.
- The monitoring section described "next scheduled build" and the API example as a way to list PDT builds. The current Looker PDT admin page exposes last attempt status, build timing, persistence rule, last checked time, and trigger details, while the API endpoint returns a dependency graph with optional status colors. I updated the wording and added `?color=true` to the API example.

## Review Notes
- The BigQuery `partition_keys`, `cluster_keys`, and `INFORMATION_SCHEMA.JOBS` examples match the current documented syntax. BigQuery PDT partitioning supports only one date/time partition key.
- The `unique_customers` rollup pattern is only additive at the grain of the PDT. If users aggregate across `product_category` or other dimensions, summed distinct counts can overcount customers. This is a modeling caveat rather than a syntax error.
