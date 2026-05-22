# Validation Summary: How to Handle Eventual Consistency Issues with Terraform Resources

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Terraform
- Terraform AWS provider
- Terraform time provider
- AWS IAM
- AWS Lambda
- Amazon S3 event notifications
- Amazon ECS
- AWS KMS and DNS propagation concepts
- CI/CD shell scripting

## Sources Consulted
- Terraform AWS provider documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- Terraform AWS provider versions API: https://registry.terraform.io/v1/providers/hashicorp/aws/versions
- Terraform time_sleep resource documentation: https://registry.terraform.io/providers/hashicorp/time/latest/docs/resources/sleep
- Terraform plan command and resource targeting documentation: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform resource targeting tutorial: https://developer.hashicorp.com/terraform/tutorials/state/resource-targeting
- AWS IAM troubleshooting and eventual consistency documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/troubleshoot.html
- AWS Lambda supported runtimes documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS Lambda with Amazon S3 documentation: https://docs.aws.amazon.com/lambda/latest/dg/with-s3.html
- Amazon S3 event notification permissions documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/grant-destinations-permissions-to-s3.html
- Terraform aws_s3_bucket_notification resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_notification
- Amazon S3 data consistency documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html

## Issues Found
- The Lambda examples used `nodejs18.x`. AWS Lambda lists Node.js 18 as deprecated as of September 1, 2025, with function creation blocked after August 31, 2026. Updated examples to `nodejs24.x`, which is current in the AWS Lambda runtime documentation.
- The AWS provider constraint used `~> 5.0` while the current AWS provider major version is 6.x. Updated the example to `~> 6.0` so the "recent provider version" advice remains accurate.
- The S3 notification example attributed Lambda notification validation failures to bucket policy propagation. For Lambda destinations, AWS and Terraform documentation require granting S3 permission to invoke the Lambda function. Replaced the bucket policy example with `aws_lambda_permission` and updated `depends_on` accordingly.
- The AWS provider configuration example said `max_retries = 10` increased API retries, but the current provider default is 25. Updated the example to `max_retries = 40`.

## Review Notes
Terraform CLI was not installed in the review environment, so examples were checked against official documentation rather than by running `terraform validate`. The post's use of `-target` is technically valid, but HashiCorp recommends resource targeting only for exceptional circumstances because routine use can cause drift or confusion.
