# Validation Summary: How to Import AWS IAM Roles into OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Terraform-compatible AWS provider
- AWS IAM
- AWS CLI
- HCL

## Sources Consulted
- OpenTofu import block documentation: https://opentofu.org/docs/language/import/
- AWS CLI `get-role` reference: https://docs.aws.amazon.com/cli/latest/reference/iam/get-role.html
- AWS CLI `get-role-policy` reference: https://docs.aws.amazon.com/cli/latest/reference/iam/get-role-policy.html
- AWS CLI `list-attached-role-policies` reference: https://docs.aws.amazon.com/cli/latest/reference/iam/list-attached-role-policies.html
- AWS CLI `list-role-policies` reference: https://docs.aws.amazon.com/cli/latest/reference/iam/list-role-policies.html
- AWS provider `aws_iam_role` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role
- AWS provider `aws_iam_role_policy` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy
- AWS provider `aws_iam_role_policy_attachment` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy_attachment
- AWS provider `aws_iam_policy` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_policy

## Issues Found
- The introduction implied that the assume role policy must be imported as a separate resource. I corrected this to reflect that the trust policy is part of the `aws_iam_role` resource, while inline policies and managed policy attachments are imported separately.
- The Step 1 trust-policy command piped `get-role` output to `python3 -m json.tool`, but AWS documents `AssumeRolePolicyDocument` as URL-encoded. I replaced it with a command that URL-decodes the value and then pretty-prints the JSON.
- The inline policy example used `123456789` in a Secrets Manager ARN, which is not a valid 12-digit AWS account ID. I corrected it to `123456789012`.
- The conclusion said the role plus every policy attachment must be imported separately, which omitted inline policies, and it advised exact JSON matching in a way that overstated diff sensitivity. I corrected the wording to include inline policies and to recommend semantic equivalence plus `aws_iam_policy_document` or `jsonencode()` for stable JSON rendering.

## Review Notes
- The `import` block syntax is correct for OpenTofu, and the import IDs used for `aws_iam_role`, `aws_iam_role_policy_attachment`, `aws_iam_role_policy`, and `aws_iam_policy` match the current provider documentation.
- The post correctly uses `aws_iam_role_policy_attachment` and `aws_iam_role_policy` instead of the deprecated `managed_policy_arns` and `inline_policy` patterns on `aws_iam_role`.
