# Validation Summary: How to Set Up Data Lineage Tracking Across GCP Data Pipelines

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Google Cloud Data Lineage API
- Dataplex Universal Catalog / Knowledge Catalog
- BigQuery
- Cloud Storage
- Dataflow
- Google Cloud Python client libraries
- Google Cloud CLI
- Data Catalog / Knowledge Catalog metadata concepts

## Sources Consulted
- Google Cloud: About data lineage - https://cloud.google.com/dataplex/docs/about-data-lineage
- Google Cloud: Use data lineage with Google Cloud systems - https://docs.cloud.google.com/dataplex/docs/use-lineage
- Google Cloud: BigQuery Data Catalog and lineage documentation - https://docs.cloud.google.com/bigquery/docs/data-catalog
- Google Cloud: Data Lineage API RPC reference - https://docs.cloud.google.com/dataplex/docs/reference/data-lineage/rpc/google.cloud.datacatalog.lineage.v1
- Google Cloud Python lineage client reference - https://docs.cloud.google.com/python/docs/reference/lineage/latest/google.cloud.datacatalog_lineage_v1.services.lineage.LineageClient
- Google Cloud Python SearchLinksRequest reference - https://docs.cloud.google.com/python/docs/reference/lineage/latest/google.cloud.datacatalog_lineage_v1.types.SearchLinksRequest
- Google Cloud: Fully qualified names - https://cloud.google.com/dataplex/docs/fully-qualified-names
- Google Cloud: Manage aspects and enrich metadata - https://docs.cloud.google.com/dataplex/docs/enrich-entries-metadata
- Google Cloud Python Dataplex update entry sample - https://docs.cloud.google.com/dataplex/docs/samples/dataplex-update-entry
- Google Cloud: Dataplex Universal Catalog deprecations - https://docs.cloud.google.com/dataplex/docs/deprecations

## Issues Found
- The post described lineage as built into the Data Catalog API and recommended enabling `datacatalog.googleapis.com`. Updated this to the current Data Lineage API plus Dataplex API setup, because current Google documentation says lineage is provided through the Data Lineage API and viewed through Dataplex Universal Catalog / Knowledge Catalog.
- The post still used Data Catalog tags for metadata enrichment. Data Catalog was deprecated and scheduled for shutdown, so the example was replaced with a Dataplex Universal Catalog aspect update using `google.cloud.dataplex_v1`.
- The lineage API examples used old-style linked resource names such as `//bigquery.googleapis.com/...` and `//storage.googleapis.com/...`. Updated them to documented fully qualified names such as `bigquery:my-project.dataset.table` and `gcs:bucket.path`.
- The BigQuery automatic lineage list was incomplete and slightly imprecise. Updated it to include copy jobs and Cloud Storage load jobs, and clarified view/materialized view creation support and the possible 24-hour delay before lineage appears.
- The custom lineage snippet attempted to construct protobuf `Value` objects through `datacatalog_lineage_v1.types.struct_pb2`, which is not the documented import path. Updated it to use `google.protobuf.struct_pb2.Value`.
- The text implied Dataflow always needed custom lineage. Updated the wording because Dataflow can report lineage automatically when configured and supported; custom events are for pipelines that do not report lineage automatically.

## Review Notes
The Python snippets were syntax-checked locally with `ast.parse`. Runtime verification against Google Cloud was not performed because the local environment does not have Google Cloud client libraries or `gcloud` installed, and the examples require an authenticated GCP project.
