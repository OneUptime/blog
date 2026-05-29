# Validation Summary: How to Build a Data Mesh Architecture on GCP Using Dataplex Data Domains

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Dataplex / Knowledge Catalog
- Dataplex lakes, zones, assets, entries, aspects, and tasks
- BigQuery datasets, IAM, and GoogleSQL DCL
- Cloud Storage
- CloudDQ data quality YAML
- dbt project configuration
- Python BigQuery client library
- gcloud CLI and bq CLI

## Sources Consulted
- Google Cloud SDK reference: `gcloud dataplex lakes create` - https://docs.cloud.google.com/sdk/gcloud/reference/dataplex/lakes/create
- Google Cloud SDK reference: `gcloud dataplex zones create` - https://docs.cloud.google.com/sdk/gcloud/reference/dataplex/zones/create
- Google Cloud SDK reference: `gcloud dataplex assets create` - https://docs.cloud.google.com/sdk/gcloud/reference/dataplex/assets/create
- Google Cloud SDK reference: `gcloud dataplex tasks create` - https://docs.cloud.google.com/sdk/gcloud/reference/dataplex/tasks/create
- Google Cloud SDK reference: `gcloud dataplex aspect-types create` - https://docs.cloud.google.com/sdk/gcloud/reference/dataplex/aspect-types/create
- Google Cloud SDK reference: `gcloud dataplex entries search` and `update-aspects` - https://docs.cloud.google.com/sdk/gcloud/reference/dataplex/entries/search and https://docs.cloud.google.com/sdk/gcloud/reference/dataplex/entries/update-aspects
- Dataplex / Knowledge Catalog data quality tasks - https://docs.cloud.google.com/dataplex/docs/check-data-quality
- Dataplex / Knowledge Catalog search syntax - https://docs.cloud.google.com/dataplex/docs/search-syntax
- Dataplex aspect type REST reference - https://docs.cloud.google.com/dataplex/docs/reference/rest/v1/projects.locations.aspectTypes
- Dataplex metadata management overview - https://docs.cloud.google.com/dataplex/docs/catalog-overview
- Dataplex entries and system entry groups - https://docs.cloud.google.com/dataplex/docs/ingest-custom-sources
- BigQuery IAM and dataset access documentation - https://cloud.google.com/bigquery/docs/control-access-to-resources-iam
- Data Catalog deprecation notices in gcloud reference - https://docs.cloud.google.com/sdk/gcloud/reference/data-catalog

## Issues Found
- The post described Dataplex as GCP's service for implementing data mesh. Changed this to "one GCP service you can use" because Dataplex supports governance and organization patterns but is not the only possible implementation mechanism.
- The metadata section used deprecated Data Catalog tag template, tag, and search commands. Replaced these examples with current Dataplex aspect type creation, aspect application, and entry search commands.
- The BigQuery ownership example used a project-level conditional IAM binding that is not the recommended way to grant ownership on specific datasets. Replaced it with BigQuery dataset-level GoogleSQL DCL grants executed through `bq query`.
- The CloudDQ YAML example used a simplified list format and rule fields that do not match the CloudDQ specification required by Dataplex data quality tasks. Rewrote it with `rules`, `row_filters`, `rule_dimensions`, and `rule_bindings`.
- The Dataplex data quality task command used a non-existent built-in Spark main class and omitted required task execution fields. Replaced it with the documented CloudDQ PySpark driver, artifact URIs, execution service account, and `TASK_ARGS`.
- The discovery examples used deprecated `gcloud data-catalog search` syntax and an unsupported `--scope=include-all` flag for that command. Replaced them with `gcloud dataplex entries search` examples.
- The wrap-up still referred to Data Catalog tags. Updated it to refer to Dataplex aspects.

## Review Notes
Google renamed Dataplex Universal Catalog to Knowledge Catalog as of April 10, 2026, but the Dataplex API, CLI, client library, and IAM names remain unchanged. The post still uses Dataplex terminology because the commands and resource names remain `dataplex`.
