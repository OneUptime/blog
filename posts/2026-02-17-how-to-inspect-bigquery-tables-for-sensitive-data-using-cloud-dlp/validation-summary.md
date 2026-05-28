# Validation Summary: How to Inspect BigQuery Tables for Sensitive Data Using Cloud DLP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Sensitive Data Protection / Cloud DLP API
- BigQuery
- Pub/Sub
- Python
- Google Cloud client libraries for Python
- REST API / curl
- SQL

## Sources Consulted
- Sensitive Data Protection documentation overview: https://docs.cloud.google.com/sensitive-data-protection/docs
- Inspect BigQuery for sensitive data with sampling sample: https://docs.cloud.google.com/sensitive-data-protection/docs/samples/dlp-inspect-bigquery-with-sampling
- Inspect Google Cloud storage and databases for sensitive data: https://docs.cloud.google.com/sensitive-data-protection/docs/inspecting-storage
- `projects.dlpJobs.create` REST reference: https://docs.cloud.google.com/sensitive-data-protection/docs/reference/rest/v2/projects.dlpJobs/create
- `InspectJobConfig` REST reference, including `BigQueryOptions`: https://docs.cloud.google.com/sensitive-data-protection/docs/reference/rest/v2/InspectJobConfig
- `Action` REST reference, including `saveFindings` and `pubSub`: https://docs.cloud.google.com/sensitive-data-protection/docs/reference/rest/v2/Action
- InfoTypes and infoType detectors: https://docs.cloud.google.com/sensitive-data-protection/docs/concepts-infotypes
- InfoType detector reference: https://docs.cloud.google.com/sensitive-data-protection/docs/infotypes-reference
- Query Sensitive Data Protection findings in BigQuery: https://docs.cloud.google.com/sensitive-data-protection/docs/querying-findings
- Sensitive Data Protection pricing: https://cloud.google.com/sensitive-data-protection/pricing
- Sensitive Data Protection IAM permissions: https://docs.cloud.google.com/sensitive-data-protection/docs/iam-permissions

## Issues Found
- The post described Cloud DLP as a standalone product. Updated the wording to note that Cloud DLP is now part of Sensitive Data Protection while the DLP API name remains in use.
- The post said Cloud DLP has over 150 built-in detectors. Updated this to over 200 built-in infoType detectors to match current Google Cloud documentation.
- The REST JSON used `rowsLimit` as a JSON number even though the REST schema defines it as an int64 string. Changed it to `"10000"`.
- The exported-findings queries accessed `location.content_locations` as if it were a scalar record and referenced a non-existent `table_location.row_id` field. Updated the queries to `UNNEST(location.content_locations)` and use `record_location.record_key.id_values` for row identifiers.
- The examples did not configure `identifyingFields`, but the analysis query attempted to count affected rows. Added `identifyingFields` to the REST example and made it optional in the Python helper so row identifiers are exported when the caller provides a suitable key field.
- The Python sample printed `processed_bytes` as "Total findings." Changed the message to say "Bytes processed."
- The multi-table scanner printed "Submitted" jobs even though the helper polls until each job completes. Changed the message to "Completed."
- The sampling explanation said `RANDOM_START` picks rows randomly and `TOP` starts from the beginning. Updated this to reflect BigQueryOptions behavior: `RANDOM_START` randomly selects groups of rows and `TOP` scans groups in the order BigQuery provides.
- The post recommended `rowsLimitPercent` without caveat. Added Google's current caution that `rowsLimit` is recommended because of a known issue with `rowsLimitPercent`.
- The cost section said `identifyingFields` reduces scanned data. Corrected this to `includedFields` and `excludedFields`, which are the BigQueryOptions fields that limit scanned columns.
- The summary referred to quick spot checks using `gcloud`, but the post did not include a `gcloud` scan example. Changed this to small sampled API jobs.

## Review Notes
- The curl command and DLP job request shape are valid for the global endpoint. Location-scoped parents such as `projects/{projectId}/locations/{locationId}` are also supported by the API.
- The Pub/Sub action publishes a job-completion notification containing the DLP job name; alerting on specific findings requires the downstream function to retrieve or query the saved findings.
