# Validation Summary: How to Handle Terraform Provider Credentials Securely

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- AWS IAM, IAM Identity Center, STS, OIDC, EC2 instance profiles, Secrets Manager
- GitHub Actions OIDC
- HashiCorp AzureRM Provider
- HashiCorp AzureAD Provider
- Microsoft Entra ID workload identity federation and managed identities
- HashiCorp Google Provider
- Google Cloud Workload Identity Federation

## Sources Consulted
- AWS CLI documentation: Configuring IAM Identity Center authentication with the AWS CLI - https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sso.html
- HashiCorp AWS Provider documentation: Authentication and configuration - https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- HashiCorp AWS Provider documentation: aws_iam_openid_connect_provider - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_openid_connect_provider
- HashiCorp AWS Provider documentation: aws_secretsmanager_secret_rotation - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret_rotation
- GitHub Docs: Configuring OpenID Connect in Amazon Web Services - https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services
- aws-actions/configure-aws-credentials documentation - https://github.com/aws-actions/configure-aws-credentials
- HashiCorp AzureRM Provider documentation: Authenticating using managed identities for Azure resources - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/guides/managed_service_identity
- HashiCorp AzureRM Provider documentation: Authenticating via a Service Principal and OpenID Connect - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/guides/service_principal_oidc
- HashiCorp AzureAD Provider documentation: azuread_application, azuread_service_principal, and azuread_application_federated_identity_credential - https://registry.terraform.io/providers/hashicorp/azuread/latest/docs
- HashiCorp Google Provider documentation: google_iam_workload_identity_pool_provider - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/iam_workload_identity_pool_provider
- Google Cloud IAM documentation: Workload Identity Federation with deployment pipelines - https://cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines

## Issues Found
- The AWS SSO local-development command sequence configured and selected an SSO profile but did not explicitly refresh the SSO session before running Terraform. Added `aws sso login --profile my-sso-profile`, matching AWS CLI IAM Identity Center documentation.
- The GitHub Actions AWS OIDC Terraform example hardcoded the old `6938fd4d98bab03faadb97b34396831e3780aea1` thumbprint. Current AWS provider documentation makes `thumbprint_list` optional and states that AWS relies on its trusted root CA library for GitHub rather than using configured thumbprints. Removed the hardcoded thumbprint list.

## Review Notes
- The AzureAD federated identity credential example uses the current `application_id` argument with `azuread_application.terraform_ci.id`, which matches the latest provider documentation.
- The GCP Workload Identity Federation provider example is syntactically valid, but production configurations should usually add an `attribute_condition` to restrict repository, owner, branch, or environment claims.
- The AWS Secrets Manager rotation example is structurally valid, but rotating IAM access keys requires a custom Lambda implementation and storing the actual secret value separately, which the post intentionally leaves as a placeholder.
