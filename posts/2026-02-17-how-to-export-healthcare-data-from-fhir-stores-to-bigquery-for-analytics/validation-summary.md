# Validation Summary: How to Export Healthcare Data from FHIR Stores to BigQuery for Analytics

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Healthcare API
- FHIR stores
- BigQuery
- Google Cloud CLI
- Cloud Scheduler
- Cloud Functions
- Python client libraries
- SQL

## Sources Consulted
- Cloud Healthcare API: Batch export FHIR resources to BigQuery: https://docs.cloud.google.com/healthcare-api/docs/how-tos/fhir-export-bigquery
- Cloud Healthcare API REST reference for `fhirStores.export`: https://docs.cloud.google.com/healthcare-api/docs/reference/rest/v1/projects.locations.datasets.fhirStores/export
- Cloud Healthcare API RPC reference for FHIR export request, BigQueryDestination, SchemaConfig, and WriteDisposition: https://docs.cloud.google.com/healthcare-api/docs/reference/rpc/google.cloud.healthcare.v1/fhir
- Cloud Healthcare API permissions for Google Cloud products: https://docs.cloud.google.com/healthcare-api/docs/permissions-healthcare-api-gcp-products
- Google Cloud SDK reference for `gcloud healthcare fhir-stores export bq`: https://docs.cloud.google.com/sdk/gcloud/reference/healthcare/fhir-stores/export/bq
- BigQuery `INFORMATION_SCHEMA.TABLES` view: https://docs.cloud.google.com/bigquery/docs/information-schema-tables
- BigQuery `INFORMATION_SCHEMA.TABLE_STORAGE` view: https://docs.cloud.google.com/bigquery/docs/information-schema-table-storage
- Google Cloud Codelab with FHIR Analytics BigQuery query examples: https://codelabs.developers.google.com/codelabs/health-data-analytics-1/

## Issues Found
- The recursive-depth explanation said structures deeper than the configured depth are stored as JSON strings. Google documents `recursiveStructureDepth` as controlling which recursive columns are generated, so the text now says deeper recursive structures are not expanded into additional columns.
- The table listing query selected `row_count` and `size_bytes` from `INFORMATION_SCHEMA.TABLES`, but those columns are not part of that view. The query now uses `INFORMATION_SCHEMA.TABLE_STORAGE` with `total_rows` and `total_logical_bytes`.
- The incremental Python sample used `_since`, which is the REST JSON field name, as a Python client constructor argument. The Python client field is `since`, so the sample now passes an RFC 3339 timestamp string using timezone-aware UTC time.

## Review Notes
- The Healthcare API BigQuery export payload, `ANALYTICS_V2` schema type, `WRITE_TRUNCATE` and `WRITE_APPEND` values, service agent format, and required BigQuery roles match current Google Cloud documentation.
- The SQL examples use the Analytics-style FHIR BigQuery fields shown in Google Cloud's clinical analytics codelab. Actual available fields can still vary with FHIR version, schema type, resource contents, and any existing destination table schema.
