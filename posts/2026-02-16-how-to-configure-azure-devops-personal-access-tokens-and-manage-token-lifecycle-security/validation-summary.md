# Validation Summary: How to Configure Azure DevOps Personal Access Tokens

## Status
validated

## Post Type
Tutorial / security guide

## Technologies Covered
- Azure DevOps
- Personal Access Tokens (PATs)
- Azure DevOps REST APIs
- Azure DevOps Audit Log API
- Azure DevOps Token Admin and PAT lifecycle APIs
- Azure CLI and Azure DevOps CLI extension
- Azure PowerShell
- Azure Key Vault
- Microsoft Entra ID

## Sources Consulted
- Microsoft Learn: Use personal access tokens - Azure DevOps: https://learn.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate?view=azure-devops
- Microsoft Learn: Manage personal access tokens using policies - Azure DevOps: https://learn.microsoft.com/en-us/azure/devops/organizations/accounts/manage-pats-with-policies-for-administrators?view=azure-devops
- Microsoft Learn: PATs - Create - REST API: https://learn.microsoft.com/en-us/rest/api/azure/devops/tokens/pats/create?view=azure-devops-rest-7.1
- Microsoft Learn: PATs - Revoke - REST API: https://learn.microsoft.com/en-us/rest/api/azure/devops/tokens/pats/revoke?view=azure-devops-rest-7.1
- Microsoft Learn: Audit Log - Query - REST API: https://learn.microsoft.com/en-us/rest/api/azure/devops/audit/audit-log/query?view=azure-devops-rest-7.1
- Microsoft Learn: Personal Access Tokens - List - Token Admin REST API: https://learn.microsoft.com/en-us/rest/api/azure/devops/tokenadmin/personal-access-tokens/list?view=azure-devops-rest-7.1
- Microsoft Learn: Revocations - Revoke Authorizations - Token Admin REST API: https://learn.microsoft.com/en-us/rest/api/azure/devops/tokenadmin/revocations/revoke-authorizations?view=azure-devops-rest-7.1
- Microsoft Learn: az devops admin reference: https://learn.microsoft.com/en-us/cli/azure/devops/admin?view=azure-cli-latest
- Microsoft Learn: Issue Entra tokens with Azure CLI - Azure DevOps: https://learn.microsoft.com/en-us/azure/devops/cli/entra-tokens?view=azure-devops
- Microsoft Learn: Use service principals and managed identities in Azure DevOps: https://learn.microsoft.com/en-us/azure/devops/integrate/get-started/authentication/service-principal-managed-identity?view=azure-devops

## Issues Found
- The PAT lifecycle API examples used an existing PAT with a token administration scope. Microsoft documentation states that PAT lifecycle APIs require Microsoft Entra tokens, so the examples now use Bearer authentication with an Entra access token.
- The REST API PAT creation example used an expiration date that is in the past as of validation date 2026-06-01. Updated the example date to a future date.
- The organizational policy navigation treated all PAT policies as Organization Settings > Policies. Tenant-level PAT policies are under Organization Settings > Microsoft Entra, while organization PAT creation restrictions are under Organization Settings > Policies.
- The Azure DevOps CLI example used `az devops admin policy list`, but the current Azure DevOps CLI admin command group only exposes banner commands. Replaced it with a note that these PAT policies should be verified in the portal.
- The audit log example used `api-version=7.1` and read `decoratedAuditLogEntries` from the top-level response. The documented API version is `7.1-preview.1`, and the response nests entries under `value.decoratedAuditLogEntries`.
- The monitoring section described specific token usage event names that are not documented as stable audit event names. Reworded the claim to focus on token-related activity and generic filtering.
- The rotation script authenticated PAT lifecycle calls with the current PAT, did not preserve the new token authorization ID in Key Vault tags, and formatted the expiration with a local timestamp marked as UTC. Updated it to use an Entra token, store the new authorization ID as a tag, and calculate the expiration in UTC.
- The emergency response section referenced a nonexistent `az devops security token revoke` command and used an invalid DELETE request for revoking all tokens for a user. Replaced it with the documented Token Admin list and revocation endpoints.
- Updated Azure AD terminology to Microsoft Entra ID where the post referred to current Azure DevOps identity and policy documentation.

## Review Notes
The post is technically relevant and now aligns with current Microsoft documentation for PAT creation, lifecycle APIs, audit querying, policy management, and administrative revocation. Future improvements could include a more complete production rotation workflow that updates dependent systems before revoking the previous PAT.
