# Validation Summary: How to Handle Cloud Spanner Database

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud Spanner
- Google Cloud CLI
- GoogleSQL
- Python Cloud Spanner client library
- Go Cloud Spanner client library
- Cloud Monitoring

## Sources Consulted
- Google Cloud Spanner instance creation and scaling documentation: https://docs.cloud.google.com/spanner/docs/create-manage-instances
- Google Cloud SDK reference for `gcloud spanner instances create`: https://docs.cloud.google.com/sdk/gcloud/reference/spanner/instances/create
- Google Cloud SDK reference for `gcloud spanner backups create`: https://docs.cloud.google.com/sdk/gcloud/reference/spanner/backups/create
- Google Cloud SDK reference for `gcloud spanner databases restore`: https://docs.cloud.google.com/sdk/gcloud/reference/spanner/databases/restore
- Google Cloud SDK reference for `gcloud spanner databases execute-sql`: https://docs.cloud.google.com/sdk/gcloud/reference/spanner/databases/execute-sql
- Cloud Spanner GoogleSQL DDL reference: https://docs.cloud.google.com/spanner/docs/reference/standard-sql/data-definition-language
- Cloud Spanner secondary indexes documentation: https://docs.cloud.google.com/spanner/docs/secondary-indexes
- Cloud Spanner table sizes statistics documentation: https://docs.cloud.google.com/spanner/docs/introspection/table-sizes-statistics
- Cloud Spanner CPU utilization documentation: https://docs.cloud.google.com/spanner/docs/cpu-utilization
- Cloud Spanner commit timestamps documentation: https://docs.cloud.google.com/spanner/docs/commit-timestamp
- Cloud Spanner Python getting started guide and samples: https://docs.cloud.google.com/spanner/docs/getting-started/python
- Cloud Spanner Go client package documentation: https://docs.cloud.google.com/go/docs/reference/cloud.google.com/go/spanner/latest
- Cloud Spanner NUMERIC data type documentation: https://docs.cloud.google.com/spanner/docs/working-with-numerics
- Spanner CLI commands documentation for `EXPLAIN` and `EXPLAIN ANALYZE`: https://docs.cloud.google.com/spanner/docs/spanner-cli-commands

## Issues Found
- The backup command used `--expire-time`, which is not a valid current `gcloud spanner backups create` flag. Replaced it with the supported `--retention-period=7d` form.
- The database-size query referenced `INFORMATION_SCHEMA.TABLE_SIZES` and `row_count`, which are not the documented Spanner table-size statistics interface. Replaced it with `SPANNER_SYS.TABLE_SIZES_STATS_1HOUR` and `used_bytes`.
- The CPU monitoring command described CPU utilization but only returned the instance state. Replaced it with a Cloud Monitoring time-series query for the documented Spanner high-priority CPU metric.
- The Go sample imported `time` without using it, which would prevent compilation. Removed the unused import.
- The Go sample read a Spanner `NUMERIC` value into `float64`. Updated the example to use `spanner.NullNumeric`, matching the Go client library's NUMERIC mapping.
- Later examples referenced `CreatedAt` and `DiscountCode` columns that were not present in the shown `Customers` and `Orders` schema. Added those columns to the schema example.
- Python and Go insert examples omitted values for the commit timestamp columns added to the schema. Updated them to use `spanner.COMMIT_TIMESTAMP` in Python and `spanner.CommitTimestamp` in Go.
- The report query compared `TIMESTAMP` columns with string parameters. Updated the function signature and parameter types to use `datetime.datetime` and `param_types.TIMESTAMP`.

## Review Notes
The post is a broad practical guide, so some snippets remain illustrative and assume surrounding project setup, authentication, database names, and table definitions. The core Spanner SQL, CLI flags, client-library APIs, and operational guidance are now aligned with the official documentation checked during review.
