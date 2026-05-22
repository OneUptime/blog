# Validation Summary: How to Handle Terraform Provider Authentication in CI/CD

## Status
validated

## Post Type
Technical guide / Tutorial

## Technologies Covered
- Terraform
- Terraform AWS provider
- Terraform AzureRM and AzureAD providers
- Terraform Google provider
- GitHub Actions OIDC
- GitLab CI/CD OIDC ID tokens
- AWS IAM and STS
- Microsoft Entra federated identity credentials
- Google Cloud Workload Identity Federation
- HashiCorp Vault dynamic AWS credentials

## Sources Consulted
- Terraform AWS provider authentication and configuration: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/index.html.markdown
- Terraform releases: https://github.com/hashicorp/terraform/releases
- Terraform `aws_iam_openid_connect_provider` resource: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/iam_openid_connect_provider.html.markdown
- AWS SDKs and Tools standardized credential providers: https://docs.aws.amazon.com/sdkref/latest/guide/standardized-credentials.html
- AWS assume role with web identity documentation: https://docs.aws.amazon.com/sdkref/latest/guide/access-assume-role-web.html
- `aws-actions/configure-aws-credentials` OIDC documentation: https://github.com/aws-actions/configure-aws-credentials
- GitLab OIDC ID token authentication: https://docs.gitlab.com/ci/secrets/id_token_authentication/
- GitLab AWS OIDC temporary credential guide: https://docs.gitlab.com/ci/cloud_services/aws/
- Azure Login Action OIDC documentation: https://github.com/Azure/login
- Terraform AzureRM service principal OIDC guide: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/guides/service_principal_oidc.html.markdown
- Terraform AzureAD federated identity credential resource: https://raw.githubusercontent.com/hashicorp/terraform-provider-azuread/main/docs/resources/application_federated_identity_credential.md
- Google GitHub Actions auth documentation: https://github.com/google-github-actions/auth
- Terraform Google provider Workload Identity Pool Provider resource: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/iam_workload_identity_pool_provider.html.markdown
- Terraform Google provider authentication reference: https://registry.terraform.io/providers/hashicorp/google/latest/docs/guides/provider_reference
- Vault JWT/OIDC auth method documentation: https://developer.hashicorp.com/vault/docs/auth/jwt
- Vault AWS secrets engine documentation: https://developer.hashicorp.com/vault/docs/secrets/aws
- `hashicorp/vault-action` documentation: https://github.com/hashicorp/vault-action

## Issues Found
- The AWS authentication hierarchy omitted shared config files and placed web identity after EC2/ECS in a way that did not match the Terraform AWS provider's documented sources. Updated the list and clarified that CI OIDC can produce either short-lived credential environment variables or `AWS_ROLE_ARN` / `AWS_WEB_IDENTITY_TOKEN_FILE` web identity settings.
- The GitHub AWS OIDC provider example pinned a historical TLS thumbprint. Current AWS/IAM behavior for GitHub OIDC uses AWS's trusted root CA library and the Terraform resource supports omitting `thumbprint_list`, so the hardcoded thumbprint was removed.
- The GitLab CI example used `$CI_JOB_JWT_FILE`, but GitLab `id_tokens` expose the token as the configured CI variable, not as that file path. Updated the snippet to write `$GITLAB_OIDC_TOKEN` to a file and point `AWS_WEB_IDENTITY_TOKEN_FILE` at it.
- The GitLab CI example used `https://gitlab.com` as the OIDC audience for AWS. GitLab's AWS guide says `sts.amazonaws.com` is the typical semantic audience for AWS OIDC integrations, so the audience was changed to `sts.amazonaws.com`.
- The GitLab CI example pinned Terraform `1.7.4`, which is outdated for a 2026 guide. Updated the container image to Terraform `1.15.4`, the latest stable release identified during review.
- The Azure and GCP GitHub Actions examples used older action majors. Updated `azure/login` to `v3` and `google-github-actions/auth` to `v3` to match current official examples.
- The GCP Workload Identity Federation provider accepted any valid GitHub OIDC token into the pool unless restricted by IAM later. Added a repository owner attribute mapping and `attribute_condition` to restrict admission to the intended GitHub organization, matching Google action guidance to add an attribute condition.

## Review Notes
- The AzureRM provider OIDC environment variables shown are correct for GitHub Actions; the `azure/login` step is useful for Azure CLI access, while Terraform AzureRM itself uses `ARM_USE_OIDC` plus the GitHub Actions OIDC request environment.
- The AzureAD federated identity credential snippet uses the current `application_id` argument, which is correct for the latest provider.
- The Vault example assumes Vault's JWT auth method and AWS secrets engine role are preconfigured; that is appropriate for the short fallback snippet.
