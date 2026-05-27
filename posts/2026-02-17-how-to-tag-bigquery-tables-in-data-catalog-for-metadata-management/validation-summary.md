# Validation Summary: How to Tag BigQuery Tables in Data Catalog for Metadata Management

## Status
not-technically-relevant

## Post Type
Tutorial / guide

## Technologies Covered
- Google Cloud Data Catalog
- BigQuery
- Google Cloud CLI
- Python Google Cloud Data Catalog client library
- Python Google Cloud BigQuery client library
- Terraform Google provider

## Sources Consulted
- Google Cloud Knowledge Catalog deprecations: https://docs.cloud.google.com/dataplex/docs/deprecations
- BigQuery documentation, Work with Data Catalog: https://docs.cloud.google.com/bigquery/docs/data-catalog
- Google Cloud CLI reference for `gcloud data-catalog tag-templates create`: https://docs.cloud.google.com/sdk/gcloud/reference/data-catalog/tag-templates/create
- Terraform Google provider documentation for `google_data_catalog_tag_template`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/data_catalog_tag_template

## Issues Found
- The post is built around Google Cloud Data Catalog, which official Google Cloud documentation marks as deprecated in favor of Knowledge Catalog. The Google Cloud deprecations page lists Data Catalog as deprecated on February 3, 2025, with shutdown scheduled for June 1, 2026. As of the validation date, May 27, 2026, this post recommends a deprecated service days before its scheduled shutdown.
- The BigQuery documentation now cautions users that Data Catalog is deprecated and points readers to Knowledge Catalog metadata enrichment with aspects, which are the replacement for Data Catalog tags. Reworking this article accurately would require changing the product, API, CLI commands, Terraform resources, and examples from Data Catalog tags/tag templates to Knowledge Catalog aspects/aspect types. That is beyond a narrow technical correction of the existing post.
- The `gcloud data-catalog tag-templates create` command is itself marked deprecated in the official Google Cloud CLI reference, which recommends using `gcloud dataplex aspect-types` instead.
- The command example uses `type='enum(PUBLIC,INTERNAL,CONFIDENTIAL,RESTRICTED)'`, but the current `gcloud data-catalog tag-templates create` reference documents enum values with pipe separators, for example `type='enum(A|B)'`.

## Review Notes
The underlying metadata-management topic is still valid, but the implementation should be rewritten as a Knowledge Catalog / Dataplex aspects tutorial rather than maintained as a Data Catalog tagging guide.
