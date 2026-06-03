# Validation Summary: How to Create and Manage AWS Organizations OUs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Organizations
- Organizational Units (OUs)
- Service Control Policies (SCPs)
- AWS CLI
- Terraform AWS Provider

## Sources Consulted
- AWS CLI Command Reference: create-account - https://docs.aws.amazon.com/cli/latest/reference/organizations/create-account.html
- AWS CLI Command Reference: describe-create-account-status - https://docs.aws.amazon.com/cli/latest/reference/organizations/describe-create-account-status.html
- AWS Organizations API Reference: MoveAccount - https://docs.aws.amazon.com/organizations/latest/APIReference/API_MoveAccount.html
- AWS Organizations API Reference: CloseAccount - https://docs.aws.amazon.com/organizations/latest/APIReference/API_CloseAccount.html
- AWS Organizations User Guide: Managing organizational units (OUs) - https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_ous.html
- AWS Organizations User Guide: Quotas and service limits - https://docs.aws.amazon.com/organizations/latest/userguide/orgs_reference_limits.html
- AWS CLI Command Reference: tag-resource - https://docs.aws.amazon.com/cli/latest/reference/organizations/tag-resource.html
- Terraform AWS Provider: aws_organizations_account - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/organizations_account
- Terraform AWS Provider: aws_organizations_organizational_unit - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/organizations_organizational_unit
- AWS Control Tower User Guide: AWS multi-account strategy - https://docs.aws.amazon.com/controltower/latest/userguide/aws-multi-account-landing-zone.html

## Issues Found
- The AWS CLI account creation section said accounts could be created directly in an OU. The `aws organizations create-account` command does not accept a parent OU parameter; it creates the account asynchronously and the account must be moved afterward with `move-account`. Updated the example to capture `CreateAccountStatus.Id`, check creation status, capture `AccountId`, and then move the completed account from the root to the Production OU.
- The SCP explanation implied that every SCP would apply to every account without OUs. Root-level SCPs apply across the organization, but SCPs can also be attached directly to accounts. Updated the sentence to distinguish root-level SCP behavior from account-specific SCP attachments.
- Several OU ID placeholders used invalid human-readable IDs such as `ou-root-production`. AWS OU IDs must match the `ou-<root-id>-<ou-id>` pattern. Updated the examples to use valid-looking placeholders such as `ou-a1b2-production`.

## Review Notes
The Terraform examples use current AWS Provider resources and arguments, including `aws_organizations_organizational_unit.parent_id`, `aws_organizations_account.parent_id`, `role_name`, and `ignore_changes` for `role_name`. The AWS CLI was not installed in the local environment, so CLI verification was performed against official AWS CLI documentation rather than local help output.
