# Validation Summary: How to Set Up EBS Snapshots and Lifecycle Policies with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS
- Amazon EBS
- Amazon Data Lifecycle Manager (DLM)
- AWS IAM

## Sources Consulted
- OpenTofu: Strings and Templates — https://opentofu.org/docs/language/expressions/strings/
- OpenTofu: `timestamp` function — https://opentofu.org/docs/language/functions/timestamp/
- Terraform AWS Provider: `aws_ebs_snapshot` — https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ebs_snapshot.html.markdown
- Terraform AWS Provider: `aws_ebs_volume` — https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ebs_volume.html.markdown
- Terraform AWS Provider: `aws_dlm_lifecycle_policy` — https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/dlm_lifecycle_policy.html.markdown
- Amazon EBS snapshots — https://docs.aws.amazon.com/ebs/latest/userguide/ebs-snapshots.html
- Create Amazon EBS snapshots — https://docs.aws.amazon.com/ebs/latest/userguide/ebs-creating-snapshot.html
- Create an Amazon EBS volume — https://docs.aws.amazon.com/ebs/latest/userguide/ebs-creating-volume.html
- IAM service roles for Amazon Data Lifecycle Manager — https://docs.aws.amazon.com/ebs/latest/userguide/service-role.html
- Control access to Amazon Data Lifecycle Manager using IAM — https://docs.aws.amazon.com/ebs/latest/userguide/dlm-prerequisites.html
- Amazon Data Lifecycle Manager `CreateRule` API — https://docs.aws.amazon.com/dlm/latest/APIReference/API_CreateRule.html
- Amazon Data Lifecycle Manager `RetainRule` API — https://docs.aws.amazon.com/dlm/latest/APIReference/API_RetainRule.html

## Issues Found
- The prerequisites understated the permissions required to apply the configuration. The post creates IAM resources in addition to EBS and DLM resources, so the prerequisite was corrected from `EC2 and DLM permissions` to `EC2, IAM, and DLM permissions`.
- The manual snapshot example used `$(timestamp)` inside an OpenTofu string. That is shell-style substitution, not valid OpenTofu/HCL interpolation. It was replaced with a valid static description so the example is syntactically correct and does not introduce a timestamp-driven perpetual diff.

## Review Notes
- No other technical issues were found in the resource schemas, schedule definitions, or `tofu` commands.
- The hourly, daily, and weekly DLM schedules use supported interval values and a valid cron expression.
- AWS notes that if encrypted volumes use customer-managed KMS keys, the DLM execution role must be allowed to use those keys.
