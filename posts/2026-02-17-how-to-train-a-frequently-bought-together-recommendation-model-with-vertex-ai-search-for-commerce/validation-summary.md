# Validation Summary: How to Train a Frequently Bought Together Recommendation Model with Vertex AI

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Retail API
- Vertex AI Search for Commerce / AI Commerce Search
- Frequently Bought Together recommendation models
- Google Cloud Python client library for Retail
- JavaScript frontend integration

## Sources Consulted
- Google Cloud: About recommendation models: https://cloud.google.com/retail/docs/models
- Google Cloud: Create recommendation models: https://cloud.google.com/retail/docs/create-models
- Google Cloud: Get recommendations: https://cloud.google.com/retail/docs/predict
- Google Cloud: About serving configs: https://cloud.google.com/retail/docs/configs
- Google Cloud Python Retail API reference, Model: https://cloud.google.com/python/docs/reference/retail/latest/google.cloud.retail_v2.types.Model
- Google Cloud Python Retail API reference, ModelServiceClient.create_model: https://cloud.google.com/python/docs/reference/retail/latest/google.cloud.retail_v2.services.model_service.ModelServiceClient
- Google Cloud Python Retail API reference, UserEvent: https://cloud.google.com/python/docs/reference/retail/latest/google.cloud.retail_v2.types.UserEvent
- Google Cloud Python Retail API reference, ProductDetail: https://cloud.google.com/python/docs/reference/retail/latest/google.cloud.retail_v2.types.ProductDetail
- Google Cloud Python Retail API reference, PredictRequest: https://cloud.google.com/python/docs/reference/retail/latest/google.cloud.retail_v2.types.PredictRequest
- Google Cloud Python Retail API reference, PredictResponse.PredictionResult: https://cloud.google.com/python/docs/reference/retail/latest/google.cloud.retail_v2.types.PredictResponse.PredictionResult

## Issues Found
- The prerequisites understated the Frequently Bought Together data requirements as 30 days and 100 purchase events. Updated them to the documented requirements: 1,000 `purchase-complete` events, 100 unique catalog items, and either 90 days of purchase events in the last year or 10 purchase occurrences per catalog item on average.
- The post implied the rejoin API validates all quantity and minimum data requirements. Clarified that it rejoins previously unjoined events after catalog updates.
- The model creation code used the invalid `ctr` optimization objective for a Frequently Bought Together model. Updated it to `revenue-per-order`.
- The model creation code did not set the required model resource name, and the later status check expected a model ID. Added a stable model ID and full model resource name.
- The model training time was described as several hours with a 24-hour timeout. Updated it to the documented 2-5 day initial training and tuning window with a matching timeout.
- The prediction code used the legacy `placements` path and assumed `result.product` exists. Updated it to use `servingConfigs` and parse returned product data from `result.metadata["product"]`, which is how `returnProduct` is documented.
- The summary repeated the outdated 30-day training guidance. Updated it to refer to the official minimum data requirements.

## Review Notes
The JavaScript frontend example is intentionally simplified and assumes the backend returns sanitized product data. In a production implementation, avoid inserting untrusted product fields with `innerHTML`.
