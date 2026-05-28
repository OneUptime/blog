# Validation Summary: How to Create and Manage Secondary Indexes in Cloud Spanner

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- Google Cloud Spanner
- GoogleSQL DDL
- Cloud Spanner secondary indexes
- Google Cloud CLI (`gcloud spanner`)

## Sources Consulted
- Cloud Spanner secondary indexes: https://docs.cloud.google.com/spanner/docs/secondary-indexes
- Cloud Spanner GoogleSQL DDL reference: https://docs.cloud.google.com/spanner/docs/reference/standard-sql/data-definition-language
- Cloud Spanner schema updates: https://docs.cloud.google.com/spanner/docs/schema-updates
- Cloud Spanner quotas and limits: https://docs.cloud.google.com/spanner/quotas
- `gcloud spanner databases ddl describe` reference: https://docs.cloud.google.com/sdk/gcloud/reference/spanner/databases/ddl/describe
- `gcloud spanner operations list` reference: https://cloud.google.com/sdk/gcloud/reference/spanner/operations/list
- `gcloud spanner operations describe` reference: https://docs.cloud.google.com/sdk/gcloud/reference/spanner/operations/describe

## Issues Found
- The `NULL_FILTERED` index example referenced `LastLoginAt`, but the sample `Users` table did not define that column. Added `LastLoginAt TIMESTAMP` to the table definition so the example DDL is valid.
- The `STORING` example reused the `UsersByEmail` index name that had already been used earlier in the post. Renamed the covering index to `UsersByEmailCovering` to avoid a duplicate index name.
- The index creation section said the `CREATE INDEX` statement will not return until backfill is complete. Clarified that the schema update operation is not complete until backfill completes, while APIs and tools can expose it as a long-running operation.
- The operations command was described as showing index creation progress, but `gcloud spanner operations list` is used to find the operation ID and `gcloud spanner operations describe` shows the progress section. Updated the command block accordingly and added `--type=DATABASE_UPDATE_DDL`.
- The post said there is no hard limit on indexes. Cloud Spanner documents schema limits for indexes, including indexes per database and per table. Reworded the statement to distinguish documented limits from workload-dependent practical limits.

## Review Notes
The examples use GoogleSQL syntax. For Cloud Spanner PostgreSQL-dialect databases, stored columns and null-filtered indexes use different syntax (`INCLUDE` and `WHERE ... IS NOT NULL`), which could be mentioned in a future dialect-specific expansion.
