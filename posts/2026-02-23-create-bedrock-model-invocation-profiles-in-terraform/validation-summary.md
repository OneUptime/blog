# Validation Summary: How to Create Bedrock Model Invocation Profiles in Terraform

## Status
validated

## Post Type
Tutorial / infrastructure guide

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- Amazon Bedrock
- Amazon S3
- Amazon CloudWatch Logs and Metrics
- AWS KMS
- AWS IAM

## Sources Consulted
- Terraform AWS Provider `aws_bedrock_foundation_models` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/bedrock_foundation_models
- Terraform AWS Provider `aws_bedrock_model_invocation_logging_configuration` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/bedrock_model_invocation_logging_configuration
- Terraform AWS Provider `aws_bedrock_guardrail` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/bedrock_guardrail
- Terraform AWS Provider `aws_bedrock_guardrail_version` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/bedrock_guardrail_version
- Terraform AWS Provider `aws_bedrock_provisioned_model_throughput` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/bedrock_provisioned_model_throughput
- Amazon Bedrock model access documentation: https://docs.aws.amazon.com/bedrock/latest/userguide/model-access.html
- Amazon Bedrock model invocation logging documentation: https://docs.aws.amazon.com/bedrock/latest/userguide/model-invocation-logging.html
- Amazon Bedrock CloudWatch monitoring documentation: https://docs.aws.amazon.com/bedrock/latest/userguide/monitoring.html
- Amazon Bedrock guardrail IAM enforcement documentation: https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-permissions-id.html
- Amazon Bedrock service authorization reference: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonbedrock.html
- Amazon Bedrock Provisioned Throughput supported models: https://docs.aws.amazon.com/bedrock/latest/userguide/prov-thru-supported.html
- CloudWatch Logs KMS encryption documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/encrypt-log-data-kms.html

## Issues Found
- Updated outdated Bedrock model access language. Current AWS documentation says foundation model access in commercial Regions is enabled by default when the caller has the required AWS Marketplace permissions, with provider-specific prerequisites such as Anthropic's first-time use form.
- Replaced the inaccurate description claim that the post covers custom model imports with provisioned throughput, which is what the post actually demonstrates.
- Added an explicit S3 bucket policy for Bedrock invocation logging with `bedrock.amazonaws.com`, `aws:SourceAccount`, and `aws:SourceArn`, matching AWS logging destination guidance.
- Corrected the Terraform logging block from `cloud_watch_config` to `cloudwatch_config`, which is the AWS provider schema name.
- Corrected the CloudWatch Logs KMS service principal from `logs.amazonaws.com` to the regional `logs.us-east-1.amazonaws.com` principal and added the CloudWatch Logs encryption context condition.
- Added confused-deputy protection conditions to the Bedrock logging IAM role trust policy and Bedrock KMS key statement.
- Removed the unnecessary S3 permission from the CloudWatch logging role policy and scoped the CloudWatch Logs resource to the documented Bedrock log stream ARN format.
- Replaced invalid provisioned throughput `commitment_duration = "NO_COMMITMENT"` with `OneMonth`, one of the valid Terraform provider values.
- Updated the provisioned throughput model ARN to use the required contextual variant for Claude 3 Sonnet Provisioned Throughput in `us-east-1`.
- Updated the IAM guardrail enforcement example to use a versioned guardrail identifier and `StringEquals` / `StringNotEquals`, matching the Bedrock guardrail enforcement examples.
- Softened the provisioned throughput explanation from eliminating throttling to reducing throttling, because reserved capacity improves predictability but does not justify an absolute guarantee in the article's wording.

## Review Notes
Terraform was not installed in the local environment, so I could not run `terraform validate`. I verified the snippets against the current official AWS and Terraform provider documentation and ran `git diff --check` for whitespace issues.
