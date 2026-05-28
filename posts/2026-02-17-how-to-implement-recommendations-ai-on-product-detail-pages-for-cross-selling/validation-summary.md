# Validation Summary: How to Implement Recommendations AI on Product Detail Pages for Cross-Selling

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Retail API / Recommendations AI
- Vertex AI Search for commerce recommendation models
- Python Google Cloud Retail client library
- Flask
- JavaScript Fetch API
- BigQuery SQL

## Sources Consulted
- Google Cloud documentation: About recommendation models: https://docs.cloud.google.com/retail/docs/models
- Google Cloud documentation: Create recommendation models: https://docs.cloud.google.com/retail/docs/create-models
- Google Cloud documentation: Create serving configs: https://docs.cloud.google.com/retail/docs/create-configs
- Google Cloud documentation: Filter recommendations: https://docs.cloud.google.com/retail/docs/filter-recs
- Google Cloud Python client reference: Model: https://cloud.google.com/python/docs/reference/retail/latest/google.cloud.retail_v2.types.Model
- Google Cloud Python client reference: ServingConfig: https://cloud.google.com/python/docs/reference/retail/latest/google.cloud.retail_v2.types.ServingConfig
- Google Cloud Python client reference: PredictRequest: https://cloud.google.com/python/docs/reference/retail/latest/google.cloud.retail_v2.types.PredictRequest
- Google Cloud Python client reference: FrequentlyBoughtTogetherFeaturesConfig: https://cloud.google.com/python/docs/reference/retail/latest/google.cloud.retail_v2.types.Model.FrequentlyBoughtTogetherFeaturesConfig
- Google Cloud Python client reference: ContextProductsType: https://cloud.google.com/python/docs/reference/retail/latest/google.cloud.retail_v2.types.Model.ContextProductsType

## Issues Found
- The Frequently Bought Together model used `optimization_objective="cvr"`. Official model documentation lists revenue per session as the default/supported objective for Frequently Bought Together, represented in the API as `revenue-per-order`; changed the sample to use `revenue-per-order`.
- The Frequently Bought Together model did not set a context products type. For product detail pages, official documentation recommends single context product behavior; added `model_features_config` with `SINGLE_CONTEXT_PRODUCT`.
- The recommendation filters used attribute syntax such as `availability: ANY("IN_STOCK")` without setting `params={"filterSyntaxV2": True}`. Official PredictRequest documentation requires `filterSyntaxV2` for attribute-based recommendation filters; added it to the prediction calls.
- The current-product exclusion filter used `id`, which is not the documented recommendation filter field. Changed it to `productId`.
- The frontend query string interpolated raw IDs. Wrapped query parameter values with `encodeURIComponent` so IDs containing reserved URL characters are sent correctly.

## Review Notes
The local environment does not have `google-cloud-retail` installed, so the Retail API calls were verified against official API documentation and the code snippets were syntax-checked locally. The example assumes the catalog, historical events, model training requirements, authentication, and the relevant recommendation filtering settings are already in place.
