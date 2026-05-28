# Validation Summary: How to Implement Column-Level Data Masking in BigQuery Using Policy Tags and DLP

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google BigQuery
- BigQuery data masking
- BigQuery policy tags and column-level access control
- BigQuery Data Policy API
- Data Catalog policy tag taxonomy API
- Cloud DLP / Sensitive Data Protection
- GoogleSQL
- Python Google Cloud client libraries

## Sources Consulted
- BigQuery data masking overview: https://cloud.google.com/bigquery/docs/column-data-masking-intro
- BigQuery mask column data guide: https://cloud.google.com/bigquery/docs/column-data-masking
- BigQuery Data Policy API reference: https://cloud.google.com/bigquery/docs/reference/bigquerydatapolicy/rest
- BigQuery Data Policy REST dataPolicies resource: https://docs.cloud.google.com/bigquery/docs/reference/bigquerydatapolicy/rest/v1/projects.locations.dataPolicies
- Data Catalog taxonomy REST resource: https://docs.cloud.google.com/data-catalog/docs/reference/rest/v1/projects.locations.taxonomies
- Data Catalog policyTags create method: https://cloud.google.com/data-catalog/docs/reference/rest/v1/projects.locations.taxonomies.policyTags/create
- Dataplex transition notes for policy tags: https://docs.cloud.google.com/dataplex/docs/transition-to-dataplex-catalog
- Google Cloud CLI policy tag IAM binding reference: https://docs.cloud.google.com/sdk/gcloud/reference/data-catalog/taxonomies/policy-tags/add-iam-policy-binding
- BigQuery table and column options reference: https://docs.cloud.google.com/bigquery/docs/tables
- BigQuery INFORMATION_SCHEMA JOBS view: https://docs.cloud.google.com/bigquery/docs/information-schema-jobs
- Cloud DLP BigQueryOptions Python reference: https://docs.cloud.google.com/python/docs/reference/dlp/latest/google.cloud.dlp_v2.types.BigQueryOptions

## Issues Found
- The post said users with neither Fine Grained Reader nor Masked Reader see `NULL`. BigQuery documentation says they receive a permission error for secured columns, so the access description and output example were corrected.
- The taxonomy and data policy examples used unsupported or undocumented `gcloud` commands for taxonomy creation, policy tag creation, and BigQuery data policy creation. These were replaced with authenticated REST API examples against the documented Data Catalog and BigQuery Data Policy APIs.
- The Python data policy example was described as a Cloud DLP custom transformation, but BigQuery data masking uses predefined masking expressions or BigQuery custom masking routines. The section was corrected to describe `LAST_FOUR_CHARACTERS` as a predefined BigQuery masking expression and to include the required `data_policy_id`.
- The BigQuery `policy_tags` SQL examples used a scalar string. BigQuery exposes `policy_tags` as an array option, so the examples were changed to `policy_tags = ['...']`.
- The sample table used an email policy tag on a `full_name` column while the masking rule was email-specific. The example column and output were changed to `email`.
- The monitoring query mixed Cloud Audit Logs fields with `INFORMATION_SCHEMA.JOBS`, which would not run. It now uses documented `JOBS_BY_PROJECT` columns such as `user_email`, `creation_time`, `query`, and `referenced_tables`.
- The Cloud DLP section said DLP suggests policy tags. This was narrowed to say DLP identifies columns that need policy tags.

## Review Notes
- Data Catalog itself is deprecated in favor of Dataplex Universal Catalog, but Google documentation notes that policy tags and policy tag taxonomies used for BigQuery column-level access control are not deprecated. Future updates should watch for changes in the recommended management API surface.
- The `setIamPolicy` example demonstrates the data policy IAM endpoint but should be merged with existing bindings in a production script to avoid replacing other bindings.
