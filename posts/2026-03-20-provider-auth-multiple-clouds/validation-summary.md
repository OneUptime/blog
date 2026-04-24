# Validation Summary: How to Authenticate OpenTofu Providers Across Multiple Clouds

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- GitHub Actions
- AWS IAM OIDC federation
- Microsoft Entra workload identity federation
- AzureRM provider OIDC authentication
- Google Cloud Workload Identity Federation
- OIDC

## Sources Consulted
- AWS IAM: Create an OpenID Connect (OIDC) identity provider in IAM - https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc.html
- AWS IAM: Obtain the thumbprint for an OpenID Connect identity provider - https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc_verify-thumbprint.html
- GitHub Docs: Configuring OpenID Connect in Amazon Web Services - https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws
- Azure CLI: `az ad app federated-credential` - https://learn.microsoft.com/en-us/cli/azure/ad/app/federated-credential?view=azure-cli-latest
- Microsoft Entra: Create a trust relationship between an app and an external identity provider - https://learn.microsoft.com/en-us/entra/workload-id/workload-identity-federation-create-trust
- AzureRM provider guide: Authenticating via a Service Principal and OpenID Connect - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/guides/service_principal_oidc
- GitHub Docs: Configuring OpenID Connect in Azure - https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-azure
- Google Cloud IAM: Configure Workload Identity Federation with deployment pipelines - https://cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines
- Google Cloud IAM: Workload Identity Federation - https://cloud.google.com/iam/docs/workload-identity-federation
- `google-github-actions/auth` documentation - https://github.com/google-github-actions/auth
- `aws-actions/configure-aws-credentials` documentation - https://github.com/aws-actions/configure-aws-credentials
- `Azure/login` documentation - https://github.com/Azure/login

## Issues Found
- The AWS OpenTofu example hard-coded a specific GitHub OIDC thumbprint. AWS now documents that manually supplying a thumbprint is optional for API/CLI-based OIDC provider creation, so the static thumbprint was removed to avoid a brittle example that can go stale when certificate chains change.
- The Azure CLI example created an app and then looked it up again by display name. This was replaced with a single `az ad app create --query appId -o tsv` command so the snippet reliably captures the created application's client ID.
- The Azure federated credential example used a GitHub issuer value that did not match Microsoft Learn's current CLI example. The issuer was updated to `https://token.actions.githubusercontent.com/`.
- The GCP Workload Identity Pool provider omitted the provider-level `attribute_condition` that Google Cloud now requires for GitHub's shared issuer model. An organization-scoped condition was added, along with the related `repository_owner` attribute mapping.
- The GitHub Actions examples referenced older action majors. They were updated to current documented majors for the reviewed date: `actions/checkout@v6`, `aws-actions/configure-aws-credentials@v6`, `azure/login@v2`, and `google-github-actions/auth@v3`.

## Review Notes
- GitHub documents an upcoming default OIDC `sub` change for repositories created on or after June 18, 2026: new repositories use immutable owner and repository IDs in the default subject format. Existing repositories keep the current name-based format unless they opt in earlier. Future revisions of this post may want to mention that caveat for AWS and Azure trust-policy matching.
- Google Cloud recommends numeric claims such as `repository_id` and `repository_owner_id` over name-based claims like `repository` and `repository_owner` to reduce repo/org reuse risks. The post remains technically correct after the fix, but could be hardened further in a future revision by switching the example bindings to ID-based claims.
