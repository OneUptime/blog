# Validation Summary: Configure Azure Bicep CI/CD Pipelines in GitHub Actions with What-If Validation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Bicep
- Azure CLI
- Azure Resource Manager deployments and what-if
- Microsoft Entra ID federated identity credentials
- GitHub Actions
- Azure Login GitHub Action

## Sources Consulted
- Microsoft Learn: Bicep CLI commands - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/bicep-cli
- Microsoft Learn: Azure CLI `az bicep` reference - https://learn.microsoft.com/en-us/cli/azure/bicep
- Microsoft Learn: Azure CLI `az deployment group` reference - https://learn.microsoft.com/en-us/cli/azure/deployment/group
- Microsoft Learn: Deploy Bicep files with Azure CLI - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/deploy-cli
- Microsoft Learn: Create Bicep parameter files - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/parameter-files
- Microsoft Learn: Authenticate to Azure from GitHub Actions by OpenID Connect - https://learn.microsoft.com/en-us/azure/developer/github/connect-from-azure-openid-connect
- Microsoft Learn: Azure CLI `az ad app federated-credential` reference - https://learn.microsoft.com/en-us/cli/azure/ad/app/federated-credential
- GitHub Docs: OpenID Connect reference - https://docs.github.com/en/actions/reference/security/oidc
- GitHub Docs: Workflow syntax and permissions - https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Docs: Deployments and environments - https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments
- Azure Login action README - https://github.com/Azure/login

## Issues Found
- The OIDC setup used `az ad sp create-for-rbac`, which creates a service principal credential by default even though the section recommends avoiding service principal secrets. Changed the setup to create a Microsoft Entra application, create its service principal, assign the Contributor role, and add federated credentials to the application.
- The federated credential commands referenced `YOUR_APP_ID` without showing how to get it. Changed the commands to capture `app_id` from `az ad app create` and reuse it.
- The production verification step queried `az deployment group list --query '[0].name'`, which can verify a different deployment than the one just created. Changed the production deploy step to save the generated deployment name to `GITHUB_ENV` and verify that exact deployment.
- The dev environment setup said it would deploy automatically after CI passes, but the shown deployment workflow runs on `push` to `main` and does not directly depend on the separate CI workflow. Reworded this to say it deploys automatically when the deployment workflow runs on `main`.

## Review Notes
The workflow snippets are technically valid for same-repository pull requests. Pull requests from forks may not have access to repository secrets and may have reduced `GITHUB_TOKEN` permissions, so teams accepting external PRs should account for that separately.
