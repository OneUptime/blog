# Validation Summary: How to Enforce Resource Tagging Policies with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS Organizations tag policies
- AWS Config managed rules
- AWS Systems Manager Automation
- AWS Lambda
- Amazon EventBridge

## Sources Consulted
- OpenTofu Custom Conditions: https://opentofu.org/docs/language/expressions/custom-conditions/
- AWS Organizations tag policies: https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_tag-policies.html
- AWS Organizations tag policy syntax and examples: https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_example-tag-policies.html
- AWS Organizations required tag keys with IaC: https://docs.aws.amazon.com/organizations/latest/userguide/enforce-required-tag-keys-iac.html
- AWS Organizations enforcement behavior: https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_tag-policies-enforcement.html
- AWS Config `required-tags` managed rule: https://docs.aws.amazon.com/config/latest/developerguide/required-tags.html
- AWS Systems Manager `aws:createTags` action: https://docs.aws.amazon.com/systems-manager/latest/userguide/automation-action-createtag.html
- AWS Systems Manager document schema reference: https://docs.aws.amazon.com/systems-manager/latest/userguide/documents-schemas-features.html
- Amazon EventBridge resource-based permissions for Lambda: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-use-resource-based.html
- Terraform AWS Provider tag policy compliance guide: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/guides/tag-policy-compliance

## Issues Found
- The AWS Organizations example used `enforced_for` as if it made tag keys mandatory. AWS documents required tag keys separately from basic compliance rules, so I changed the policy to use `report_required_tag_for`, added the missing `tag_key` definitions, and enabled provider-side `tag_policy_compliance`.
- The tagging layers had drifted out of sync: `Project` and `ManagedBy` were required in other sections but missing from some later examples. I aligned the examples so they describe the same required-tag policy throughout the post.
- The AWS Config `REQUIRED_TAGS` example scoped the managed rule to `AWS::ECS::Service`, which is not listed as a supported resource type for that rule. I removed the unsupported type.
- The remediation example treated `REQUIRED_TAGS` as if a generic managed SSM runbook could auto-tag arbitrary resources. AWS Config documents that this rule needs custom Systems Manager automation for remediation, so I replaced it with a service-specific EC2 example that uses a custom Automation runbook and `aws:createTags`.
- The scheduled Lambda example omitted the EventBridge target and the Lambda invoke permission, so the rule would not actually invoke the function. I added `aws_cloudwatch_event_target` and `aws_lambda_permission`.
- The post stated OpenTofu validation fails at plan time unconditionally. OpenTofu can defer variable validation until apply when values are unknown, so I softened that wording.

## Review Notes
- AWS provider tag policy compliance requires AWS provider 6.22.0 or later. The caller also needs permission to read required tags.
- AWS Config `REQUIRED_TAGS` only works for resource types whose tag data AWS Config records. Future expansions of the rule scope should be checked against the current AWS Config supported-resource list.
- Scheduled EventBridge rules are still valid for this Lambda pattern, although AWS also offers EventBridge Scheduler for scheduled invocations.
