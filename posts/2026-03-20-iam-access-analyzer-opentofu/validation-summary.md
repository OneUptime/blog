# Validation Summary: How to Set Up IAM Access Analyzer with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS IAM Access Analyzer
- AWS Organizations
- Amazon EventBridge
- Amazon SNS
- AWS CLI
- HCL

## Sources Consulted
- AWS provider resource docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/accessanalyzer_analyzer
- AWS provider resource docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/accessanalyzer_archive_rule
- IAM Access Analyzer filter keys: https://docs.aws.amazon.com/IAM/latest/UserGuide/access-analyzer-reference-filter-keys.html
- Add a delegated administrator for IAM Access Analyzer: https://docs.aws.amazon.com/IAM/latest/UserGuide/access-analyzer-delegated-administrator-add.html
- Monitoring IAM Access Analyzer with Amazon EventBridge: https://docs.aws.amazon.com/IAM/latest/UserGuide/access-analyzer-eventbridge.html
- IAM Access Analyzer events for EventBridge: https://docs.aws.amazon.com/eventbridge/latest/ref/events-ref-access-analyzer.html
- AWS CLI `validate-policy`: https://docs.aws.amazon.com/cli/latest/reference/accessanalyzer/validate-policy.html
- AWS CLI `list-findings`: https://docs.aws.amazon.com/cli/latest/reference/accessanalyzer/list-findings.html

## Issues Found
- The organization-level analyzer comment said delegated administrator setup was required in all cases. I changed it to reflect the documented prerequisite: AWS Organizations trusted access is required, and delegated administrator registration is only needed when creating the analyzer from a member account.
- The approved partner archive rule filtered `principal.AWS` with a root ARN. IAM Access Analyzer documents this filter as accepting a 12-digit account ID or an external IAM user or role ARN, so I changed the example to use `var.partner_account_id`.
- The CloudFront archive-rule example used `principal.Service`, which is not a documented IAM Access Analyzer filter key. I replaced it with a supported `resource` plus `resourceType` example for a known CloudFront-backed S3 origin bucket.
- The AWS CLI example used `--resource-type` with `aws accessanalyzer validate-policy`. The current AWS CLI uses `--validate-policy-resource-type`, so I corrected the command.
- The conclusion implied EventBridge alerts allow an immediate response. AWS documents that IAM Access Analyzer finding events are delivered to EventBridge within about an hour, so I softened the wording to "respond promptly."

## Review Notes
- The post is technically relevant and code-focused.
- The snippets were reviewed against current AWS and provider documentation, but not applied to a live AWS account during this review.
- IAM Access Analyzer is regional, so real deployments still need to enable analyzers in each AWS Region they want covered.
