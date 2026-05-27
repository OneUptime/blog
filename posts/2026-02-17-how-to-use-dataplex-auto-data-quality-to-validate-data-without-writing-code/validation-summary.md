# Validation Summary: How to Use Dataplex Auto Data Quality to Validate Data Without Writing Code

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Dataplex / Knowledge Catalog Auto Data Quality
- BigQuery
- Google Cloud CLI
- Dataplex DataScan API
- Python Google Cloud Dataplex client library
- Cloud Logging and Cloud Monitoring alerts
- YAML data quality specifications

## Sources Consulted
- Google Cloud documentation, Use auto data quality: https://docs.cloud.google.com/dataplex/docs/use-auto-data-quality
- Google Cloud SDK reference, `gcloud dataplex datascans create data-quality`: https://docs.cloud.google.com/sdk/gcloud/reference/dataplex/datascans/create/data-quality
- Google Cloud SDK reference, `gcloud dataplex datascans create data-profile`: https://cloud.google.com/sdk/gcloud/reference/dataplex/datascans/create/data-profile
- Google Cloud SDK reference, `gcloud dataplex datascans jobs describe`: https://cloud.google.com/sdk/gcloud/reference/dataplex/datascans/jobs/describe
- Dataplex REST reference, `DataQualitySpec`: https://docs.cloud.google.com/dataplex/docs/reference/rest/v1/DataQualitySpec
- Dataplex REST reference, `DataQualityRule`: https://docs.cloud.google.com/dataplex/docs/reference/rest/v1/DataQualityRule
- Dataplex REST reference, `DataQualityResult`: https://docs.cloud.google.com/dataplex/docs/reference/rest/v1/DataQualityResult
- Dataplex REST reference, `generateDataQualityRules`: https://docs.cloud.google.com/dataplex/docs/reference/rest/v1/projects.locations.dataScans/generateDataQualityRules
- Google Cloud Python client reference, `DataScanJob`: https://docs.cloud.google.com/python/docs/reference/dataplex/latest/google.cloud.dataplex_v1.types.DataScanJob
- Google Cloud documentation, Dataplex logging: https://cloud.google.com/dataplex/docs/logging

## Issues Found
- Data quality scan create commands omitted `--data-quality-spec-file`, but the current `gcloud dataplex datascans create data-quality` command requires a data quality spec file. Added minimal YAML specs and the required flag to the create examples.
- The post said Auto Data Quality can point at BigQuery tables or Cloud Storage data. Current auto data quality documentation describes quality scans for a single BigQuery table, so the Cloud Storage wording was removed.
- Custom SQL rules used a top-level `sqlExpression` field, which is not a valid `DataQualityRule` rule type. Updated examples to use `rowConditionExpectation`, `tableConditionExpectation`, and `sqlAssertion` as documented.
- Aggregate rules included `threshold`, but the `threshold` field is valid only for row-level rules. Removed `threshold` from table-condition and SQL-assertion examples.
- The create and update examples used `--trigger-type`, which is not in the current data quality scan CLI reference. Replaced it with `--on-demand=true` for on-demand creation and `--schedule` for recurring execution.
- The auto-suggestion example described profiling output as suggested rules. Replaced it with the documented `generateDataQualityRules` API call.
- The scan result command used `LATEST` as a job ID. The documented command requires a job resource, so the example now lists the latest job ID and passes it to `jobs describe`.
- The Python result example used an unsupported `GetDataScanJobRequest.DataScanJobView.FULL` argument and a nonexistent `failing_rows_count` field. Removed the view argument and replaced the failing-row count with documented `failing_rows_query` and `assertion_row_count` fields.
- The alerting example used an unsupported Cloud Function event shape for scan completion. Replaced it with the documented Cloud Logging queries for creating Cloud Monitoring log-based alerts.
- Advanced SQL examples used `FROM data`, which is not the documented table reference for SQL assertions. Updated them to use the `${data()}` reference parameter.

## Review Notes
- Google documentation now refers to Dataplex Universal Catalog as Knowledge Catalog as of April 10, 2026, but the Dataplex API, client library, CLI, and IAM names remain unchanged. The post still uses Dataplex naming because the commands and library names are still `dataplex`.
