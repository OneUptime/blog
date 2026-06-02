# Validation Summary: How to Use SageMaker Serverless Inference

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon SageMaker Serverless Inference
- Amazon SageMaker Python SDK
- Boto3 / AWS SDK for Python
- Amazon CloudWatch metrics
- AWS pricing concepts for SageMaker inference
- XGBoost and scikit-learn SageMaker model deployment

## Sources Consulted
- Amazon SageMaker AI Developer Guide: Deploy models with Amazon SageMaker Serverless Inference: https://docs.aws.amazon.com/sagemaker/latest/dg/serverless-endpoints.html
- Amazon SageMaker AI Developer Guide: Invoke a serverless endpoint: https://docs.aws.amazon.com/sagemaker/latest/dg/serverless-endpoints-invoke.html
- Amazon SageMaker AI Developer Guide: Alarms and logs for tracking metrics from serverless endpoints: https://docs.aws.amazon.com/sagemaker/latest/dg/serverless-endpoints-monitoring.html
- Amazon SageMaker API Reference: CreateEndpointConfig: https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateEndpointConfig.html
- AWS CloudFormation Reference: AWS::SageMaker::EndpointConfig ServerlessConfig: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-sagemaker-endpointconfig-serverlessconfig.html
- Amazon SageMaker AI Developer Guide: How to use SageMaker AI XGBoost: https://docs.aws.amazon.com/sagemaker/latest/dg/xgboost-how-to-use.html
- SageMaker Python SDK documentation: ServerlessInferenceConfig: https://sagemaker.readthedocs.io/en/v2.235.0/api/inference/serverless.html
- AWS SageMaker Python SDK repository README: https://github.com/aws/sagemaker-python-sdk
- Boto3 CloudWatch get_metric_statistics documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/cloudwatch/metric/get_statistics.html
- AWS announcement: Amazon SageMaker Serverless Inference is now generally available: https://aws.amazon.com/about-aws/whats-new/2022/04/amazon-sagemaker-serverless-inference/
- AWS SageMaker pricing page: https://aws.amazon.com/sagemaker/pricing/

## Issues Found
- The post described pricing as "pay-per-request." Updated it to "pay-per-use" because AWS documents serverless inference charges by compute duration and data processed, with separate charges for provisioned concurrency when used.
- The deployment section did not state an SDK version. Added that the examples use SageMaker Python SDK 2.x, because the latest SageMaker SDK 3.x has breaking changes to older Model-style interfaces.
- The provisioned concurrency note said "if available." Updated it to a direct statement because AWS documents provisioned concurrency for SageMaker Serverless Inference.
- The pricing example implied duration-only billing. Clarified that the sample is a simplified on-demand compute-duration estimate and excludes data processing and provisioned concurrency charges.
- The monitoring section said serverless endpoints emit the same CloudWatch metrics as regular endpoints plus serverless-specific ones. Updated this because AWS documents an exhaustive subset of metrics for serverless endpoints.
- The CloudWatch example used ISO strings for `StartTime` and `EndTime`. Updated these to timezone-aware `datetime` objects to match boto3 documentation.
- The migration example showed updating an existing instance-based real-time endpoint in place to serverless. Replaced that step with creating a new serverless endpoint and updating the application to point to it, because AWS documents that instance-based real-time endpoints cannot be converted to serverless with `UpdateEndpoint`.
- The limitations section listed a 6 MB serverless request/response payload limit. Updated it to 4 MB based on the current SageMaker serverless invocation documentation.

## Review Notes
The core serverless configuration values, memory range, maximum endpoint concurrency, CPU-only limitation, cold-start explanation, and XGBoost image version example are consistent with official AWS documentation. The examples assume the user has valid IAM permissions, a SageMaker execution role, and model artifacts already uploaded to S3.
