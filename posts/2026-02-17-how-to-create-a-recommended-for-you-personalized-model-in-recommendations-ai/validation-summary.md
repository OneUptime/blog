# Validation Summary: How to Create a Recommended For You Personalized Model in Recommendations AI

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Retail API
- Vertex AI Search for commerce recommendations
- Recommendations AI models and serving configs
- Python Google Cloud client library for Retail API

## Sources Consulted
- Google Cloud documentation: Create recommendation models - https://cloud.google.com/retail/docs/create-models
- Google Cloud documentation: Create serving configs - https://cloud.google.com/retail/docs/create-configs
- Google Cloud documentation: About recommendation models - https://cloud.google.com/retail/docs/models
- Google Cloud documentation: Get recommendations - https://cloud.google.com/retail/docs/predict
- Google Cloud documentation: Filter recommendations - https://cloud.google.com/retail/docs/filter-recs
- Python client reference: `google.cloud.retail_v2.types.Model` - https://cloud.google.com/python/docs/reference/retail/latest/google.cloud.retail_v2.types.Model
- Python client reference: `google.cloud.retail_v2.types.CreateModelRequest` - https://cloud.google.com/python/docs/reference/retail/latest/google.cloud.retail_v2.types.CreateModelRequest
- Python client reference: `google.cloud.retail_v2.types.ServingConfig` - https://cloud.google.com/python/docs/reference/retail/latest/google.cloud.retail_v2.types.ServingConfig
- Python client reference: `google.cloud.retail_v2.types.PredictRequest` - https://cloud.google.com/python/docs/reference/retail/latest/google.cloud.retail_v2.types.PredictRequest

## Issues Found
- The prerequisites incorrectly required 90 days of user event data and 100 unique users with purchase events. Updated this to reflect the official Recommended For You CTR requirements: recent `detail-page-view` and `home-page-view` events, 100 unique catalog items for `detail-page-view`, and 10,000 events of each required type in the last 90 days. Also clarified that `add-to-cart` events are needed for CVR optimization.
- The post created a recommendation serving config before attaching a model and set `model_id=""`. Recommendation serving configs require a `model_id`, so the tutorial now creates the model first and creates the serving config with the model ID.
- The model creation example passed `model_id` to `CreateModelRequest`, but the Python request type supports `parent`, `model`, and `dry_run`; it does not have a `model_id` field. Updated the example to set the full model resource name on `Model.name`.
- The training duration was listed as 1-3 days. Official documentation says initial model training and tuning typically takes 2-5 days, so the code output and wrap-up were updated.
- The availability filter used attribute-filter syntax without enabling v2 filtering syntax. Added `params={"filterSyntaxV2": True}` and clarified that the filter is for filterable product attributes.
- The description of Others You May Like conflated it with Similar Items. Updated the wording to describe suggestions based on user history and relevance to a current product.
- The price reranking comment said it boosts products in the user's preferred price range. Updated it to state that similarly ranked products are ordered by price.
- The CVR explanation said it maximizes purchases. Updated it to match the documentation's add-to-cart conversion objective.

## Review Notes
The post still uses the older "Recommendations AI" naming, while current Google documentation presents the feature under Vertex AI Search for commerce / AI Commerce Search. The Retail API and client library examples remain technically valid after the corrections above.
