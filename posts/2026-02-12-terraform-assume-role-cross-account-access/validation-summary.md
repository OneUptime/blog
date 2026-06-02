# Validation Summary: How to Use Terraform with Assume Role for Cross-Account Access

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS IAM
- AWS STS AssumeRole
- Terraform AWS provider
- Terraform HCL
- GitHub Actions
- AWS CLI

## Sources Consulted
- Terraform AWS Provider documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- Terraform AWS Provider source documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/index.html.markdown
- HashiCorp AssumeRole tutorial: https://developer.hashicorp.com/terraform/tutorials/aws/aws-assumerole
- HashiCorp support article for AWS AssumeRole with the Terraform provider: https://support.hashicorp.com/hc/en-us/articles/360041289933-Using-AWS-AssumeRole-with-the-AWS-Terraform-Provider
- AWS IAM role trust policy documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_update-role-trust-policy.html
- AWS IAM Principal policy element documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_principal.html
- AWS CLI sts assume-role command reference: https://docs.aws.amazon.com/cli/latest/reference/sts/assume-role.html
- AWS CLI IAM role profile documentation: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-role.html
- AWS SDKs and Tools Assume Role credential provider documentation: https://docs.aws.amazon.com/sdkref/latest/guide/feature-assume-role-credentials.html
- GitHub Actions deployments and environments documentation: https://docs.github.com/en/actions/reference/deployments-and-environments
- HashiCorp setup-terraform GitHub Action: https://github.com/hashicorp/setup-terraform

## Issues Found
- The production custom IAM policy example created `aws_iam_policy.terraform_deploy` but did not attach it to `TerraformDeployRole`. Added an `aws_iam_role_policy_attachment` so the example actually grants the described permissions.
- The initial trust policy required `sts:ExternalId`, but several later provider examples omitted `external_id`. Added `external_id` to the multi-account provider alias examples and the variable-driven provider example, plus matching `.tfvars` values.
- The chained assume-role section said Terraform does not support chained assume role directly. Current Terraform AWS provider documentation says IAM role chaining is supported by specifying the roles to assume in order. Replaced that claim and added a direct chained `assume_role` example.
- The chained assume-role snippet included a second default AWS provider example after adding the direct chaining example. Added an alias to the profile-based alternative so the combined snippet does not define two default AWS provider configurations.
- The GitHub Actions production environment comment said it requires manual approval. GitHub environments only require approval when protection rules such as required reviewers are configured. Updated the comment to say it can require manual approval when protection rules are configured.
- The troubleshooting section mapped "The security token included in the request is invalid" to an external ID mismatch. That error is more accurately tied to invalid, expired, or incomplete base AWS credentials. Added a separate `AccessDenied` note for external ID or trust-policy problems.

## Review Notes
- The examples are technically valid as current Terraform AWS provider guidance, but production deployments should also consider stronger least-privilege IAM scoping than the broad illustrative policy shown.
- The local environment did not have `terraform` or `aws` installed, so validation was performed against official documentation rather than local CLI execution.
