# Validation Summary: How to Use BigQuery Remote Functions to Call Cloud Functions from SQL Queries

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google BigQuery
- BigQuery remote functions
- BigQuery Cloud resource connections
- GoogleSQL
- Cloud Run functions / Cloud Functions 2nd gen
- Google Cloud CLI (`gcloud`)
- BigQuery CLI (`bq`)
- Python
- Functions Framework for Python
- Cloud Natural Language API
- Google Maps Python client

## Sources Consulted
- BigQuery remote functions documentation: https://docs.cloud.google.com/bigquery/docs/remote-functions
- BigQuery Cloud resource connection documentation: https://docs.cloud.google.com/bigquery/docs/create-cloud-resource-connection
- BigQuery bq CLI reference: https://docs.cloud.google.com/bigquery/docs/reference/bq-cli-reference
- BigQuery JSON functions reference: https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/json_functions
- Cloud SDK `gcloud functions add-invoker-policy-binding` reference: https://cloud.google.com/sdk/gcloud/reference/functions/add-invoker-policy-binding
- Cloud Run functions runtime support: https://cloud.google.com/functions/docs/runtime-support
- Cloud Natural Language sentiment analysis documentation: https://docs.cloud.google.com/natural-language/docs/analyzing-sentiment
- Cloud Natural Language Python client reference: https://cloud.google.com/python/docs/reference/language/latest/google.cloud.language_v1.services.language_service.LanguageServiceClient

## Issues Found
- The SQL examples used `JSON_EXTRACT_SCALAR`, which the BigQuery JSON functions reference marks as deprecated. Replaced those calls with `JSON_VALUE`, the current standard extractor for scalar JSON values.

## Review Notes
- The BigQuery remote function request and response examples match the documented `calls` and `replies` batch contract.
- The connection location in the example (`US`) is compatible with a `us-central1` Cloud Run functions endpoint under BigQuery multi-region location rules.
- The `python311` Cloud Run functions runtime remains supported as of the review date.
- Local `gcloud` and `bq` binaries were not installed in the review environment, so CLI syntax was verified against official Google Cloud documentation rather than local `--help` output.
