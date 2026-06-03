# Validation Summary: How to Build a Serverless File Converter with Lambda and S3

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Lambda
- Amazon S3
- Amazon SNS
- Amazon ECS Fargate
- Amazon DynamoDB
- AWS CLI
- Python
- Boto3
- Pillow
- Python-Markdown

## Sources Consulted
- AWS Lambda timeout configuration: https://docs.aws.amazon.com/lambda/latest/dg/configuration-timeout.html
- AWS Lambda ephemeral storage API: https://docs.aws.amazon.com/lambda/latest/api/API_EphemeralStorage.html
- AWS Lambda memory configuration: https://docs.aws.amazon.com/lambda/latest/operatorguide/computing-power.html
- AWS Lambda S3 event processing: https://docs.aws.amazon.com/lambda/latest/dg/with-s3.html
- AWS Lambda S3 trigger tutorial: https://docs.aws.amazon.com/lambda/latest/dg/with-s3-example.html
- AWS CLI put-bucket-notification-configuration: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-notification-configuration.html
- AWS CLI lambda add-permission: https://docs.aws.amazon.com/cli/latest/reference/lambda/add-permission.html
- AWS CLI s3 mb: https://docs.aws.amazon.com/cli/latest/reference/s3/mb.html
- Amazon S3 event message structure: https://docs.aws.amazon.com/AmazonS3/latest/userguide/notification-content-structure.html
- Amazon S3 event notification types and destinations: https://docs.aws.amazon.com/AmazonS3/latest/userguide/notification-how-to-event-types-and-destinations.html
- Boto3 ECS run_task: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/ecs/client/run_task.html
- Boto3 S3 client reference: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3.html
- AWS Lambda Python deployment packages: https://docs.aws.amazon.com/lambda/latest/dg/python-package.html
- Python datetime documentation: https://docs.python.org/3/library/datetime.html
- Pillow documentation: https://pillow.readthedocs.io/
- Python-Markdown extensions documentation: https://python-markdown.github.io/extensions/

## Issues Found
- The post claimed "zero cost when idle" and "costs nothing when nobody is uploading." This ignored ongoing S3 storage and related service costs, so the wording was narrowed to "No Lambda compute cost when idle" and "has no Lambda compute cost when nobody is uploading."
- The bucket creation example used fixed bucket names without noting that S3 bucket names must be globally unique. Added a short note instructing readers to replace the example names with available names.
- The S3 event notification command appeared before the Lambda resource-based permission command. S3 validates Lambda invoke permission during notification configuration, so the order was corrected and the explanation updated.
- The Markdown converter used the third-party Python-Markdown package without mentioning that it must be included in the Lambda deployment package or layer. Added that dependency note.
- The ECS Fargate routing snippet used `os.environ` without importing `os`. Added the missing import.
- Later snippets passed the raw S3 event object key through to ECS and S3 copy operations. S3 event object keys are URL encoded, so `unquote_plus` was added where those snippets consume the key.
- The DynamoDB status tracking snippet used `boto3` and `datetime` without imports. Added the imports.
- The DynamoDB status tracking snippet used `datetime.utcnow()`, which is deprecated in Python 3.12. Replaced it with `datetime.now(UTC)`.
- The error handling snippet was labeled as using a dead-letter queue, but the snippet copies the failed object and publishes to SNS rather than configuring a DLQ. Updated the comment to match the code.

## Review Notes
The Python code blocks were syntax-checked locally with `compile()`. The AWS CLI is not installed in this workspace, so CLI command verification was performed against official AWS CLI documentation rather than local `--help` output.
