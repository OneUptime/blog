# Validation Summary: How to Build a Demand Forecasting System with AWS Forecast

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Forecast
- AWS SDK for Python (Boto3)
- Amazon S3
- AWS Lambda
- AWS Step Functions
- Amazon EventBridge
- Time-series forecasting

## Sources Consulted
- Amazon Forecast service page: https://aws.amazon.com/forecast/
- Amazon Forecast AMS note on new customer access closure: https://docs.aws.amazon.com/managedservices/latest/onboardingguide/forecast.html
- Amazon Forecast CreateDatasetGroup API reference: https://docs.aws.amazon.com/forecast/latest/dg/API_CreateDatasetGroup.html
- Boto3 CreateDataset reference: https://docs.aws.amazon.com/boto3/latest/reference/services/forecast/client/create_dataset.html
- Amazon Forecast CreateAutoPredictor API reference: https://docs.aws.amazon.com/forecast/latest/dg/API_CreateAutoPredictor.html
- Amazon Forecast Training Predictors guide: https://docs.aws.amazon.com/forecast/latest/dg/howitworks-predictor.html
- Boto3 GetAccuracyMetrics reference: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/forecast/client/get_accuracy_metrics.html
- Amazon Forecast CreateForecast API reference: https://docs.aws.amazon.com/forecast/latest/dg/API_CreateForecast.html
- Boto3 QueryForecast reference: https://docs.aws.amazon.com/boto3/latest/reference/services/forecastquery/client/query_forecast.html
- Amazon Forecast Related Time Series guide: https://docs.aws.amazon.com/forecast/latest/dg/related-time-series-datasets.html
- Amazon Forecast pricing: https://aws.amazon.com/forecast/pricing/

## Issues Found
- Amazon Forecast is no longer available to new AWS customers. Added the current availability caveat, including the July 29, 2024 effective date, while preserving the existing-customer tutorial value.
- The RETAIL target time series example used `target_value`, but the RETAIL domain requires `item_id`, `timestamp`, and `demand`. Updated the CSV and schema field to `demand`.
- Several Forecast resource names used hyphens, which do not match the documented name pattern for Forecast resources. Changed dataset group, dataset, import job, predictor, forecast, and export job names to use underscores.
- Placeholder AWS account IDs in ARNs used nine digits. Updated them to a 12-digit placeholder account ID.
- The dataset group snippet created a group with no dataset and never attached the target dataset. Reordered the snippet so it creates the dataset first and adds the returned dataset ARN to the dataset group.
- The predictor snippet passed `ForecastDimensions=['item_id']`, but forecast dimensions are optional attributes such as store or location, not the required item identifier. Removed that parameter from the item-only example.
- The related time series section omitted the requirement for forward-looking values through the forecast horizon. Added a short note for planned prices and promotions.
- The pricing section described forecast queries as `$0.60 per 1000 units`, which applies to forecasts generated from legacy `CreatePredictor` predictors, not the AutoPredictor flow shown in the post. Replaced the paragraph with the current imported data, training, generated forecast data point, and explainability pricing model.

## Review Notes
The post is technically relevant for existing Amazon Forecast customers, but future posts should consider Amazon SageMaker Canvas or another actively available forecasting workflow for new AWS customers because Amazon Forecast is closed to new customers and AWS does not plan to introduce new features.
