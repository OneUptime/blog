# Validation Summary: How to Register Custom Entries in Data Catalog for Non-GCP Data Sources

## Status
not-technically-relevant

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Data Catalog
- Dataplex Universal Catalog
- Google Cloud CLI
- Google Cloud Data Catalog Python client library
- Terraform Google provider
- PostgreSQL metadata discovery
- Cloud Scheduler
- Cloud Functions
- IAM

## Sources Consulted
- Google Cloud Dataplex Universal Catalog deprecations: https://cloud.google.com/dataplex/docs/deprecations
- Google Cloud Dataplex Universal Catalog documentation: https://docs.cloud.google.com/dataplex/docs
- Google Cloud Data Catalog entry group CLI reference: https://docs.cloud.google.com/sdk/gcloud/reference/data-catalog/entry-groups/create
- Google Cloud Data Catalog entries CLI reference: https://docs.cloud.google.com/sdk/gcloud/reference/data-catalog/entries/create
- Google Cloud Data Catalog custom entry sample: https://cloud.google.com/data-catalog/docs/samples/data-catalog-create-custom-entry
- Google Cloud Data Catalog Python SearchCatalogResult reference: https://docs.cloud.google.com/python/docs/reference/datacatalog/latest/google.cloud.datacatalog_v1.types.SearchCatalogResult

## Issues Found
- The post presents Google Cloud Data Catalog as the active service for cataloging custom non-GCP assets. Official Google Cloud documentation says Data Catalog was deprecated on February 3, 2025 and shut down on January 30, 2026. The post date is February 17, 2026, so the tutorial was already obsolete at publication time.
- The `gcloud data-catalog` commands used in the post are documented by Google Cloud CLI as deprecated, with guidance to use `gcloud dataplex` commands instead.
- The post's Data Catalog Python API examples are based on the legacy Data Catalog client library workflow. While the historical API shape matches the older documentation, the recommended current product is Dataplex Universal Catalog, which uses different catalog concepts such as aspects instead of the Data Catalog tag-template workflow.
- Because correcting the article would require a substantive rewrite from Data Catalog to Dataplex Universal Catalog, including changing the title, product model, CLI commands, metadata model, and code examples, it is not salvageable through narrow technical corrections.

## Review Notes
The article should be removed or replaced with a new Dataplex Universal Catalog tutorial for registering third-party metadata. A direct patch to this README was not made because the requested review rules prohibit restructuring or adding broad replacement content, and the inaccuracies are product-level rather than isolated code mistakes.
