# Validation Summary: How to Configure RHEL with Azure Managed Identities

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Azure Virtual Machines
- Azure Managed Identities
- Microsoft Entra ID
- Azure CLI
- Azure Instance Metadata Service
- Azure Key Vault
- Azure Storage Blob
- Azure SQL
- Python Azure SDK

## Sources Consulted
- Microsoft Learn: Configure managed identities on Azure virtual machines: https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/how-to-configure-managed-identities
- Microsoft Learn: Use managed identities on a virtual machine to acquire access token: https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/how-to-use-vm-token
- Microsoft Learn: Sign into Azure with a managed identity using Azure CLI: https://learn.microsoft.com/en-us/cli/azure/authenticate-azure-cli-managed-identity
- Microsoft Learn: Install the Azure CLI on Linux: https://learn.microsoft.com/en-us/cli/azure/install-azure-cli-linux
- Microsoft Learn: Azure Key Vault CLI reference: https://learn.microsoft.com/en-us/cli/azure/keyvault
- Microsoft Learn: Authorize access to blob data with Azure CLI: https://learn.microsoft.com/en-us/azure/storage/blobs/authorize-data-operations-cli
- Microsoft Learn: Configure Microsoft Entra authentication for Azure SQL: https://learn.microsoft.com/en-us/azure/azure-sql/database/authentication-aad-configure
- Microsoft Learn: Authenticate Azure-hosted Python apps to Azure resources using managed identity: https://learn.microsoft.com/en-us/azure/developer/python/sdk/authentication/user-assigned-managed-identity
- Microsoft Learn: Azure Key Vault Python client library quickstart: https://learn.microsoft.com/en-us/azure/key-vault/secrets/quick-create-python

## Issues Found
- Updated "Azure AD" references to "Microsoft Entra ID" to match current Microsoft terminology while preserving the managed identity explanation.
- Clarified that `az keyvault set-policy` applies to Key Vaults using the access policy permission model.
- Corrected Azure resource scopes for Storage and SQL role assignments to include `resourceGroups` and the proper resource provider paths.
- Clarified the Azure SQL role assignment as management-plane access, since Azure SQL database access requires Microsoft Entra database principals and database permissions rather than an Azure RBAC `Contributor` assignment alone.
- Fixed the IMDS token comment from "Azure Resource Manager" to "Azure Key Vault" because the example requests a `https://vault.azure.net` token.
- Added the Microsoft package repository setup required before installing `azure-cli` with `dnf` on RHEL 9.
- Added `--auth-mode login` to the Blob Storage CLI example so it uses the VM's Microsoft Entra credentials instead of attempting account-key authorization.
- Added `sudo mkdir -p /opt/app` and `sudo tee` to the Python script creation example so writing under `/opt/app` works on a normal RHEL VM.

## Review Notes
The examples are technically valid after correction. For production use, the SQL `Contributor` example should be replaced with narrower management roles or database-level Microsoft Entra users and roles appropriate to the application.
