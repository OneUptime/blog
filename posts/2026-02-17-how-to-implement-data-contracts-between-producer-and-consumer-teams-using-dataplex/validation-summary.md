# Validation Summary: How to Use Data Contracts Between Producer and Consumer Teams Using Dataplex

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Dataplex Universal Catalog
- Dataplex data quality scans
- Google Cloud CLI
- Python Google Cloud Dataplex client library
- BigQuery
- Pub/Sub
- YAML

## Sources Consulted
- Google Cloud CLI reference for `gcloud dataplex datascans create data-quality`: https://docs.cloud.google.com/sdk/gcloud/reference/dataplex/datascans/create/data-quality
- Dataplex auto data quality guide: https://docs.cloud.google.com/dataplex/docs/use-auto-data-quality
- Dataplex auto data quality overview: https://docs.cloud.google.com/dataplex/docs/auto-data-quality-overview
- Dataplex REST reference for `DataQualitySpec`: https://docs.cloud.google.com/dataplex/docs/reference/rest/v1/DataQualitySpec
- Dataplex REST reference for `DataQualityRule`: https://docs.cloud.google.com/dataplex/docs/reference/rest/v1/DataQualityRule
- Dataplex RPC reference for `DataScanJob`, `GetDataScanJobRequest`, and data quality results: https://docs.cloud.google.com/dataplex/docs/reference/rpc/google.cloud.dataplex.v1
- Python client reference for `DataQualityRule`: https://docs.cloud.google.com/python/docs/reference/dataplex/latest/google.cloud.dataplex_v1.types.DataQualityRule
- Python client reference for `DataScanServiceClient`: https://docs.cloud.google.com/python/docs/reference/dataplex/latest/google.cloud.dataplex_v1.services.data_scan_service.DataScanServiceClient
- Google Cloud CLI reference for Dataplex zones: https://docs.cloud.google.com/sdk/gcloud/reference/dataplex/zones/create
- Google Cloud CLI reference for Dataplex zone IAM bindings: https://cloud.google.com/sdk/gcloud/reference/dataplex/zones/add-iam-policy-binding

## Issues Found
- The sample contract used `IN (...)` as a row-condition SQL expression without the column name. Updated it to `event_type IN (...)` so it produces a valid BigQuery boolean expression for Dataplex row-condition rules.
- The Python example used a non-existent `DataQualityRule.FreshnessExpectation`. Replaced it with a supported `TableConditionExpectation` that checks `MAX(event_timestamp)` against the configured freshness threshold.
- The scheduled scan command used `--schedule-cron`, which is not a documented flag for `gcloud dataplex datascans create data-quality`. Updated it to `--schedule`.
- The monitoring example assumed the first job returned by `list_data_scan_jobs` is the latest and that list responses include full data quality results. Updated it to choose the newest listed job and fetch it with `GetDataScanJobRequest.DataScanJobView.FULL`.

## Review Notes
The Python snippets are syntactically valid. The local environment did not have `gcloud` or Google Cloud client libraries installed, so CLI and API behavior was verified against official Google Cloud documentation rather than by executing live Dataplex calls.
