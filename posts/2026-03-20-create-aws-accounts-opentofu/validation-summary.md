# Validation Summary: How to Create AWS Accounts with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (Terraform-compatible IaC tool)
- AWS Organizations
- AWS provider for Terraform/OpenTofu (`aws_organizations_account`, `aws_organizations_organizational_unit`, `aws_vpc`)
- IAM cross-account access (`OrganizationAccountAccessRole`)
- HCL (HashiCorp Configuration Language)

## Sources Consulted
- AWS provider documentation for `aws_organizations_account`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/organizations_account
- HashiCorp/terraform-provider-aws GitHub source: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/organizations_account.html.markdown
- AWS Organizations documentation on `OrganizationAccountAccessRole` (default role created when AWS Organizations creates a member account)
- OpenTofu CLI import command syntax (compatible with Terraform import)

## Issues Found
No technical issues found.

All arguments used (`name`, `email`, `parent_id`, `role_name`, `close_on_deletion`, `tags`) are valid for the `aws_organizations_account` resource. The provider `assume_role` block syntax is correct. The `tofu import` command syntax with the 12-digit AWS account ID as the import ID is correct. The use of `for_each` with a map of objects is idiomatic HCL. The `OrganizationAccountAccessRole` is the documented default role name AWS Organizations creates when provisioning a new member account.

## Review Notes
- The `role_name` attribute lacks API read support, so imported accounts may show persistent diffs unless `ignore_changes = [role_name]` is added — not strictly a bug in the post, but worth noting for readers who use the import section.
- The `close_on_deletion = false` example matches the provider default; including it explicitly is reasonable for clarity given the safety implications.
- The post does not mention `iam_user_access_to_billing` or `create_govcloud`, which are valid optional arguments — omission is fine for a focused tutorial.
- Email addresses for AWS accounts must be globally unique across all AWS accounts (correctly noted in the conclusion).
