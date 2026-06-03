# Validation Summary: How to Use Amazon Bedrock Batch Inference

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon Bedrock batch inference
- Amazon S3
- AWS IAM
- Boto3 and botocore
- Anthropic Claude Messages API on Amazon Bedrock
- JSON Lines

## Sources Consulted
- Amazon Bedrock User Guide: Process multiple prompts with batch inference: https://docs.aws.amazon.com/bedrock/latest/userguide/batch-inference.html
- Amazon Bedrock User Guide: Format and upload your batch inference data: https://docs.aws.amazon.com/bedrock/latest/userguide/batch-inference-data.html
- Amazon Bedrock User Guide: Create a batch inference job: https://docs.aws.amazon.com/bedrock/latest/userguide/batch-inference-create.html
- Amazon Bedrock User Guide: View the results of a batch inference job: https://docs.aws.amazon.com/bedrock/latest/userguide/batch-inference-results.html
- Amazon Bedrock User Guide: Create a custom service role for batch inference: https://docs.aws.amazon.com/bedrock/latest/userguide/batch-iam-sr.html
- Amazon Bedrock User Guide: Supported Regions and models for batch inference: https://docs.aws.amazon.com/bedrock/latest/userguide/batch-inference-supported.html
- Botocore reference: create_model_invocation_job: https://docs.aws.amazon.com/botocore/latest/reference/services/bedrock/client/create_model_invocation_job.html
- Botocore reference: get_model_invocation_job: https://docs.aws.amazon.com/botocore/latest/reference/services/bedrock/client/get_model_invocation_job.html
- Amazon Bedrock pricing: https://aws.amazon.com/bedrock/pricing/
- Amazon Bedrock User Guide: Anthropic Claude Messages API: https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-anthropic-claude-messages.html
- Linked OneUptime post: How to Use Pulumi with AWS: https://oneuptime.com/blog/post/2026-02-02-pulumi-aws-infrastructure/view

## Issues Found
- The IAM section only showed an inline permissions policy and omitted the service role trust policy required for Amazon Bedrock to assume the role. Added the trust policy and clarified that the shown S3 permissions are attached to the service role.
- The IAM S3 policy mixed bucket-level and object-level resources under combined S3 actions. Split the policy into `ReadInput`, `ListBucket`, and `WriteOutput` statements so the resource ARNs match the S3 actions.
- The monitoring example looked for a non-existent nested `stats` object and token-count fields in the `get_model_invocation_job` response. Replaced that with the current Bedrock record-count fields: `totalRecordCount`, `processedRecordCount`, `successRecordCount`, and `errorRecordCount`.
- The monitoring example treated only `Completed` as a successful terminal output state. Added handling for `PartiallyCompleted`, which still produces output files, and `Expired`, which is a documented terminal status.
- The post did not mention that the IAM identity running the script needs permissions to create and inspect Bedrock batch jobs and pass the service role. Added a short note in the IAM section.

## Review Notes
The Claude 3 Sonnet model ID, JSONL record wrapper, `create_model_invocation_job` parameters, output `.jsonl.out` behavior, and approximate 50% batch pricing discount were consistent with current official AWS documentation at review time. The pricing example is still intentionally approximate, so readers should continue checking current Bedrock pricing before using it for cost estimates.
