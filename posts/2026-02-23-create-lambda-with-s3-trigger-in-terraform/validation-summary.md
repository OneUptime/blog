# Validation Summary: How to Create Lambda with S3 Trigger in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- AWS Lambda
- Amazon S3 event notifications
- AWS IAM
- Amazon SQS dead-letter queues
- Python
- Boto3

## Sources Consulted
- Terraform AWS Provider documentation for `aws_s3_bucket_notification`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_notification
- Terraform AWS Provider documentation for `aws_lambda_permission`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_permission
- Terraform AWS Provider documentation for `aws_lambda_function`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- AWS Lambda documentation for Python runtimes: https://docs.aws.amazon.com/lambda/latest/dg/lambda-python.html
- Amazon S3 documentation for event notification prefix and suffix filtering: https://docs.aws.amazon.com/AmazonS3/latest/userguide/notification-how-to-filtering.html
- AWS Lambda documentation for S3 triggers: https://docs.aws.amazon.com/lambda/latest/dg/with-s3-example.html
- AWS Lambda documentation for asynchronous invocation records and dead-letter queues: https://docs.aws.amazon.com/lambda/latest/dg/invocation-async-retain-records.html
- AWS Lambda documentation for recursive loop detection: https://docs.aws.amazon.com/lambda/latest/dg/invocation-recursion.html

## Issues Found
- The first Terraform example included `TABLE_NAME = var.dynamodb_table_name`, but the post did not define that variable and the Lambda handler did not use it. I removed the unused environment variable so the example is self-contained.
- The infinite loop warning stated that writing back to the same triggering bucket necessarily creates an infinite loop until concurrency limits or billing impact occur. AWS Lambda now includes recursive loop detection for supported S3, SQS, and SNS loops, so I updated the wording to describe the risk accurately while preserving the recommendation to avoid same-bucket recursion.

## Review Notes
The Terraform resources and arguments shown for S3 bucket notifications, Lambda permissions, Lambda packaging, Lambda dead-letter configuration, and prefix/suffix filters match current provider and AWS documentation. Python 3.12 remains a supported Lambda runtime as of the review date.
