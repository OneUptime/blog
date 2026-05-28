# Validation Summary: How to Build an End-to-End ML Feature Store Pipeline Using BigQuery

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud
- BigQuery
- Vertex AI Feature Store
- Vertex AI SDK for Python
- Kubeflow Pipelines
- Google Cloud CLI
- curl

## Sources Consulted
- Vertex AI Feature Store overview: https://cloud.google.com/vertex-ai/docs/featurestore/latest/overview
- Vertex AI Feature Store introduction and legacy comparison: https://cloud.google.com/vertex-ai/docs/featurestore
- Create an online store instance: https://cloud.google.com/vertex-ai/docs/featurestore/latest/create-onlinestore
- Create a feature group: https://cloud.google.com/vertex-ai/docs/featurestore/latest/create-featuregroup
- Create a feature: https://cloud.google.com/vertex-ai/docs/featurestore/latest/create-feature
- Create a feature view instance: https://cloud.google.com/vertex-ai/docs/featurestore/latest/create-featureview
- Serve features from an online store: https://cloud.google.com/vertex-ai/docs/featurestore/latest/serve-feature-values
- BigQuery feature serving: https://cloud.google.com/bigquery/docs/feature-serving
- Kubeflow Pipelines v2 migration guide: https://www.kubeflow.org/docs/components/pipelines/user-guides/migration/
- Kubeflow Pipelines container components: https://www.kubeflow.org/docs/components/pipelines/user-guides/components/container-components/
- Kubeflow Pipelines compile guide: https://www.kubeflow.org/docs/components/pipelines/user-guides/core-functions/compile-a-pipeline/

## Issues Found
- The post used the legacy Vertex AI Feature Store `Featurestore -> EntityType -> Feature` APIs while describing the current Vertex AI Feature Store. Updated the tutorial to use `FeatureOnlineStore`, `FeatureGroup`, `Feature`, and `FeatureView`.
- The BigQuery feature query referenced `feature_timestamp` later but did not create it. Added `CURRENT_TIMESTAMP() AS feature_timestamp`.
- The original ingestion example used `ingest_from_bq`, which applies to the legacy import model rather than the current feature view sync model. Replaced it with a feature view creation example using `feature_registry_source` and `sync_config`.
- The online serving example used `feature_store.read(...)`, which does not match the current feature view serving API. Updated it to read from a `FeatureView`.
- The offline training example used `batch_serve_to_bq`, which is a legacy managed offline serving pattern. Updated it to perform the point-in-time join in BigQuery.
- The automation example used `dsl.ContainerOp` and `from kfp.v2 import compiler`; `ContainerOp` is removed in KFP SDK v2. Replaced it with `@dsl.container_component`, `dsl.ContainerSpec`, and `from kfp import compiler, dsl`.
- The examples mixed `my_project` and `my-project` project identifiers. Standardized the examples on `my-project`.

## Review Notes
The Vertex AI SDK feature store helpers used here are in the `vertexai.resources.preview` namespace in Google Cloud's current samples, so readers should install or upgrade `google-cloud-aiplatform` before running the code.
