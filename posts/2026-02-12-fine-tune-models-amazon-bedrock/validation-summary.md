# Validation Summary: How to Fine-Tune Models with Amazon Bedrock

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon Bedrock
- Amazon Bedrock model customization and fine-tuning
- Amazon S3
- AWS IAM roles for Bedrock model customization
- AWS SDK for Python (Boto3)
- Python
- JSONL training datasets
- Provisioned Throughput

## Sources Consulted
- Amazon Bedrock fine-tuning overview and supported models: https://docs.aws.amazon.com/bedrock/latest/userguide/custom-model-fine-tuning.html
- Amazon Bedrock fine-tuning dataset preparation: https://docs.aws.amazon.com/bedrock/latest/userguide/model-customization-prepare.html
- Amazon Bedrock CreateModelCustomizationJob API reference: https://docs.aws.amazon.com/bedrock/latest/APIReference/API_CreateModelCustomizationJob.html
- Amazon Bedrock GetModelCustomizationJob API reference: https://docs.aws.amazon.com/bedrock/latest/APIReference/API_GetModelCustomizationJob.html
- Amazon Bedrock model customization code samples: https://docs.aws.amazon.com/bedrock/latest/userguide/model-customization-code-samples.html
- Amazon Bedrock custom model hyperparameters: https://docs.aws.amazon.com/bedrock/latest/userguide/custom-models-hp.html
- Amazon Bedrock custom model inference setup: https://docs.aws.amazon.com/bedrock/latest/userguide/model-customization-use.html
- Amazon Bedrock Provisioned Throughput overview: https://docs.aws.amazon.com/bedrock/latest/userguide/prov-throughput.html
- Amazon Bedrock CreateProvisionedModelThroughput API reference: https://docs.aws.amazon.com/bedrock/latest/APIReference/API_CreateProvisionedModelThroughput.html
- Boto3 create_provisioned_model_throughput reference: https://docs.aws.amazon.com/boto3/latest/reference/services/bedrock/client/create_provisioned_model_throughput.html

## Issues Found
- The JSONL validation script incremented `valid_count` when `completion` was present even if `prompt` was missing or invalid. Updated the script to track each row with an `is_valid` flag and count only rows with valid `prompt` and `completion` fields.
- The JSONL validation script called `.strip()` without confirming the values were strings. Updated the checks to require string values before accepting non-empty `prompt` and `completion` fields.
- The Provisioned Throughput example used `arn:aws:bedrock:us-east-1:123456789012:custom-model/medical-summarization-model`, which does not match the documented custom model ARN shape. Updated the example to pass the custom model name, which the API accepts for custom models.

## Review Notes
The remaining Bedrock API names, response fields, job status values, dataset format, Titan Text hyperparameter names, and Provisioned Throughput invocation pattern match current AWS documentation. The post still uses Amazon Titan Text Express for the examples; AWS documentation continues to include Titan Text examples for model customization code samples, while newer fine-tuning guidance also lists newer supported model families. Verified that all Python code blocks parse with `python3` and that the linked local pricing post exists.
