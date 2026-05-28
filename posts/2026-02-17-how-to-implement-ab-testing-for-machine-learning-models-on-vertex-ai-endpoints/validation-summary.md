# Validation Summary: How to Implement A/B Testing for Machine Learning Models on Vertex AI Endpoints

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Vertex AI Endpoints
- Vertex AI Python SDK (`google-cloud-aiplatform`)
- Vertex AI request-response logging
- BigQuery
- Python
- statsmodels
- SciPy

## Sources Consulted
- Vertex AI Endpoint Python SDK reference: https://cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.Endpoint
- Vertex AI Endpoint resource Python reference: https://cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform_v1.types.Endpoint
- Vertex AI online inference logging documentation: https://cloud.google.com/vertex-ai/docs/predictions/online-prediction-logging
- Vertex AI deployment and traffic split documentation: https://cloud.google.com/vertex-ai/docs/predictions/deploy-model-api
- Vertex AI EndpointServiceClient Python reference: https://cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform_v1.services.endpoint_service.EndpointServiceClient
- BigQuery JSON functions documentation: https://cloud.google.com/bigquery/docs/reference/standard-sql/json_functions
- statsmodels `proportions_ztest` documentation: https://www.statsmodels.org/stable/generated/statsmodels.stats.proportion.proportions_ztest.html
- SciPy `stats` API reference: https://docs.scipy.org/doc/scipy/reference/stats.html

## Issues Found
- The first deployment set Model A to 70% traffic on an endpoint with no existing deployed models. Vertex AI traffic splits must total 100%, and the SDK defaults to 100% only when no traffic value is provided. Changed the first deployment to 100%, then deployed Model B at 30%, which scales Model A down to 70%.
- The request-response logging example used `Endpoint.update()` with `predict_request_response_logging_config`, but the high-level SDK `Endpoint.update()` method only supports fields such as display name, description, labels, and traffic split. Replaced it with `aiplatform_v1.EndpointServiceClient.update_endpoint()` and a field mask.
- The request-response logging example used deployed model display names as `traffic_split` keys. Vertex AI requires deployed model IDs as traffic split keys. Added a lookup from deployed model display name to deployed model ID.
- The text implied Vertex AI request-response logging records business outcomes. It records endpoint request and response payloads; outcomes must be logged separately. Adjusted the wording to point to the custom wrapper for outcome logging.
- The BigQuery examples used `JSON_EXTRACT_SCALAR`, which GoogleSQL marks deprecated. Replaced it with `JSON_VALUE`.
- The statistical test imported `scipy.stats` and called `stats.proportions_ztest`, which is not a SciPy API. Replaced it with `statsmodels.stats.proportion.proportions_ztest`.
- The promotion snippet called `analyze_ab_test()` without importing it. Added the import from the earlier analysis module.

## Review Notes
- The custom logging wrapper assumes the destination BigQuery table already exists with fields matching the inserted rows. That is acceptable for the tutorial, but a production version should include the table schema or creation step.
- The statistical examples are appropriate for binary classification accuracy. Other model types would need different metrics and tests.
