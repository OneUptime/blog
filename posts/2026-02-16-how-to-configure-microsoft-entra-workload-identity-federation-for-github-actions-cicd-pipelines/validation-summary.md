# Validation Summary: How to Configure Microsoft Entra Workload Identity Federation for GitHub

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Microsoft Entra ID workload identity federation
- GitHub Actions OpenID Connect (OIDC)
- Azure CLI
- Azure RBAC
- Azure Login GitHub Action
- Azure App Service deployment with GitHub Actions

## Sources Consulted
- Microsoft Learn: Workload identity federation concepts - https://learn.microsoft.com/en-us/entra/workload-id/workload-identity-federation
- Microsoft Learn: Azure CLI `az ad app federated-credential` reference - https://learn.microsoft.com/en-us/cli/azure/ad/app/federated-credential?view=azure-cli-latest
- Microsoft Learn: Authenticate to Azure from GitHub Actions by OpenID Connect - https://learn.microsoft.com/en-us/azure/developer/github/connect-from-azure-openid-connect
- Microsoft Learn: Azure CLI `az role assignment create` reference - https://learn.microsoft.com/en-us/cli/azure/role/assignment?view=azure-cli-latest
- Microsoft Learn: Assign Azure roles using Azure CLI - https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-cli
- Microsoft Learn: Deploy to Azure App Service by using GitHub Actions - https://learn.microsoft.com/en-us/azure/app-service/deploy-github-actions
- GitHub Docs: OpenID Connect reference - https://docs.github.com/en/actions/reference/security/oidc
- Azure Login GitHub Action README - https://github.com/Azure/login

## Issues Found
- The Azure RBAC examples assigned roles with `--assignee $APP_ID`. Current Azure RBAC guidance recommends using the service principal object ID with `--assignee-object-id` and `--assignee-principal-type ServicePrincipal`, especially to avoid Microsoft Graph lookup and propagation issues. Updated both role assignment examples to use the previously captured `$SP_ID`.
- The subject examples described a "specific tag pattern" using `refs/tags/v*`. Standard GitHub OIDC subject examples and Entra federated identity credentials use exact subject values, not wildcard patterns. Updated the example to show a specific tag value, `refs/tags/v1.0.0`.
- The workflow deployed `./dist` without making clear that the path must already contain a deployable artifact. Added a short comment before the deploy step noting that the app must be built first or the package path must point to an existing deployable artifact.

## Review Notes
- The core OIDC flow, GitHub `permissions: id-token: write`, Azure Login `client-id` / `tenant-id` / `subscription-id` usage, and default `api://AzureADTokenExchange` audience are consistent with official documentation.
- Microsoft examples often store Azure IDs as GitHub secrets, while this post uses GitHub Actions variables. The values are identifiers rather than credentials; this is technically valid for OIDC, but organizations may still choose secrets or environment-scoped variables for operational policy reasons.
- Azure CLI was not installed in the local environment, so CLI verification was performed against Microsoft Learn command reference pages rather than local `az --help` output.
