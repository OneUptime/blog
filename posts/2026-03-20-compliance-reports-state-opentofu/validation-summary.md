# Validation Summary: How to Generate Compliance Reports from OpenTofu State

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- `jq`
- AWS Config
- AWS CLI
- AWS Lambda
- Amazon EventBridge / CloudWatch Events
- AWS CloudTrail
- Amazon S3
- HCL

## Sources Consulted
- OpenTofu `show` command docs: https://opentofu.org/docs/v1.10/cli/commands/show/
- OpenTofu JSON output format docs: https://opentofu.org/docs/internals/json-format/
- OpenTofu `state show` docs: https://opentofu.org/docs/v1.9/cli/commands/state/show/
- OpenTofu output values docs: https://opentofu.org/docs/language/values/outputs/
- AWS CLI `describe-compliance-by-config-rule` reference: https://docs.aws.amazon.com/cli/latest/reference/configservice/describe-compliance-by-config-rule.html
- AWS CLI `get-compliance-details-by-config-rule` reference: https://docs.aws.amazon.com/cli/latest/reference/configservice/get-compliance-details-by-config-rule.html
- Amazon EventBridge scheduled rules docs: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-create-rule-schedule.html
- Amazon EventBridge cron and rate expression docs: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-scheduled-rule-pattern.html
- AWS CloudTrail log file integrity validation docs: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-log-file-validation-intro.html
- AWS CloudTrail log validation with the AWS CLI: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-log-file-validation-cli.html
- Terraform AWS provider `aws_s3_bucket` docs (official provider source): https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/s3_bucket.html.markdown
- Terraform AWS provider `aws_cloudtrail` docs (official provider source): https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudtrail.html.markdown
- Terraform AWS provider `aws_cloudwatch_event_rule` docs (official provider source): https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudwatch_event_rule.html.markdown
- Terraform AWS provider `aws_cloudwatch_event_target` docs (official provider source): https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudwatch_event_target.html.markdown
- Terraform AWS provider `aws_lambda_permission` docs (official provider source): https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/lambda_permission.html.markdown

## Issues Found
- The opening paragraph said OpenTofu state is a complete inventory of managed infrastructure. OpenTofu state tracks the resources managed by that state, not all infrastructure in an environment, so I corrected that wording.
- The `jq` examples only iterated `.values.root_module.resources[]`, which omits resources in child modules. I updated both queries to recurse through `child_modules` so the inventory and encryption check cover the full module tree described in the OpenTofu JSON format.
- The S3 output example used `v.region`, but the current AWS provider exports the bucket region as `bucket_region`. I changed the output snippet accordingly.
- The scheduled rule comment said "8 AM" without the required timezone context. EventBridge scheduled rules run in UTC+0, so I corrected the comment to `8:00 UTC`.
- The EventBridge target example omitted the resource-based permission required for EventBridge to invoke Lambda. I added an `aws_lambda_permission` resource tied to the rule ARN.
- The AWS Config summary query referenced `CompliantResourceCount` and `NonCompliantResourceCount`, which are not fields returned by `describe-compliance-by-config-rule`. I replaced that query with a documented non-compliant-rule summary using `ComplianceContributorCount.CappedCount` and `CapExceeded`.
- The CloudTrail section said it tracked all infrastructure API calls, but the shown selector logs management events plus S3 object data events for the state bucket. I corrected the comment to match the configuration.
- The CloudTrail best-practice note said enabling log file validation proves logs were not tampered with. AWS documents that enabling validation only causes digest files to be delivered; you must validate those digests to detect modification or deletion. I corrected that explanation.

## Review Notes
- EventBridge scheduled rules are still supported, but AWS now recommends EventBridge Scheduler for new scheduled workloads.
- `tofu show -json` exposes sensitive values in plain text unless you handle that output carefully; the OpenTofu docs call this out explicitly.
- The workspace does not have the `tofu` binary installed, so I could not execute the OpenTofu commands directly. I verified the command semantics against official documentation and sanity-checked the revised `jq` filters locally against representative JSON.
