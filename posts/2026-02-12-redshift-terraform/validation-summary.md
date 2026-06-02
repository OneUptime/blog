# Validation Summary: How to Set Up Redshift with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Redshift
- AWS IAM
- Amazon S3
- AWS KMS
- Amazon VPC
- Amazon CloudWatch
- Terraform
- HashiCorp AWS Terraform provider

## Sources Consulted
- HashiCorp Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- HashiCorp Terraform variables documentation: https://developer.hashicorp.com/terraform/language/values/variables
- HashiCorp Terraform plan command documentation: https://developer.hashicorp.com/terraform/cli/commands/plan
- HashiCorp AWS provider `aws_redshift_cluster` documentation: https://registry.terraform.io/providers/hashicorp/aws/5.79.0/docs/resources/redshift_cluster
- HashiCorp AWS provider `aws_redshift_logging` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/redshift_logging
- HashiCorp AWS provider `aws_cloudwatch_metric_alarm` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm.html
- AWS Redshift parameter groups documentation: https://docs.aws.amazon.com/redshift/latest/mgmt/working-with-parameter-groups.html
- AWS Redshift workload management documentation: https://docs.aws.amazon.com/redshift/latest/mgmt/workload-mgmt-config.html
- AWS Redshift short query acceleration documentation: https://docs.aws.amazon.com/redshift/latest/dg/wlm-short-query-acceleration.html
- AWS Redshift audit logging documentation: https://docs.aws.amazon.com/redshift/latest/mgmt/db-auditing.html
- AWS Redshift CloudWatch metrics documentation: https://docs.aws.amazon.com/redshift/latest/mgmt/metrics-listing.html

## Issues Found
- The original provider constraint used `~> 5.0` while the corrected logging resource requires a newer AWS provider 5.x release. Updated it to `~> 5.54`, which supports `aws_redshift_logging`.
- The monitoring examples referenced `var.sns_topic_arn`, but the variable was not declared. Added a `sns_topic_arn` variable and included it in the sample `production.tfvars`.
- The Redshift parameter group used non-existent standalone parameter names for short query acceleration: `enable_short_query_acceleration` and `max_short_query_queue_time`. Replaced them with `wlm_json_configuration`, using `short_query_queue` and `max_execution_time` as documented by AWS.
- The original cluster used the deprecated nested `logging` block on `aws_redshift_cluster`. Replaced it with the current `aws_redshift_logging` resource.
- The S3 audit logging bucket was created without the bucket policy Redshift needs to call `s3:GetBucketAcl` and `s3:PutObject`. Added an `aws_s3_bucket_policy` and made the logging resource depend on it.
- Audit logging to S3 does not include user activity logs unless the `enable_user_activity_logging` Redshift parameter is enabled. Added that parameter to match the audit logging intent.

## Review Notes
Terraform CLI is not installed in the workspace, so I could not run `terraform validate`. The snippets were reviewed against official AWS and HashiCorp documentation. The S3 log bucket name remains an example and must be made globally unique for a real deployment.
