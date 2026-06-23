# Validation Summary: How to Fix 'MalformedPolicyDocument: Has prohibited field Resource'

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Terraform
- Terraform AWS provider
- AWS IAM roles
- AWS IAM trust policies and permissions policies
- AWS IAM Access Analyzer
- AWS IAM Policy Simulator
- AWS CLI
- jq

## Sources Consulted
- AWS IAM User Guide: AWS JSON policy elements Principal - https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_principal.html
- AWS IAM User Guide: Grammar of the IAM JSON policy language - https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_grammar.html
- AWS IAM User Guide: IAM policy testing with the IAM policy simulator - https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_testing-policies.html
- AWS CLI Command Reference: accessanalyzer validate-policy - https://docs.aws.amazon.com/cli/latest/reference/accessanalyzer/validate-policy.html
- Terraform AWS provider: aws_iam_role resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role
- Terraform AWS provider: aws_iam_policy_document data source - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document
- Terraform AWS provider: aws_caller_identity data source - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/caller_identity
- HashiCorp Terraform documentation: jsonencode function - https://developer.hashicorp.com/terraform/language/functions/jsonencode
- GitHub Docs: Configuring OpenID Connect in Amazon Web Services - https://docs.github.com/actions/security-for-github-actions/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services

## Issues Found
- The cross-account example used `arn:aws:iam::OTHER_ACCOUNT:root`, which is not a valid IAM account principal ARN. Changed it to the documented example account ID format, `arn:aws:iam::111122223333:root`.
- The post said AWS provides Terraform data sources. Changed this to the Terraform AWS provider, which is the source of `aws_iam_policy_document`.
- The GitHub Actions trust-policy snippet referenced `data.aws_caller_identity.current.account_id` without declaring the `aws_caller_identity` data source. Added the missing `data "aws_caller_identity" "current" {}` block.
- The `jq` command used an ellipsis inside JSON, which is invalid JSON and would fail as a validation example. Replaced it with `jq . trust-policy.json`.
- The debugging section recommended testing trust policies in IAM Policy Simulator. AWS documents that the simulator does not support simulation of resource-based policies for IAM roles, so the guidance was changed to use IAM Access Analyzer policy validation for trust policies and IAM Policy Simulator only for identity-based permissions policies.

## Review Notes
Terraform and AWS CLI were not installed in the local environment, so command execution was verified against official documentation rather than local binaries. The IAM Policy Simulator caveat is important for future revisions because role trust policies are resource-based policies attached to IAM roles.
