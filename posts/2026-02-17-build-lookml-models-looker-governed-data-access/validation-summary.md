# Validation Summary: How to Build LookML Models in Looker for Governed Data Access

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Looker
- LookML
- Google BigQuery
- Data modeling
- Data governance
- Persistent derived tables
- Looker access grants
- Git-based LookML project workflow

## Sources Consulted
- Google Cloud Looker documentation: LookML `dimension_group` parameter - https://cloud.google.com/looker/docs/reference/param-field-dimension-group
- Google Cloud Looker documentation: LookML `include` parameter - https://cloud.google.com/looker/docs/reference/param-model-include
- Google Cloud Looker documentation: LookML `always_filter` parameter - https://cloud.google.com/looker/docs/reference/param-explore-always-filter
- Google Cloud Looker documentation: LookML `sql_always_where` parameter - https://cloud.google.com/looker/docs/reference/param-explore-sql-always-where
- Google Cloud Looker documentation: LookML `access_grant` parameter - https://cloud.google.com/looker/docs/reference/param-model-access-grant
- Google Cloud Looker documentation: LookML `required_access_grants` for fields and views - https://cloud.google.com/looker/docs/reference/param-field-required-access-grants and https://cloud.google.com/looker/docs/reference/param-view-required-access-grants
- Google Cloud Looker documentation: LookML `tags` parameter for fields - https://cloud.google.com/looker/docs/reference/param-field-tags
- Google Cloud Looker documentation: LookML `derived_table` and `datagroup_trigger` parameters - https://cloud.google.com/looker/docs/reference/param-view-derived-table and https://cloud.google.com/looker/docs/reference/param-view-datagroup-trigger
- Google Cloud Looker documentation: LookML `datagroup` parameter - https://cloud.google.com/looker/docs/reference/param-model-datagroup
- Google Cloud Looker documentation: Looker filter expressions - https://cloud.google.com/looker/docs/filter-expressions
- GoogleSQL for BigQuery documentation: date functions - https://cloud.google.com/bigquery/docs/reference/standard-sql/date_functions

## Issues Found
- The `orders` view did not define `product_id`, but the model joined `products` on `${orders.product_id}`. Added a hidden `product_id` dimension so the join reference resolves.
- The `daily_datagroup` used by the derived table's `datagroup_trigger` was not defined. Added a model-level `datagroup: daily_datagroup` with `interval_trigger: "24 hours"`.
- The comment on the `tags` parameter implied that tags control access grants. Looker field tags are metadata for integrations and API consumers, not access control. Updated the comment to clarify that access is enforced later with `required_access_grants`.
- The model comment said `sql_always_where` showed the last two years "by default." Official Looker docs describe `sql_always_where` as a non-removable query restriction. Updated the comment to say it restricts all queries.
- The BigQuery derived table used `DATE_DIFF(MAX(created_at), MIN(created_at), DAY)`. If `created_at` is a timestamp, this is invalid for `DATE_DIFF`; updated it to cast both expressions with `DATE(...)`.

## Review Notes
The post is technically sound after the fixes. The snippets remain illustrative and assume matching source tables, a valid BigQuery connection, and a compatible `products` view. In a production model, access grants should be defined in model files and sensitive fields should consistently use `required_access_grants`, not only metadata tags.
