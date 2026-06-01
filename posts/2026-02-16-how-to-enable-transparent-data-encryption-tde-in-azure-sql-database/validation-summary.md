# Validation Summary: How to Enable Transparent Data Encryption (TDE) in Azure SQL Database

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure SQL Database
- Transparent Data Encryption (TDE)
- Azure Key Vault
- Azure CLI
- Azure PowerShell
- T-SQL
- Customer-managed keys and managed identities

## Sources Consulted
- Microsoft Learn: Transparent data encryption for SQL Database, SQL Managed Instance, and Azure Synapse Analytics: https://learn.microsoft.com/azure/azure-sql/database/transparent-data-encryption-tde-overview
- Microsoft Learn: PowerShell and Azure CLI: Enable Transparent Data Encryption with customer-managed key from Azure Key Vault: https://learn.microsoft.com/azure/azure-sql/database/transparent-data-encryption-byok-configure
- Microsoft Learn: Azure SQL transparent data encryption with customer-managed key: https://learn.microsoft.com/azure/azure-sql/database/transparent-data-encryption-byok-overview
- Microsoft Learn: Managed identities for transparent data encryption with customer-managed key: https://learn.microsoft.com/azure/azure-sql/database/transparent-data-encryption-byok-identity
- Microsoft Learn: Rotate the Transparent data encryption (TDE) protector: https://learn.microsoft.com/azure/azure-sql/database/transparent-data-encryption-byok-key-rotation
- Microsoft Learn: Common errors for transparent data encryption with customer-managed keys in Azure Key Vault: https://learn.microsoft.com/sql/relational-databases/security/encryption/troubleshoot-tde
- Microsoft Learn: sys.dm_database_encryption_keys (Transact-SQL): https://learn.microsoft.com/sql/relational-databases/system-dynamic-management-views/sys-dm-database-encryption-keys-transact-sql
- Microsoft Learn: az sql db tde CLI reference: https://learn.microsoft.com/cli/azure/sql/db/tde
- Microsoft Learn: az sql server tde-key CLI reference: https://learn.microsoft.com/cli/azure/sql/server/tde-key
- Microsoft Learn: az keyvault CLI reference: https://learn.microsoft.com/cli/azure/keyvault

## Issues Found
- The Mermaid diagram showed the user database DEK directly encrypting tempdb. Azure SQL Database tempdb is encrypted by design, but Microsoft documents it as encrypted by a special Microsoft-owned key, not by each user database DEK. Removed tempdb from the DEK hierarchy diagram.
- The Key Vault creation command used `az keyvault set-policy` later, but current Azure CLI creates Key Vaults with RBAC authorization enabled by default. With RBAC enabled, access policies are ignored. Added `--enable-rbac-authorization false` and clarified that Azure RBAC users should grant equivalent crypto permissions instead.
- The Key Vault note said to enable soft-delete and purge protection, but soft-delete is enabled by default for new vaults. Updated the wording to emphasize purge protection and the access-policy/RBAC distinction.
- The performance section said CPU-bound workloads would see less impact because encryption happens at the I/O level. Microsoft describes TDE as page I/O encryption/decryption that adds CPU work, so impact depends on workload and memory residency. Reworded this claim.
- The tempdb-heavy workload note said tempdb is encrypted when TDE is enabled. In Azure SQL Database, tempdb is always encrypted by design. Updated the wording.

## Review Notes
The Azure CLI executable was not installed in the local environment, so command validation was performed against Microsoft Learn CLI reference pages rather than local `az --help` output. The post uses Key Vault access policies for simplicity; Azure RBAC is also supported and is now the default authorization model for newly created vaults in Azure CLI.
