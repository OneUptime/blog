# Validation Summary: Grant Managed Identities Azure SQL Access from IaC

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Azure SQL Database
- Microsoft Entra ID managed identities
- Transact-SQL (`CREATE USER`, `GRANT`, and catalog views)
- Bicep and Azure Resource Manager
- Azure CLI
- Microsoft Graph permissions and Directory Readers
- Microsoft.Data.SqlClient managed identity authentication

## Sources Consulted

- [Managed identities in Microsoft Entra for Azure SQL](https://learn.microsoft.com/en-us/azure/azure-sql/database/authentication-azure-ad-user-assigned-managed-identity?view=azuresql)
- [`CREATE USER` (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/statements/create-user-transact-sql)
- [Microsoft Entra authentication for Azure SQL](https://learn.microsoft.com/en-us/azure/azure-sql/database/authentication-aad-overview?view=azuresql)
- [Microsoft Entra service principals with Azure SQL](https://learn.microsoft.com/en-us/azure/azure-sql/database/authentication-aad-service-principal?view=azuresql)
- [Directory Readers role in Microsoft Entra ID for Azure SQL](https://learn.microsoft.com/en-us/azure/azure-sql/database/authentication-aad-directory-readers-role?view=azuresql)
- [Microsoft.ManagedIdentity/userAssignedIdentities 2023-01-31 Bicep reference](https://learn.microsoft.com/en-us/azure/templates/microsoft.managedidentity/2023-01-31/userassignedidentities)
- [`az identity` command reference](https://learn.microsoft.com/en-us/cli/azure/identity?view=azure-cli-latest)
- [Using Microsoft Entra authentication with SqlClient](https://learn.microsoft.com/en-us/sql/connect/ado-net/sql/azure-active-directory-authentication)

## Issues Found

- The post used the user-assigned managed identity's principal/object ID as the SID for a `TYPE = E` user. The current `CREATE USER` documentation specifies the application/client ID for a service principal, including a managed identity, when creating a contained user without validation. Changed the prose, SQL variable and verification alias, description, and conclusion to use the verified `clientId`. This prevents creating a database principal whose SID does not match the managed identity at login.

## Review Notes

- Microsoft documentation is inconsistent here: the managed-identities overview describes supplying an Object ID generically, while the current product-specific `CREATE USER` example explicitly uses the client ID for a service principal. The post now follows the more specific `CREATE USER` requirement.
- The `2023-01-31` managed identity API version remains supported, although newer API versions exist.
- The no-validation `SID` and `TYPE` syntax is documented for Azure SQL Database and SQL database in Microsoft Fabric, not Azure SQL Managed Instance.
