# Validation Summary: How to Implement CIS Benchmark Controls with OpenTofu on AWS

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS
- AWS CloudTrail
- Amazon CloudWatch Logs
- Amazon CloudWatch Alarms
- Amazon S3
- AWS IAM
- Amazon VPC security groups
- Terraform AWS provider syntax used by OpenTofu

## Sources Consulted
- AWS Security Hub CIS AWS Foundations Benchmark reference: https://docs.aws.amazon.com/securityhub/latest/userguide/cis-aws-foundations-benchmark.html
- AWS Security Hub CloudWatch controls reference: https://docs.aws.amazon.com/securityhub/latest/userguide/cloudwatch-controls.html
- AWS Security Hub CloudTrail controls reference: https://docs.aws.amazon.com/securityhub/latest/userguide/cloudtrail-controls.html
- Terraform AWS provider `aws_cloudtrail` resource docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudtrail
- Terraform AWS provider `aws_cloudwatch_log_metric_filter` resource docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_log_metric_filter
- Terraform AWS provider `aws_cloudwatch_metric_alarm` resource docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- Terraform AWS provider `aws_default_security_group` resource docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/default_security_group
- Terraform AWS provider `aws_iam_account_password_policy` resource docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_account_password_policy
- Terraform AWS provider `aws_s3_account_public_access_block` resource docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_account_public_access_block
- OpenTofu `tofu plan` command docs: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu module source docs: https://opentofu.org/docs/language/modules/sources/

## Issues Found
- The post presented CIS section numbers and categories as fixed, but current AWS Security Hub mappings vary by CIS AWS Foundations Benchmark version. I added a short version caveat and changed the headings/comments to describe control intent instead of pinning incorrect or ambiguous IDs.
- The CloudTrail example used an invalid S3 data event selector value of `arn:aws:s3:::`. I corrected it to `arn:aws:s3`, which is the documented value for logging all S3 object events with a basic event selector.
- The CloudTrail encryption example was shown as a separate `aws_cloudtrail` resource with only `kms_key_id`, which is not a valid standalone implementation. I moved `kms_key_id` into the primary trail resource and also added the documented CloudWatch Logs integration fields needed by the monitoring examples.
- The CloudWatch alarm examples referenced custom metrics that were never created, so they did not actually implement the CIS monitoring checks. I replaced them with `aws_cloudwatch_log_metric_filter` plus `aws_cloudwatch_metric_alarm` resources using the official AWS Security Hub metric filter patterns for unauthorized API calls and root user activity.
- The module example referenced `terraform-aws-modules/security-group/aws`, which is a generic security group module rather than a CIS baseline module. I replaced it with a local module source example that is technically correct OpenTofu syntax without misrepresenting what the module provides.

## Review Notes
- The password policy snippet includes `max_password_age = 90`, which aligns with older CIS AWS Foundations versions but is no longer part of newer benchmark versions such as v5.0.0. I left it in place because it is still technically valid and the post now explicitly notes that control IDs vary by benchmark version.
- The snippets remain partial examples and assume related resources such as the CloudTrail S3 bucket, KMS key, CloudWatch log group, IAM role, and SNS topic are defined elsewhere in the configuration.
