# Validation Summary: How to Create a Client Secret for Portainer ACI

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Azure Container Instances (ACI)
- Microsoft Entra ID
- Azure CLI
- Azure Key Vault
- HashiCorp Vault
- Docker Secrets
- Kubernetes Secrets
- `curl`
- `jq`

## Sources Consulted
- Microsoft Learn: Add and manage application credentials in Microsoft Entra ID - https://learn.microsoft.com/en-us/entra/identity-platform/how-to-add-credentials
- Microsoft Learn: `az ad app credential` - https://learn.microsoft.com/en-us/cli/azure/ad/app/credential?view=azure-cli-latest
- Portainer Documentation: Add an ACI environment - https://docs.portainer.io/sts/admin/environments/add/aci
- Portainer Documentation: API documentation - https://docs.portainer.io/api/docs
- Portainer OpenAPI spec (BE 2.39.1) - https://api-docs.portainer.io/versions/ee/2.39.1.yaml
- Portainer source: `endpoint_update.go` - https://raw.githubusercontent.com/portainer/portainer/develop/api/http/handler/endpoints/endpoint_update.go

## Issues Found
- The post used outdated "Azure AD" naming in the description, introduction, prerequisites, and body text. I updated those references to "Microsoft Entra ID" to match current Microsoft documentation.
- The Azure Portal expiry guidance said to recommend 12 months for production. Microsoft currently documents a maximum lifetime of 24 months and recommends setting client secret expiration to less than 12 months, so I corrected that wording.
- The "Create Additional Secrets" CLI example had an unused `SECRET_EXPIRY` variable and an inaccurate comment claiming it used `az rest` while the actual command was `az ad app credential reset`. I removed the unused line and corrected the example to capture the new secret directly with `--query 'password' -o tsv`.
- The Azure CLI example echoed the generated client secret to stdout, which is unsafe for shared terminals and CI logs. I removed the echo and replaced it with secure handling guidance.
- The Portainer rotation example sent a nested `AzureCredentials` object to `PUT /api/endpoints/{id}`. Portainer's current OpenAPI schema and handler expect flat `AzureApplicationID`, `AzureTenantID`, and `AzureAuthenticationKey` fields in the update payload, so I corrected the request body to use the supported field names.
- I added shell-safe quoting for `"$APP_ID"` in the Azure CLI commands to avoid argument-splitting issues.

## Review Notes
- Portainer's documentation still uses some older "Azure AD" wording on ACI-related pages, while Microsoft documentation now uses "Microsoft Entra ID". The updated post now follows Microsoft's current naming.
- I could not verify Azure CLI behavior locally with `az --help` because Azure CLI is not installed in this environment, so Azure command validation was done against current Microsoft Learn documentation instead.
