# Validation Summary: How to Use Sentinel for IAM Policy Governance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Sentinel
- Terraform / HCP Terraform policy enforcement
- Sentinel `tfplan/v2` import
- AWS IAM
- AWS IAM Identity Center
- Terraform AWS provider IAM resources

## Sources Consulted
- HashiCorp Sentinel language specification: https://developer.hashicorp.com/sentinel/docs/language/spec
- HashiCorp Sentinel standard imports overview: https://developer.hashicorp.com/sentinel/docs/imports
- HashiCorp Sentinel `types` import: https://developer.hashicorp.com/sentinel/docs/imports/types
- HashiCorp Sentinel `strings` import: https://developer.hashicorp.com/sentinel/docs/imports/strings
- HashiCorp Sentinel `json` import: https://developer.hashicorp.com/sentinel/docs/imports/json
- HashiCorp Terraform `tfplan/v2` import reference: https://developer.hashicorp.com/terraform/enterprise/workspaces/policy-enforcement/import-reference/tfplan-v2
- HashiCorp Sentinel enforcement levels: https://developer.hashicorp.com/sentinel/docs/concepts/enforcement-levels
- Terraform policy quickstart for `sentinel.hcl`: https://developer.hashicorp.com/terraform/tutorials/policy/policy-quickstart
- Terraform AWS provider `aws_iam_role` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role
- AWS IAM Identity Center documentation: https://docs.aws.amazon.com/singlesignon/latest/userguide/what-is.html

## Issues Found
- The first two Sentinel examples used `types.type_of(...)` but did not import the Sentinel `types` standard import. Added `import "types"` to both policies so they compile.
- The dangerous IAM actions policy only matched exact action names, so wildcard IAM action patterns such as `iam:*` or `iam:Create*` could bypass the intended check. Added a small matching helper using the Sentinel `strings` import and updated the loop to flag exact and wildcard action patterns.
- The inline policy policy blocked standalone inline policy resources but missed the current `aws_iam_role.inline_policy` configuration block. Added a check for `aws_iam_role` resources with non-empty `inline_policy` blocks and directed readers to use managed policies with `aws_iam_role_policy_attachment`.
- The snippets were marked as `python` code blocks even though they are Sentinel policies. Updated the code fences to `sentinel`.
- The post used the older "AWS SSO" name. Updated user-facing references to the current AWS IAM Identity Center name.

## Review Notes
The corrected Sentinel snippets were parsed with Sentinel CLI v0.40.0 using `sentinel fmt -write=false`. The examples still intentionally model organization-specific policy choices, such as blocking IAM users and access keys entirely, so teams may need exception workflows for service-specific edge cases.
