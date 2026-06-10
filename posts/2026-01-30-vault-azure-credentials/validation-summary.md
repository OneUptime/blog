# Validation Summary: How to Implement Vault Azure Credentials

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Vault (Azure secrets engine)
- Microsoft Azure (Azure AD / Entra ID, RBAC, Resource Manager)
- Azure Managed Identities
- Azure CLI (`az` command)
- Python (`hvac` Vault client, `azure-identity`, `azure-mgmt-resource` SDKs)
- Go (`hashicorp/vault/api`, `azure-sdk-for-go/sdk/azidentity`, `armresources` SDKs)
- Vault HCL policy language
- Mermaid diagrams

## Sources Consulted
- Vault Azure Secrets Engine API docs: https://developer.hashicorp.com/vault/api-docs/secret/azure
- Vault Azure Secrets Engine documentation: https://developer.hashicorp.com/vault/docs/secrets/azure
- hvac Python library (Azure secrets engine): https://python-hvac.org/en/stable/usage/secrets_engines/azure.html and source at https://github.com/hvac/hvac/blob/main/hvac/api/secrets_engines/azure.py
- Azure SDK for Go (armresources): https://pkg.go.dev/github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/resources/armresources
- Azure RBAC Built-in Roles: https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles
- Microsoft Graph API Permissions reference: https://learn.microsoft.com/en-us/graph/permissions-reference

## Issues Found

1. **Deprecated `use_microsoft_graph_api=true` parameter** in the managed identity configuration example.
   - **What was wrong:** The `vault write azure/config` example for system-assigned managed identity included `use_microsoft_graph_api=true`. This parameter was added in Vault 1.10 and made the default behavior in Vault 1.12 after Microsoft retired the Azure AD Graph API. It is now deprecated and no longer appears in current Vault Azure secrets engine API documentation.
   - **What was changed:** Removed the `use_microsoft_graph_api=true` line so the example matches the current minimal managed-identity configuration (subscription_id + tenant_id only, with client_id/client_secret omitted), as documented by HashiCorp.
   - **Why:** Including a deprecated parameter could confuse readers using current Vault versions and may emit warnings or be silently ignored in future releases.

## Review Notes

- The Python `hvac` call `client.secrets.azure.generate_credentials(name=..., mount_point='azure')` was verified against the upstream `hvac/api/secrets_engines/azure.py` source and is correct.
- The Go example uses the current `azure-sdk-for-go/sdk` module structure (`azidentity.NewClientSecretCredential`, `armresources.NewResourceGroupsClient`) with the modern pager pattern (`NewListPager` / `pager.More()` / `pager.NextPage(ctx)`). All signatures and import paths are correct.
- Vault CLI commands (`vault secrets enable`, `vault write azure/config`, `vault write azure/roles/...`, `vault read azure/creds/...`, `vault write -f azure/rotate-root`, `vault list`, `vault policy write`, `vault audit enable file`) match current Vault CLI syntax.
- Azure RBAC role names (`Reader`, `Contributor`, `Storage Blob Data Contributor`, `User Access Administrator`) and scope path formats (management group, subscription, resource group, individual resource) are accurate against Microsoft's RBAC documentation.
- Microsoft Graph permissions listed (`Application.ReadWrite.All`, `Directory.Read.All`) are valid Application-type permissions that Vault needs to create and manage service principals.
- The sample `vault read azure/creds/...` output is illustrative; actual Vault CLI output typically shows `lease_duration` as `1h0m0s` rather than `1h`, but this is a cosmetic CLI formatting detail, not a technical inaccuracy.
- Future caveat: HashiCorp now recommends Plugin Workload Identity Federation (WIF) for Vault Enterprise on Azure as a more secure alternative to managed identity / static credentials. This is out of scope for the current post but could be added in a follow-up.
