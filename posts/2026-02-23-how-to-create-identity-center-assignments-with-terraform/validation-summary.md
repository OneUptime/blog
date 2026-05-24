# Validation Summary: How to Create Identity Center Assignments with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL)
- AWS IAM Identity Center (formerly AWS SSO)
- AWS Organizations
- AWS Identity Store
- HashiCorp AWS Provider (~> 5.0)

## Sources Consulted
- [aws_ssoadmin_account_assignment | Terraform Registry](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ssoadmin_account_assignment)
- [aws_ssoadmin_permission_set (data source) | Terraform Registry](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ssoadmin_permission_set)
- [aws_identitystore_group (data source) | Terraform Registry](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/identitystore_group)
- [aws_identitystore_user (data source) | Terraform Registry](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/identitystore_user)
- [aws_ssoadmin_instances (data source) | Terraform Registry](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ssoadmin_instances)
- [aws_organizations_organizational_unit_descendant_accounts (data source) | Terraform Registry](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/organizations_organizational_unit_descendant_accounts)

## Issues Found
- **Deprecated attribute `status` on descendant accounts data source**: The OU section filtered descendant accounts with `if account.status == "ACTIVE"`. The `status` attribute on `aws_organizations_organizational_unit_descendant_accounts` accounts is deprecated in favor of `state`. Updated the filter to use `account.state == "ACTIVE"` to use the current, non-deprecated attribute (both fields hold the same AWS API value, so semantics are unchanged).

## Review Notes
- The `data "aws_organizations_organization" "main"` and `data "aws_identitystore_user" "admin"` blocks are declared but not consumed elsewhere in the snippets. They are valid Terraform and serve as illustrative examples; left in place as they are not technically incorrect.
- The "Assigning to All Accounts in an OU" section's comment says "security audit access" while the resource uses `data.aws_ssoadmin_permission_set.readonly.arn`. This is a wording inconsistency rather than a technical error — the `readonly` permission set is the only one defined in scope at that point in the article. Left as-is per instructions to only fix technical errors.
- The `assignment_summary` output uses `split("-", key)[0]` / `split("-", key)[2]` to parse the composite for_each key. This works for the sample data but is fragile if any group name, account ID, or permission set name ever contains a `-`. Not a defect for the example values shown, but worth being aware of.
- The `alternate_identifier { unique_attribute { ... } }` syntax for `aws_identitystore_group` and `aws_identitystore_user` is correct for AWS provider v5.x.
- All `aws_ssoadmin_account_assignment` argument names (`instance_arn`, `permission_set_arn`, `principal_id`, `principal_type`, `target_id`, `target_type`) and value conventions (`"GROUP"`, `"AWS_ACCOUNT"`) match the provider schema.
