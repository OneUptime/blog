# Validation Summary: How to Implement AWS Organizations SCPs with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS Organizations
- AWS Service Control Policies (SCPs)
- AWS IAM
- HCL

## Sources Consulted
- AWS Organizations: Service control policies (SCPs) - https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html
- AWS Organizations: Enabling a policy type - https://docs.aws.amazon.com/organizations/latest/userguide/enable-policy-type.html
- AWS Organizations: Service control policy examples - https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps_examples.html
- AWS IAM: AWS global condition context keys (`aws:PrincipalArn`) - https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html
- AWS IAM API Reference: `CreateAccessKey` - https://docs.aws.amazon.com/IAM/latest/APIReference/API_CreateAccessKey.html
- AWS IAM User Guide: Create access keys for the root user - https://docs.aws.amazon.com/IAM/latest/UserGuide/id_root-user_manage_add-key.html
- AWS CLI Command Reference: `aws iam create-access-key` - https://docs.aws.amazon.com/cli/latest/reference/iam/create-access-key.html
- Terraform Registry AWS provider: `aws_organizations_organization` data source - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/organizations_organization
- Terraform Registry AWS provider: `aws_organizations_policy` resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/organizations_policy
- Terraform Registry AWS provider: `aws_organizations_policy_attachment` resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/organizations_policy_attachment

## Issues Found
- Step 1 incorrectly said it enabled SCPs, but the snippet only reads the organization data and creates an OU. I renamed the step to match what the code actually does, because AWS requires enabling the policy type separately at the organization root before SCPs can be attached.
- The region restriction example referenced `var.allowed_regions` without declaring the variable, so `tofu plan` would fail as written. I added a minimal `variable "allowed_regions"` block with example default values so the sample is runnable.
- The `no_root_keys` SCP was created but never attached, so it would not have enforced anything. I added an `aws_organizations_policy_attachment` for that policy at the organization root.
- The root access key SCP used less precise terminology and a generic string condition operator. I updated the wording to `root user` and changed the condition to `ArnLike` for `aws:PrincipalArn`, which matches AWS documentation for ARN-based condition keys.
- The conclusion overstated SCP scope and said SCPs "only deny." I corrected it to reflect that SCPs set maximum available permissions for member-account IAM users and roles, including the root user, with documented exceptions such as service-linked roles, and that SCPs do not grant permissions.

## Review Notes
- AWS recommends testing SCPs in a dedicated OU before attaching them to the organization root, because root attachments affect all member accounts.
- Region-deny SCPs require environment-specific customization of the `NotAction` list for global services; the example is a starting point, not an exhaustive production policy.
