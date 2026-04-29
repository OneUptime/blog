# Validation Summary: How to Create Lambda Event Source Mappings for Kinesis with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS Lambda
- Amazon Kinesis Data Streams
- Amazon SQS
- AWS Identity and Access Management (IAM)
- Python 3.12
- HashiCorp AWS provider
- HashiCorp archive provider

## Sources Consulted
- AWS Lambda: Using Lambda to process records from Amazon Kinesis Data Streams: https://docs.aws.amazon.com/lambda/latest/dg/with-kinesis.html
- AWS Lambda: Process Amazon Kinesis Data Streams records with Lambda: https://docs.aws.amazon.com/lambda/latest/dg/services-kinesis-create.html
- AWS Lambda: Lambda parameters for Amazon Kinesis Data Streams event source mappings: https://docs.aws.amazon.com/lambda/latest/dg/services-kinesis-parameters.html
- AWS Lambda API Reference: CreateEventSourceMapping: https://docs.aws.amazon.com/lambda/latest/api/API_CreateEventSourceMapping.html
- AWS Lambda: Retain discarded batch records for a Kinesis Data Streams event source in Lambda: https://docs.aws.amazon.com/lambda/latest/dg/kinesis-on-failure-destination.html
- AWS Lambda: Defining Lambda function permissions with an execution role: https://docs.aws.amazon.com/lambda/latest/dg/lambda-intro-execution-role.html
- AWS Managed Policy Reference: AWSLambdaKinesisExecutionRole: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AWSLambdaKinesisExecutionRole.html
- AWS Service Authorization Reference: Actions, resources, and condition keys for Amazon Kinesis Data Streams: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonkinesisdatastreams.html
- AWS Lambda runtimes: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- OpenTofu `init`: https://opentofu.org/docs/cli/init/
- OpenTofu `plan`: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply`: https://opentofu.org/docs/cli/commands/apply/
- Terraform Registry: `aws_lambda_event_source_mapping`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_event_source_mapping
- Terraform Registry: `aws_kinesis_stream`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/kinesis_stream
- Terraform Registry: `archive_file`: https://registry.terraform.io/providers/hashicorp/archive/latest/docs/data-sources/archive_file

## Issues Found
- **Incomplete and incorrect Lambda IAM example**: The original Step 2 snippet referenced `aws_iam_role.lambda` and `data.archive_file.zip` without defining them, and the inline Kinesis policy was not a reliable example for Lambda consumption. I replaced it with a proper Lambda execution role, attached the AWS-managed `AWSLambdaKinesisExecutionRole` policy, and added a valid `archive_file` data source so the shown `aws_lambda_function` example is internally consistent.
- **Incorrect SQS failure-destination behavior and missing permission**: The post described the SQS destination as receiving failed Kinesis record batches. AWS documents that SQS receives discarded invocation records containing metadata, not the original batch payload. I updated the wording and added the required `sqs:SendMessage` permission for the function execution role.
- **Incomplete `AT_TIMESTAMP` guidance**: The original event source mapping comment implied `AT_TIMESTAMP` alone was sufficient. AWS requires `StartingPositionTimestamp` when using `AT_TIMESTAMP`, so I corrected the note accordingly.
- **Incorrect shard metadata extraction in the Python example**: The code used `eventSourceARN` as if it contained the shard ID. In Lambda’s Kinesis event structure, `eventSourceARN` contains the stream ARN, while the shard identifier is embedded in `eventID`. I updated the code to log the stream name from `eventSourceARN` and the shard ID from `eventID`.
- **Incorrect ordering guarantee in the conclusion**: The post claimed that parallelization preserves shard-level ordering. AWS documents that when `ParallelizationFactor` is increased, Lambda preserves ordering at the partition-key level. I corrected the conclusion to match the documented behavior.

## Review Notes
- `batch_size = 1000`, `parallelization_factor = 5`, `maximum_batching_window_in_seconds = 10`, `maximum_retry_attempts = 3`, and `maximum_record_age_in_seconds = 3600` are valid settings for a Kinesis event source mapping.
- With `batch_size` greater than 10, AWS requires `maximum_batching_window_in_seconds` to be at least 1. The example satisfies that requirement.
- `maximum_record_age_in_seconds = 3600` is valid; AWS notes that values between 0 and 59 are not allowed even though the absolute range includes `-1`.
- `python3.12` is a currently supported AWS Lambda runtime as of April 29, 2026.
