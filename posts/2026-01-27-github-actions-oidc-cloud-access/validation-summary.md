# Validation Summary: How to Use GitHub Actions with OIDC for Secure Cloud Access

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitHub Actions
- OpenID Connect (OIDC)
- AWS IAM and STS
- Google Cloud Workload Identity Federation
- Microsoft Azure / Microsoft Entra ID federated credentials
- Terraform
- Docker and ECR
- Cloud audit logging

## Sources Consulted
- GitHub Docs: OpenID Connect reference, https://docs.github.com/en/actions/reference/security/oidc
- GitHub Docs: Configuring OpenID Connect in Amazon Web Services, https://docs.github.com/actions/security-for-github-actions/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services
- aws-actions/configure-aws-credentials official README, https://github.com/aws-actions/configure-aws-credentials
- AWS IAM User Guide: OIDC provider thumbprints, https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc_verify-thumbprint.html
- google-github-actions/auth official README, https://github.com/google-github-actions/auth
- google-github-actions/setup-gcloud official README, https://github.com/google-github-actions/setup-gcloud
- GitHub Docs: Configuring OpenID Connect in Google Cloud Platform, https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-google-cloud-platform
- Microsoft Learn: Authenticate to Azure from GitHub Actions by OpenID Connect, https://learn.microsoft.com/en-us/azure/developer/github/connect-from-azure-openid-connect
- Terraform AzureAD provider v3 upgrade guidance and resource documentation, https://registry.terraform.io/providers/hashicorp/azuread/latest/docs/guides/3.0-upgrade-guide

## Issues Found
- The introduction said OIDC tokens "cannot be leaked or stolen." Changed this to say short-lived tokens reduce the impact of leaks, because bearer tokens can still be exposed while valid.
- The AWS OIDC provider examples used a hard-coded GitHub certificate thumbprint. Removed the thumbprint from the AWS CLI and Terraform examples because current AWS/GitHub guidance no longer requires pinning it for GitHub's OIDC provider.
- The ECR workflow built `my-app` locally but pushed a fully qualified ECR tag that had not been created. Changed the `docker build` command to build the exact tag that is pushed.
- The Google Cloud Workload Identity provider examples mapped repository claims but did not restrict admission into the pool. Added an `attribute-condition` / `attribute_condition` for the repository owner, matching current Google guidance to use a provider-level condition.
- The Google Cloud workflow used older major versions for `google-github-actions/auth` and `google-github-actions/setup-gcloud`. Updated them to the current documented major versions.
- The AzureAD Terraform example used provider v2-era attributes. Updated the service principal and federated identity credential resources to use current v3 attributes.
- The troubleshooting note described the GCP audience as the workload identity pool URL. Updated it to the workload identity provider resource name, which is the default audience used by the Google auth action.

## Review Notes
The post is technically relevant and broadly accurate after the fixes. The Azure workflow still stores Azure client, tenant, and subscription IDs as GitHub secrets; these are identifiers rather than long-lived credentials, though repository or environment variables would also be reasonable.
