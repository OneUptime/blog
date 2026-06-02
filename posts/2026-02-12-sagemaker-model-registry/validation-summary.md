# Validation Summary: How to Use SageMaker Model Registry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon SageMaker Model Registry
- Amazon SageMaker Pipelines
- Amazon SageMaker Python SDK
- Boto3 for SageMaker and EventBridge
- Amazon S3 model artifacts and metrics
- Amazon EventBridge notifications
- XGBoost built-in SageMaker image

## Sources Consulted
- AWS Boto3 `create_model_package` documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/sagemaker/client/create_model_package.html
- AWS Boto3 `describe_model_package` documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/sagemaker/client/describe_model_package.html
- AWS Boto3 `list_model_packages` documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/sagemaker/client/list_model_packages.html
- AWS Boto3 `update_model_package` documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/sagemaker/client/update_model_package.html
- AWS Boto3 `delete_model_package` documentation: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/sagemaker/client/delete_model_package.html
- AWS SageMaker deployment from Model Registry documentation: https://docs.aws.amazon.com/sagemaker/latest/dg/model-registry-deploy.html
- AWS SageMaker Pipeline step documentation: https://docs.aws.amazon.com/sagemaker/latest/dg/build-and-manage-steps-types.html
- AWS SageMaker pipeline definition documentation: https://docs.aws.amazon.com/sagemaker/latest/dg/define-pipeline.html
- AWS SageMaker EventBridge events documentation: https://docs.aws.amazon.com/sagemaker/latest/dg/automating-sagemaker-with-eventbridge.html
- AWS SageMaker XGBoost built-in algorithm documentation: https://docs.aws.amazon.com/sagemaker/latest/dg/xgboost-how-to-use.html

## Issues Found
- The pipeline registration example used `RegisterModel`. AWS documentation now recommends `ModelStep` for registering models as of SageMaker Python SDK v2.90.0, while `RegisterModel` is no longer actively supported. I changed the example to use `Model`, `model.register(...)`, and `ModelStep`.
- The model comparison example called `describe_model_package(ModelPackageArn=version)`, but the boto3 parameter is `ModelPackageName`; the value can still be an ARN. I changed the keyword argument to `ModelPackageName`.
- The EventBridge example used `json.dumps(...)` without importing `json` in that snippet. I added `import json`.

## Review Notes
The examples are illustrative and assume existing AWS credentials, IAM permissions, S3 buckets, model artifacts, metrics files, and pipeline variables such as `pipeline_session`, `training_step`, and `xgb_image`. The reviewed boto3 API shapes, approval statuses, model package listing/deletion behavior, deployment from a model package ARN, EventBridge event fields, and XGBoost `1.7-1` image retrieval are consistent with official AWS documentation.
