# Validation Summary: How to Configure Always Encrypted in Azure SQL Database

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure SQL Database
- SQL Server Always Encrypted
- Azure Key Vault
- SQL Server Management Studio
- T-SQL
- PowerShell SqlServer module
- Azure CLI
- Microsoft.Data.SqlClient for .NET
- Microsoft JDBC Driver for SQL Server

## Sources Consulted
- Microsoft Learn: Always Encrypted - SQL Server: https://learn.microsoft.com/en-us/sql/relational-databases/security/encryption/always-encrypted-database-engine
- Microsoft Learn: Create and store column master keys for Always Encrypted: https://learn.microsoft.com/en-us/sql/relational-databases/security/encryption/create-and-store-column-master-keys-always-encrypted
- Microsoft Learn: Configure Always Encrypted using PowerShell: https://learn.microsoft.com/en-us/sql/relational-databases/security/encryption/configure-always-encrypted-using-powershell
- Microsoft Learn: Provision Always Encrypted keys using PowerShell: https://learn.microsoft.com/en-us/sql/relational-databases/security/encryption/configure-always-encrypted-keys-using-powershell
- Microsoft Learn: Provision Always Encrypted keys using SQL Server Management Studio: https://learn.microsoft.com/en-us/sql/relational-databases/security/encryption/configure-always-encrypted-keys-using-ssms
- Microsoft Learn: Set-SqlColumnEncryption cmdlet: https://learn.microsoft.com/en-us/powershell/module/sqlserver/set-sqlcolumnencryption
- Microsoft Learn: New-SqlColumnEncryptionSettings cmdlet: https://learn.microsoft.com/en-us/powershell/module/sqlserver/new-sqlcolumnencryptionsettings
- Microsoft Learn: CREATE COLUMN ENCRYPTION KEY: https://learn.microsoft.com/en-us/sql/t-sql/statements/create-column-encryption-key-transact-sql
- Microsoft Learn: SqlColumnEncryptionAzureKeyVaultProvider constructor: https://learn.microsoft.com/en-us/dotnet/api/microsoft.data.sqlclient.alwaysencrypted.azurekeyvaultprovider.sqlcolumnencryptionazurekeyvaultprovider.-ctor
- Microsoft Learn: Use Always Encrypted with the JDBC driver: https://learn.microsoft.com/en-us/sql/connect/jdbc/using-always-encrypted-with-the-jdbc-driver
- Microsoft Learn: az keyvault key create: https://learn.microsoft.com/en-us/cli/azure/keyvault/key

## Issues Found
- The PowerShell examples created and used a column encryption key protected by Azure Key Vault without authenticating the SqlServer cmdlets to Azure Key Vault. Added `Az.Accounts`, `Connect-AzAccount`, `Get-AzAccessToken -ResourceUrl https://vault.azure.net`, and `-KeyVaultAccessToken` on `New-SqlColumnEncryptionKey` and `Set-SqlColumnEncryption`.
- The PowerShell examples repeatedly called `Get-SqlDatabase` instead of reusing a database object. This was not incorrect, but the example now stores `$database` once so the Key Vault token changes fit cleanly and match Microsoft examples.
- The query limitations section omitted the documented requirement to supply encrypted column values through query parameters rather than plaintext literals. Added this as a general limitation.

## Review Notes
The post focuses on Always Encrypted without secure enclaves. Microsoft documents that Always Encrypted with secure enclaves can support richer confidential queries and in-place encryption in supported environments, so future revisions could mention that distinction if the post expands scope. The Azure CLI, T-SQL metadata, .NET provider, and JDBC connection-string examples were consistent with current Microsoft documentation.
