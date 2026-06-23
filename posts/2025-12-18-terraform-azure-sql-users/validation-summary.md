# Validation Summary: How to Add Azure SQL Users with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- AzureRM Terraform provider
- AzureAD Terraform provider
- betr-io/mssql Terraform provider
- Azure SQL Database
- Microsoft Entra ID authentication
- sqlcmd
- Azure Key Vault
- Azure App Service managed identities

## Sources Consulted
- HashiCorp AzureRM `azurerm_mssql_server` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/mssql_server
- HashiCorp AzureRM `azurerm_mssql_database` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/mssql_database
- HashiCorp AzureAD `azuread_group` and `azuread_group_member` resource documentation: https://registry.terraform.io/providers/hashicorp/azuread/latest/docs/resources/group and https://registry.terraform.io/providers/hashicorp/azuread/latest/docs/resources/group_member
- betr-io/mssql provider documentation for `mssql_login` and `mssql_user`: https://registry.terraform.io/providers/betr-io/mssql/latest/docs
- Microsoft Learn, Authenticate with Microsoft Entra ID in sqlcmd: https://learn.microsoft.com/en-us/sql/tools/sqlcmd/sqlcmd-authentication
- Microsoft Learn, Configure and manage Microsoft Entra authentication with Azure SQL: https://learn.microsoft.com/en-us/azure/azure-sql/database/authentication-aad-configure
- Microsoft Learn, Authorize database access to Azure SQL Database: https://learn.microsoft.com/en-us/azure/azure-sql/database/logins-create-manage
- Microsoft Learn, Contained User Access to Contained Databases: https://learn.microsoft.com/en-us/sql/relational-databases/security/contained-database-users-making-your-database-portable
- Microsoft Learn, Microsoft Entra logins and users with nonunique display names: https://learn.microsoft.com/en-us/sql/relational-databases/security/authentication-access/authentication-microsoft-entra-create-users-with-nonunique-names

## Issues Found
- The `provider "mssql"` example used unsupported provider-level arguments (`hostname`, `port`, and `sql_auth`). The betr-io/mssql provider config only supports provider-level options such as `debug`; connection details belong in each resource's `server` block. Changed the provider example to `provider "mssql" {}` while keeping the resource-level `server` blocks.
- The contained database user section claimed it was enabling contained database authentication on the Azure SQL server, but the Terraform resource did not configure such a setting and Azure SQL Database supports database-level contained users directly. Updated the comment to accurately describe Azure SQL Database behavior.
- The Microsoft Entra user example attempted to pass an Azure SQL access token to `sqlcmd` using `-G -P "$TOKEN"`, which is not the documented `sqlcmd` command-line pattern. Replaced it with the documented `sqlcmd` Go `--authentication-method ActiveDirectoryServicePrincipal` pattern.
- The Microsoft Entra user example checked `sys.database_principals` by display name while creating the user by UPN. Changed the existence check to use the same UPN that the `CREATE USER` statement creates.
- The Microsoft Entra group and managed identity examples used SQL authentication to execute `CREATE USER ... FROM EXTERNAL PROVIDER`. Azure SQL requires a Microsoft Entra-authenticated principal to create contained users mapped to Microsoft Entra identities. Updated these examples to use service principal authentication and added a note that the service principal must be the Microsoft Entra admin or already have `ALTER ANY USER`.
- The credential storage section implied Key Vault alone fully protects managed credentials. Added a state-safety note because Terraform stores managed secret values in state unless the backend and access controls are secured.

## Review Notes
The examples are still illustrative snippets and assume surrounding resources, variables, firewall access, `sqlcmd` installation, and a correctly permissioned automation identity. For production, avoid interpolating untrusted names into T-SQL, prefer least-privilege custom roles over broad fixed database roles where possible, and protect Terraform state because passwords, Key Vault secret values, and connection strings can be present there.
