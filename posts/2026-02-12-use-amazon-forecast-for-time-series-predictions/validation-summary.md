# Validation Summary: How to Use Amazon Forecast for Time-Series Predictions

## Status
validated

## Post Type
Technical tutorial

## Technologies Covered
- AWS
- Amazon Forecast
- Amazon S3
- AWS IAM roles
- Amazon CloudWatch Events / Amazon EventBridge
- Python
- Boto3
- Time-series forecasting

## Sources Consulted
- Amazon Forecast product page: https://aws.amazon.com/forecast
- Amazon Forecast CreateAutoPredictor API documentation: https://docs.aws.amazon.com/forecast/latest/dg/API_CreateAutoPredictor.html
- Boto3 Forecast create_dataset documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/forecast/client/create_dataset.html
- Boto3 Forecast create_dataset_group documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/forecast/client/create_dataset_group.html
- Amazon Forecast RETAIL domain documentation: https://docs.aws.amazon.com/forecast/latest/dg/retail-domain.html
- Amazon Forecast algorithms documentation: https://docs.aws.amazon.com/forecast/latest/dg/aws-forecast-choosing-recipes.html
- Amazon Forecast QueryForecast response documentation: https://docs.aws.amazon.com/forecast/latest/dg/API_forecastquery_Forecast.html
- Amazon Forecast pricing page: https://aws.amazon.com/forecast/pricing/

## Issues Found
- Amazon Forecast is no longer available to new customers. Added a service availability caveat in the introduction and conclusion so the tutorial is scoped to existing Forecast customers.
- The RETAIL target time-series example used `target_value`, but the RETAIL domain requires the target field `demand`. Updated the sample CSV and schema to use `demand`.
- The optimization metrics list omitted `AverageWeightedQuantileLoss`, which is a valid `CreateAutoPredictor` optimization metric. Added it to the list.
- The query example could raise a formatting error if a quantile list was missing, because it formatted `'N/A'` with `:.0f`. Replaced the string sentinel with `None` and added a small formatter.
- The related time-series example used `promotion_flag`, while AWS RETAIL documentation uses `promotion_applied` as the suggested promotion field. Updated the example field name.
- The related time-series explanation said future values are always required. Clarified that most algorithms require related time-series values through the forecast horizon, but CNN-QR can use related time series without future values.
- The cost section listed data storage and forecast queries as billing categories, but current AWS pricing lists imported data, predictor training, generated forecast data points, and forecast explanations. Updated the cost bullets and softened the cost guidance.

## Review Notes
Amazon Forecast remains usable for existing customers, but the service availability caveat is important for any new implementation plan. The examples use current Boto3 method names and API parameters for existing Forecast customers.
