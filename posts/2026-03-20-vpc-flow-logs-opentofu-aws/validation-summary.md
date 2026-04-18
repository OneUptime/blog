# Validation Summary: How to Enable VPC Flow Logs with OpenTofu on AWS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (Terraform-compatible IaC)
- HCL (HashiCorp Configuration Language)
- AWS VPC Flow Logs
- AWS CloudWatch Logs
- AWS S3
- AWS IAM (roles, policies, trust relationships)
- HashiCorp AWS Provider

## Sources Consulted
- Terraform AWS provider `aws_flow_log` resource docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/flow_log
- Terraform AWS provider `aws_s3_bucket` resource docs (deprecation of inline `lifecycle_rule`): https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket
- Terraform AWS provider `aws_s3_bucket_lifecycle_configuration` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_lifecycle_configuration
- Terraform AWS provider `aws_cloudwatch_log_group` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_log_group
- Terraform AWS provider `aws_iam_role` / `aws_iam_role_policy` docs
- AWS VPC Flow Logs user guide (log record fields and format): https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs-records-examples.html
- AWS VPC Flow Logs publishing to CloudWatch Logs IAM role guide: https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs-cwl.html
- AWS VPC Flow Logs publishing to S3 guide: https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs-s3.html
- OpenTofu CLI docs (tofu init / plan / apply): https://opentofu.org/docs/cli/commands/

## Issues Found
No technical issues found.

All code and claims verified:
- `aws_iam_role` trust policy uses the correct service principal `vpc-flow-logs.amazonaws.com`.
- IAM permission actions (`logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents`, `logs:DescribeLogGroups`, `logs:DescribeLogStreams`) match AWS's standard recommended set for VPC Flow Logs publishing to CloudWatch Logs.
- `aws_flow_log` with `log_destination = aws_cloudwatch_log_group.flowlogs.arn` (default `log_destination_type` of `cloud-watch-logs`) is valid.
- S3 configuration correctly uses `log_destination_type = "s3"`, an S3 bucket ARN with a prefix, and omits `iam_role_arn` (not required/used for S3 destination).
- `aws_s3_bucket_lifecycle_configuration` is the current non-deprecated resource (the inline `lifecycle_rule` block on `aws_s3_bucket` was deprecated in AWS provider v4).
- Custom log format fields (version, account-id, interface-id, srcaddr, dstaddr, srcport, dstport, protocol, packets, bytes, action, tcp-flags) are all valid VPC Flow Log v2–v5 fields.
- Terraform escaping `$${field}` correctly produces literal `${field}` placeholders required by the AWS flow log format.
- `tofu init`, `tofu plan`, `tofu apply` are correct OpenTofu CLI commands.

## Review Notes
- The post implicitly depends on a `data "aws_caller_identity" "current" {}` data source (referenced on the S3 bucket name) and an `aws_vpc.main` resource plus `var.vpc_name` / `var.environment` variables, none of which are shown. This is a minor stylistic/context omission, not a technical error — they are standard Terraform patterns the reader is expected to already have declared.
- For S3 flow log destinations, AWS typically requires a bucket policy granting `delivery.logs.amazonaws.com` permissions to write. The post does not explicitly show this; AWS Flow Logs will attempt to add the policy automatically when created via the console, but when provisioned via API/Terraform users occasionally need to add it explicitly (e.g., via `aws_s3_bucket_policy`). Not wrong, but worth flagging as a future enhancement for completeness.
- The CloudWatch log group ARN can be passed with or without a trailing `:*`; the value returned by `aws_cloudwatch_log_group.*.arn` is accepted by the AWS Flow Logs API as used here.
