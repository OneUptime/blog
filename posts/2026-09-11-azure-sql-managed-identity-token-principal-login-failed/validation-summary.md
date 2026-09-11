# Validation Summary: Fix Azure SQL Login Failed for a Token-Identified Principal

## Status
validated

## Post Type
Technical troubleshooting guide with Azure CLI commands, a SqlClient connection string, and Transact-SQL examples.

## Technologies Covered
- Azure SQL Database and SQL Managed Instance scope differences
- Microsoft Entra authentication and managed identities
- Microsoft.Data.SqlClient and Azure.Identity credential selection
- Azure CLI and JMESPath output filtering
- Transact-SQL contained users, catalog views, and database/object permissions
- Access token identity claims

## Sources Consulted
- [SqlClient Microsoft Entra authentication modes and version requirements](https://learn.microsoft.com/en-us/sql/connect/ado-net/sql/azure-active-directory-authentication?view=sql-server-ver17)
- [Microsoft Entra authentication overview](https://learn.microsoft.com/en-us/azure/azure-sql/database/authentication-aad-overview?view=azuresql)
- [Configure Microsoft Entra authentication](https://learn.microsoft.com/en-us/azure/azure-sql/database/authentication-aad-configure?view=azuresql)
- [Managed identities in Microsoft Entra for Azure SQL](https://learn.microsoft.com/en-us/azure/azure-sql/database/authentication-azure-ad-user-assigned-managed-identity?view=azuresql)
- [Azure CLI identity show](https://learn.microsoft.com/en-us/cli/azure/identity?view=azure-cli-latest#az-identity-show)
- [Azure CLI login](https://learn.microsoft.com/en-us/cli/azure/reference-index?view=azure-cli-latest#az-login)
- [Azure CLI token acquisition](https://learn.microsoft.com/en-us/cli/azure/account?view=azure-cli-latest#az-account-get-access-token)
- [Azure CLI SQL server Entra administrators](https://learn.microsoft.com/en-us/cli/azure/sql/server/ad-admin?view=azure-cli-latest#az-sql-server-ad-admin-list)
- [CREATE USER](https://learn.microsoft.com/en-us/sql/t-sql/statements/create-user-transact-sql?view=sql-server-ver17)
- [sys.database_principals](https://learn.microsoft.com/en-us/sql/relational-databases/system-catalog-views/sys-database-principals-transact-sql?view=sql-server-ver17)
- [CAST and CONVERT](https://learn.microsoft.com/en-us/sql/t-sql/functions/cast-and-convert-transact-sql?view=sql-server-ver17)
- [GRANT database permissions](https://learn.microsoft.com/en-us/sql/t-sql/statements/grant-database-permissions-transact-sql?view=sql-server-ver17)
- [GRANT object permissions](https://learn.microsoft.com/en-us/sql/t-sql/statements/grant-object-permissions-transact-sql?view=sql-server-ver17)
- [DB_NAME](https://learn.microsoft.com/en-us/sql/t-sql/functions/db-name-transact-sql?view=sql-server-ver17)
- [USER_NAME](https://learn.microsoft.com/en-us/sql/t-sql/functions/user-name-transact-sql?view=sql-server-ver17)
- [ORIGINAL_LOGIN](https://learn.microsoft.com/en-us/sql/t-sql/functions/original-login-transact-sql?view=sql-server-ver17)
- [Access token claims reference](https://learn.microsoft.com/en-us/entra/identity-platform/access-token-claims-reference)
- [Troubleshoot common Azure SQL connection issues](https://learn.microsoft.com/en-us/azure/azure-sql/database/troubleshoot-common-errors-issues?view=azuresql)

## Issues Found
1. **Missing SqlClient 7.0 authentication dependency.** The post described a current SqlClient application without mentioning that Microsoft Entra authentication moved out of the core package in version 7.0. Added the required `Microsoft.Data.SqlClient.Extensions.Azure` NuGet package to the existing version guidance. The connection string and client-ID behavior remain correct.
2. **VM reproduction assumed Azure subscription access.** An identity with only SQL permissions can lack subscriptions visible to Azure CLI. Added `--allow-no-subscriptions` to `az login --identity --client-id` and briefly explained it. This avoids making subscription access an unintended prerequisite for the token-acquisition check.

## Review Notes
- Reviewed the commands and SQL against official documentation; no live Azure VM, managed identity, or SQL database was used. Successful deployment still depends on the reader supplying real resources, network access, an assigned identity, and an existing example table.
- Confirmed that SqlClient 3.0 and later use the user-assigned identity client ID in `User ID`; version 2.1 used its object ID. System-assigned authentication omits this selector.
- Confirmed the Azure CLI command names, identity selectors, resource endpoint option, and JSON query/output flags. The token command prints metadata rather than the access token. `expiresOn` remains supported and is local time; `expires_on` is preferable if this diagnostic becomes automated expiration processing.
- Confirmed contained-user database scope, the distinction between workload and server identities, and directory lookup requirements during provisioning. Azure resource management roles do not substitute for the SQL grants shown.
- Confirmed external principal types `E` and `X`, the catalog columns, hexadecimal SID conversion, user creation, `CONNECT`, object-level `SELECT`, and the three session-inspection functions. The hexadecimal SID is a diagnostic representation, not a directly formatted object-ID GUID.
- Confirmed Azure SQL Database supports `WITH OBJECT_ID` for duplicate-name disambiguation. The linked syntax supplies the required alias/object-ID details without confusing client IDs and principal object IDs.
- The generic login error does not identify the selected identity or establish that its token is valid. The post appropriately checks tenant, audience, identity mapping, and target database and distinguishes authentication from authorization.
- All five official documentation links in the post resolved to the intended Microsoft Learn references. The author link is attribution rather than technical evidence.
- Changes were limited to the two technical prerequisites above; the post's structure and SQL examples were preserved.
