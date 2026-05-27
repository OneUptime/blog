# Validation Summary: How to Set Up a Data Governance Framework on GCP Using Data Catalog DLP API

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud
- Dataplex Universal Catalog
- BigQuery
- BigQuery policy tags and column-level access control
- Sensitive Data Protection / DLP API
- IAM audit logging
- Google Cloud CLI
- Python Google Cloud client libraries

## Sources Consulted
- Google Cloud Dataplex Universal Catalog deprecations: https://cloud.google.com/dataplex/docs/deprecations
- Transition from Data Catalog to Dataplex Universal Catalog: https://docs.cloud.google.com/dataplex/docs/transition-to-dataplex-catalog
- Dataplex Universal Catalog metadata management overview: https://docs.cloud.google.com/dataplex/docs/catalog-overview
- Dataplex aspect types CLI reference: https://docs.cloud.google.com/sdk/gcloud/reference/dataplex/aspect-types/create
- Dataplex entries search CLI reference: https://docs.cloud.google.com/sdk/gcloud/reference/dataplex/entries/search
- Dataplex entries update CLI reference: https://cloud.google.com/sdk/gcloud/reference/dataplex/entries/update
- BigQuery column-level access control docs: https://cloud.google.com/bigquery/docs/column-level-security-intro
- BigQuery restrict access with policy tags: https://cloud.google.com/bigquery/docs/column-level-security
- Sensitive Data Protection BigQuery inspection sample: https://docs.cloud.google.com/sensitive-data-protection/docs/samples/dlp-inspect-bigquery
- Sensitive Data Protection findings in BigQuery: https://docs.cloud.google.com/sensitive-data-protection/docs/querying-findings
- Sensitive Data Protection infoType reference: https://docs.cloud.google.com/sensitive-data-protection/docs/infotypes-reference
- BigQuery INFORMATION_SCHEMA TABLES view: https://docs.cloud.google.com/bigquery/docs/information-schema-tables
- BigQuery INFORMATION_SCHEMA COLUMNS view: https://cloud.google.com/bigquery/docs/information-schema-columns
- BigQuery INFORMATION_SCHEMA TABLE_STORAGE view: https://docs.cloud.google.com/bigquery/docs/information-schema-table-storage
- BigQuery Python SchemaField reference: https://docs.cloud.google.com/python/docs/reference/bigquery/latest/google.cloud.bigquery.schema.SchemaField

## Issues Found
- The post used standalone Data Catalog for discovery and custom metadata even though Data Catalog was deprecated on February 3, 2025 and scheduled for shutdown on January 30, 2026. Updated discovery and stewardship metadata sections to use Dataplex Universal Catalog while keeping BigQuery policy tags, which Google documents as not deprecated.
- The API enablement commands used Dataplex resources without enabling `dataplex.googleapis.com`. Added the Dataplex API enablement command.
- The taxonomy Python example lost no technical validity because policy tags remain supported, but its comment implied standalone Data Catalog metadata. Updated the wording to clarify that it creates BigQuery policy-tag taxonomy metadata.
- The DLP findings query used direct array indexing on `location.content_locations` instead of following the exported findings query pattern with `UNNEST`. Updated the query to unnest `location.content_locations` and read `locations.record_location.field_id.name`.
- The BigQuery schema update code rebuilt `SchemaField` objects with only a subset of properties, which could drop nested fields and other schema attributes. Updated it to modify the field API representation and recreate the field with `SchemaField.from_api_repr`.
- The Data Catalog tag template and tag application examples used deprecated commands and APIs. Replaced them with a Dataplex aspect type and `gcloud dataplex entries update --update-aspects`.
- The audit logging section only exported the current IAM policy and did not apply the edited policy. Added the `gcloud projects set-iam-policy` command after the audit configuration step.
- The governance dashboard query referenced `row_count` and `size_bytes` columns that are not present in `INFORMATION_SCHEMA.TABLES`. Updated it to join `INFORMATION_SCHEMA.TABLE_STORAGE` and use `total_rows` and `total_logical_bytes`.
- The dashboard query checked `c.policy_tags IS NOT NULL`, but `policy_tags` is an array. Updated it to count columns where `ARRAY_LENGTH(c.policy_tags) > 0`.

## Review Notes
The local environment does not have `gcloud` installed, so CLI validation was performed against official Google Cloud CLI reference documentation rather than local `--help` output. Python and JSON examples were parsed locally for syntax.
