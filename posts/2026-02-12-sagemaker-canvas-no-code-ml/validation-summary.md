# Validation Summary: How to Use SageMaker Canvas for No-Code ML

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon SageMaker Canvas
- Amazon SageMaker Studio
- Amazon SageMaker AutoML/Autopilot
- Amazon SageMaker Model Registry
- Amazon SageMaker hosted endpoints
- Amazon SageMaker Model Monitor
- Amazon S3
- Amazon Athena
- Amazon Redshift
- Snowflake
- Salesforce Data Cloud
- Python
- boto3
- SageMaker Python SDK

## Sources Consulted
- Amazon SageMaker Canvas overview: https://docs.aws.amazon.com/sagemaker/latest/dg/canvas.html
- Amazon SageMaker Canvas custom models: https://docs.aws.amazon.com/sagemaker/latest/dg/canvas-custom-models.html
- Amazon SageMaker Canvas model building: https://docs.aws.amazon.com/sagemaker/latest/dg/canvas-build-model.html
- Amazon SageMaker Canvas data import: https://docs.aws.amazon.com/sagemaker/latest/dg/canvas-importing-data.html
- Amazon SageMaker Canvas external data sources: https://docs.aws.amazon.com/sagemaker/latest/dg/canvas-connecting-external.html
- Amazon SageMaker Canvas pricing: https://aws.amazon.com/sagemaker/canvas/pricing/
- SageMaker CanvasAppSettings API reference: https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CanvasAppSettings.html
- SageMaker IdentityProviderOAuthSetting API reference: https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_IdentityProviderOAuthSetting.html
- boto3 update_user_profile reference: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/sagemaker/client/update_user_profile.html
- Amazon SageMaker AutoML real-time deployment documentation: https://docs.aws.amazon.com/sagemaker/latest/dg/autopilot-deploy-models-realtime.html
- boto3 create_model reference: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/sagemaker/client/create_model.html

## Issues Found
- The S3 import section said it showed an S3 import through the API, but the code only prepares a CSV and uploads it to S3. Changed the sentence to say it prepares data for an S3 import.
- The build-type timing was too specific and partially outdated. AWS documents Quick Build as a faster option and Standard Build as accuracy-focused, with timing varying by model type and runtime settings. Reworded the timing claim to avoid inaccurate fixed ranges.
- The results section referred to "overall accuracy" for all model types. Regression and forecasting models use other performance metrics, so this was changed to "overall performance metric."
- The programmatic deployment example used the SageMaker SDK `Model(containers=...)` shape, which is not the documented deployment flow for AutoML `InferenceContainers`. Replaced it with the documented boto3 sequence: `create_model`, `create_endpoint_config`, and `create_endpoint`.
- The data connection example was labeled as creating an Athena connection, but the API fields shown configure OAuth for Salesforce Data Cloud or Snowflake. Updated the text and comments to correctly describe OAuth configuration, and noted that Athena access depends on the user's execution role permissions.
- The pricing section omitted current Canvas billing categories for data processing and prediction/ready-to-use model usage. Added those categories while keeping the original cost guidance intact.

## Review Notes
The post is technically relevant and current after the corrections. The remaining examples use placeholder domain IDs, bucket names, job names, roles, and account IDs, so they are illustrative and require replacement with real AWS resources before execution.
