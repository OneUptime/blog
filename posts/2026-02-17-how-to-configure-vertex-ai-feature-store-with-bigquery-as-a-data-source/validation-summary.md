# Validation Summary: How to Configure Vertex AI Feature Store with BigQuery as a Data Source

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Vertex AI Feature Store
- Vertex AI Feature Online Store
- BigQuery
- Bigtable online serving
- Vertex AI SDK for Python
- Vertex AI REST API

## Sources Consulted
- Vertex AI Feature Store: Create an online store instance: https://cloud.google.com/vertex-ai/docs/featurestore/latest/create-onlinestore
- Vertex AI Feature Store: Create a feature view instance: https://cloud.google.com/vertex-ai/docs/featurestore/latest/create-featureview
- Vertex AI Feature Store: Start a data sync: https://docs.cloud.google.com/vertex-ai/docs/featurestore/latest/sync-data
- Vertex AI Feature Store: Serve features from online store: https://docs.cloud.google.com/vertex-ai/docs/featurestore/latest/serve-feature-values
- Vertex AI Feature Store: List sync operations: https://cloud.google.com/vertex-ai/docs/featurestore/latest/list-data-syncs
- Vertex AI REST reference: featureViews.sync: https://docs.cloud.google.com/vertex-ai/docs/reference/rest/v1beta1/projects.locations.featureOnlineStores.featureViews/sync
- BigQuery SQL reference: https://cloud.google.com/bigquery/docs/reference/standard-sql/query-syntax

## Issues Found
- The original Python snippets used `google.cloud.aiplatform.FeatureOnlineStore`, `aiplatform.FeatureView.BigQuerySource`, and `aiplatform.FeatureView.SyncConfig`, which do not match the current documented Feature Store SDK examples. Updated the snippets to use `vertexai.resources.preview.feature_store`, `FeatureViewBigQuerySource`, and cron strings for `sync_config`.
- The original direct BigQuery source schema included a `feature_timestamp` column and implied historical rows in the direct source. Current Vertex AI docs state that direct BigQuery feature views cannot include `feature_timestamp` and must have unique entity IDs. Updated the schema and explanation to use one current row per entity, and moved historical point-in-time reads to a separate BigQuery history table.
- The original BigQuery `INSERT` statement did not populate all table columns and left a placeholder expression inside the selected column list. Replaced it with a complete, syntactically valid BigQuery example using CTEs and explicit target columns.
- The "SQL query as source" section defined a `feature_query` variable but never used it, while Feature Store direct sources accept a BigQuery table or view URI. Updated the section to create a BigQuery view and use that view as the feature view source.
- The original `gcloud ai feature-online-stores` and `gcloud ai feature-views` command examples did not match the documented workflow available in the official Vertex AI Feature Store docs. Replaced them with documented REST API `curl` examples for online store creation, manual sync, feature view retrieval, and sync listing.
- The original online read example used `get_feature_view()`, `read(key=...)`, and iterated over `response.items()`. Updated it to instantiate `FeatureView` with `feature_online_store_id`, call `read([...])`, and read feature values from the response dictionary structure shown by the SDK examples.
- The post claimed that the sync setup eliminates training-serving skew. Revised this to say it reduces skew and helps keep definitions consistent, which is more accurate because the offline historical table and online latest-value source still need coordinated feature definitions.

## Review Notes
The article is now accurate for the current Vertex AI Feature Store "latest" documentation. The Python SDK helpers for Feature Store are still under `vertexai.resources.preview`, so future reviews should re-check import paths and method signatures if Google promotes these APIs to GA.
