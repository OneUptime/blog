# Validation Summary: How to Set Up a Real-Time Feature Store on GCP Using Bigtable

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Platform
- Vertex AI Feature Store
- Vertex AI SDK for Python
- Bigtable online serving
- BigQuery
- Google Cloud CLI
- PySpark
- Flask
- Google Auth for Python

## Sources Consulted
- Google Cloud Vertex AI Feature Store overview: https://docs.cloud.google.com/vertex-ai/docs/featurestore/latest/overview
- Create an online store instance: https://docs.cloud.google.com/vertex-ai/docs/featurestore/latest/create-onlinestore
- Create a feature group: https://docs.cloud.google.com/vertex-ai/docs/featurestore/latest/create-featuregroup
- Create a feature: https://docs.cloud.google.com/vertex-ai/docs/featurestore/latest/create-feature
- Create a feature view instance: https://docs.cloud.google.com/vertex-ai/docs/featurestore/latest/create-featureview
- Serve features from online store: https://docs.cloud.google.com/vertex-ai/docs/featurestore/latest/serve-feature-values
- Update features in a feature view: https://docs.cloud.google.com/vertex-ai/docs/featurestore/latest/featureview-direct-write
- List sync operations: https://docs.cloud.google.com/vertex-ai/docs/featurestore/latest/list-data-syncs
- Feature views REST create reference: https://docs.cloud.google.com/vertex-ai/docs/reference/rest/v1/projects.locations.featureOnlineStores.featureViews/create
- BigQuery GoogleSQL query syntax, including QUALIFY: https://cloud.google.com/bigquery/docs/reference/standard-sql/query-syntax
- Google Cloud CLI services enable reference: https://cloud.google.com/sdk/gcloud/reference/services/enable

## Issues Found
- The post claimed Bigtable-backed online serving provides sub-millisecond latency. Google Cloud positions Bigtable online serving as low-latency and scalable, while optimized online serving is the deprecated ultra-low-latency option. I changed those claims to "low latency" and "low-latency online lookups."
- The Vertex AI SDK examples used `google.cloud.aiplatform.FeatureOnlineStore`, `FeatureGroup`, `FeatureView.BigQuerySource`, and `fetch_feature_values` APIs that do not match the current documented Feature Store SDK examples. I updated them to use the current preview SDK imports under `vertexai.resources.preview.feature_store`, including `FeatureOnlineStore.create_bigtable_store`, `FeatureGroupBigQuerySource`, `FeatureViewBigQuerySource`, and `FeatureView.read`.
- The original online store ID used hyphens. Current Feature Online Store and Feature View IDs are documented with `[a-z0-9_]` naming constraints, so I changed the sample ID to `production_feature_store`.
- The feature registration examples passed unsupported `description` and `value_type` arguments to `create_feature`. I replaced them with the documented `version_column_name` argument.
- The feature view SDK example showed a `sync_config` helper path that is not documented in the current high-level SDK sample. I removed that unsupported constructor from the SDK example and added a short note that explicit cron sync schedules can be set with the REST `sync_config` field.
- The streaming update example wrote directly to a user-managed Bigtable instance and table, which is not how Vertex AI Feature Store exposes Bigtable online serving. I changed the example to use the documented preview `featureViews.directWrite` REST API for Bigtable-backed feature views.
- The serving example used nonexistent `get_feature_view` and `fetch_feature_values` methods. I updated it to instantiate `FeatureView` and call the documented `read` method.
- The point-in-time BigQuery example referenced the outer query alias inside a subquery in the `FROM` clause, which is not valid BigQuery SQL. I rewrote it using CTEs and `QUALIFY ROW_NUMBER()` to select the latest feature row at or before each event timestamp.
- The monitoring example used a nonexistent `get_sync_status()` method. I replaced it with a REST-based example that lists feature view sync operations and checks the latest successful sync time.
- Removed unused imports from the PySpark and streaming examples.

## Review Notes
Direct writes to feature views are currently documented as a preview capability and should be treated as pre-GA. The tutorial remains a conceptual setup guide; production code should also cover IAM, service accounts, schema creation, initial sync execution, retries, and model loading for the Flask endpoint.
