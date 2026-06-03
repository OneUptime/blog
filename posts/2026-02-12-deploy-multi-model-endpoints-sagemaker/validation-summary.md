# Validation Summary: How to Deploy Multi-Model Endpoints with SageMaker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon SageMaker AI Multi-Model Endpoints
- SageMaker Python SDK
- Boto3
- Amazon S3
- Amazon CloudWatch
- Application Auto Scaling
- XGBoost inference containers
- Python

## Sources Consulted
- Amazon SageMaker AI multi-model endpoints: https://docs.aws.amazon.com/sagemaker/latest/dg/multi-model-endpoints.html
- Invoke a Multi-Model Endpoint: https://docs.aws.amazon.com/sagemaker/latest/dg/invoke-multi-model-endpoint.html
- Set SageMaker AI multi-model endpoint model caching behavior: https://docs.aws.amazon.com/sagemaker/latest/dg/multi-model-caching.html
- Amazon SageMaker AI metrics in Amazon CloudWatch: https://docs.aws.amazon.com/sagemaker/latest/dg/monitoring-cloudwatch.html
- Build Your Own Container for SageMaker AI Multi-Model Endpoints: https://docs.aws.amazon.com/sagemaker/latest/dg/build-multi-model-build-container.html
- Define a scaling policy for SageMaker endpoints: https://docs.aws.amazon.com/sagemaker/latest/dg/endpoint-auto-scaling-add-code-define.html
- Deploy models with Amazon SageMaker Serverless Inference: https://docs.aws.amazon.com/sagemaker/latest/dg/serverless-endpoints.html
- Amazon SageMaker AI pricing: https://aws.amazon.com/sagemaker-ai/pricing/
- AWS public pricing offer feed for Amazon SageMaker in us-east-1: https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonSageMaker/current/us-east-1/index.json

## Issues Found
- The monthly cost estimate for a single `ml.m5.xlarge` endpoint was too high and not region-qualified. Updated it to roughly $170/month for real-time inference hosting in `us-east-1`, based on the current public AWS pricing feed price of $0.23 per hosting hour.
- The cache eviction explanation stated that SageMaker evicts the least recently used model. AWS documentation describes unloading unused cached models when memory is high, so the wording was corrected to avoid claiming a specific LRU policy.
- The model removal example said to "just delete from S3." AWS documentation says to stop sending requests and delete the model from S3, so the comment and output text were updated.
- The custom container section implied a plain `inference.py` implements the multi-model server protocol. Updated the wording to state that an MME-capable CPU container should use SageMaker Inference Toolkit or Multi Model Server, and adjusted the snippet label and loading comment.
- The monitoring section described model-level metrics even though the shown CloudWatch dimensions are endpoint and variant level for MME loading metrics. Updated the wording to "MME loading metrics."
- The CloudWatch `ModelLoadingWaitTime` metric is emitted in microseconds, but the example printed values as milliseconds. Updated the example to divide by 1000 before printing `ms`.
- The CloudWatch timestamp arguments were plain strings. Updated them to timezone-aware `datetime` values, which match Boto3's timestamp parameter expectations.

## Review Notes
The remaining examples use current SageMaker and Boto3 API shapes, including `MultiDataModel`, `TargetModel`, `SageMakerVariantInvocationsPerInstance`, and the `ModelLoadingWaitTime` metric. Python snippets were parsed with `ast` for syntax validation, but no AWS calls were executed.
