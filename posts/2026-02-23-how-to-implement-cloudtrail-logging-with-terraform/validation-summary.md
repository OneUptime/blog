# Validation Summary: How to Implement CloudTrail Logging with Terraform

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Terraform
- AWS CloudTrail
- Amazon S3
- AWS KMS
- Amazon CloudWatch Logs
- Amazon CloudWatch alarms and metric filters
- Amazon SNS
- AWS IAM policies

## Sources Consulted
- Terraform AWS provider `aws_cloudtrail` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudtrail
- Terraform AWS provider `aws_s3_bucket_lifecycle_configuration` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_lifecycle_configuration
- Terraform AWS provider `aws_cloudwatch_log_metric_filter` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_log_metric_filter
- AWS CloudTrail S3 bucket policy documentation: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/create-s3-bucket-policy-for-cloudtrail.html
- AWS CloudTrail KMS encryption documentation: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/encrypting-cloudtrail-log-files-with-aws-kms.html
- AWS CloudTrail data resource API documentation: https://docs.aws.amazon.com/awscloudtrail/latest/APIReference/API_DataResource.html
- AWS CloudTrail global service events documentation: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-concepts.html#cloudtrail-concepts-global-service-events
- AWS CloudTrail CloudWatch Logs role policy documentation: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-required-policy-for-cloudwatch-logs.html
- Amazon CloudWatch Logs KMS encryption documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/encrypt-log-data-kms.html
- Amazon SNS KMS key management documentation: https://docs.aws.amazon.com/sns/latest/dg/sns-key-management.html
- AWS CIS Foundations Benchmark metric filter guidance: https://d0.awsstatic.com/whitepapers/compliance/AWS_CIS_Foundations_Benchmark.pdf

## Issues Found
- The introduction stated that CloudTrail records every API call and every resource change. CloudTrail records supported account activity, and data events are not logged by default, so this wording was narrowed to avoid overclaiming.
- The guide said it covered organization-wide logging, but the code does not create an organization trail or organization bucket policy. The wording was changed to multi-region logging, which matches the provided Terraform.
- The KMS key policy allowed CloudTrail to use the key but did not include CloudTrail's documented encryption context condition for `kms:GenerateDataKey*`. Added that condition and split `kms:DescribeKey` into its own CloudTrail statement.
- The KMS key policy did not allow CloudWatch Logs to use the key for the encrypted log group. Added a CloudWatch Logs service principal statement scoped to the log group's encryption context.
- The SNS topic used the same customer managed KMS key for encryption, but CloudWatch alarms need KMS permissions to publish to an encrypted SNS topic. Added a CloudWatch alarms service principal statement for `kms:Decrypt` and `kms:GenerateDataKey*`.
- The unauthorized API call filter used `*UnauthorizedAccess*`, which is not the standard CloudTrail error code pattern used for unauthorized API calls. Updated it to match `*UnauthorizedOperation` and `AccessDenied*`.

## Review Notes
The Terraform snippets are still illustrative and assume supporting declarations such as `var.project`, `var.region`, `var.environment`, `var.security_team_role_arn`, and `data.aws_caller_identity.current` exist elsewhere in the Terraform configuration. For production modules, consider using `data.aws_partition.current` when constructing ARNs so the examples also work in non-commercial AWS partitions.
