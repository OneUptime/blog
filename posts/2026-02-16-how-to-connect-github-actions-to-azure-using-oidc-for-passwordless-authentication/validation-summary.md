# Validation Summary: How to Connect GitHub Actions to Azure

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- GitHub Actions
- OpenID Connect (OIDC)
- Microsoft Entra ID
- Azure Login GitHub Action
- Azure CLI
- Azure RBAC
- Azure App Service deployment

## Sources Consulted
- GitHub Docs: Configuring OpenID Connect in Azure, https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-azure
- GitHub Docs: OpenID Connect reference, https://docs.github.com/en/actions/reference/security/oidc
- GitHub Docs: Using OpenID Connect with reusable workflows, https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-with-reusable-workflows
- Microsoft Learn: Use the Azure Login action with OpenID Connect, https://learn.microsoft.com/en-us/azure/developer/github/connect-from-azure-openid-connect
- GitHub Marketplace: Azure Login Action, https://github.com/marketplace/actions/azure-login
- Microsoft Learn: az ad app federated-credential, https://learn.microsoft.com/en-us/cli/azure/ad/app/federated-credential
- Microsoft Learn: az role assignment, https://learn.microsoft.com/en-us/cli/azure/role/assignment
- Microsoft Learn: Assign Azure roles using Azure CLI, https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-cli
- Microsoft Learn: az webapp deploy, https://learn.microsoft.com/en-us/cli/azure/webapp
- Azure/webapps-deploy action definition, https://github.com/Azure/webapps-deploy/blob/master/action.yml

## Issues Found
- The RBAC role assignment example used `--assignee $APP_ID`. Microsoft RBAC documentation says service principals should use the service principal object ID rather than the application ID, and the Azure CLI supports `--assignee-object-id` with `--assignee-principal-type ServicePrincipal` to avoid Microsoft Graph lookup and propagation issues. Updated the command to use `$SP_OBJECT_ID`.
- The workflow examples used `azure/login@v2`. The Azure Login action's current documented major version is `azure/login@v3`. Updated the examples to use `azure/login@v3` while keeping the OIDC inputs unchanged.

## Review Notes
- The OIDC subject examples for branches, pull requests, environments, and tags match GitHub's documented default subject formats. GitHub documents that branch, pull request, and tag subjects apply only when the job does not reference an environment.
- The Azure federated credential command shape, issuer, audience value, and Azure Login OIDC inputs match current official documentation.
- The Azure App Service deployment examples use valid `azure/webapps-deploy` and `az webapp deploy` inputs, but real workflows still need an application-specific build/package step before deploying `./dist`.
