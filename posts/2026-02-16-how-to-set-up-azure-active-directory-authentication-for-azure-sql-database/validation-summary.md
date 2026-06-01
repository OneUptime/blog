# Validation Summary: How to Set Up Azure Active Directory Authentication for Azure SQL Database

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure SQL Database
- Azure Active Directory / Microsoft Entra ID authentication
- Azure CLI
- Azure PowerShell
- SQL Server Management Studio
- Azure Data Studio
- T-SQL contained database users and database roles
- Managed identities
- Microsoft.Data.SqlClient connection strings
- Python, azure-identity, pyodbc, and Microsoft ODBC Driver for SQL Server

## Sources Consulted
- Microsoft Learn: Configure and manage Microsoft Entra authentication with Azure SQL, https://learn.microsoft.com/en-us/azure/azure-sql/database/authentication-aad-configure
- Microsoft Learn: Microsoft Entra server principals with Azure SQL, https://learn.microsoft.com/en-us/azure/azure-sql/database/authentication-azure-ad-logins
- Microsoft Learn: Azure CLI `az sql server ad-admin`, https://learn.microsoft.com/en-us/cli/azure/sql/server/ad-admin
- Microsoft Learn: Azure CLI `az sql server ad-only-auth`, https://learn.microsoft.com/en-us/cli/azure/sql/server/ad-only-auth
- Microsoft Learn: Azure CLI `az webapp identity assign`, https://learn.microsoft.com/en-us/cli/azure/webapp/identity
- Microsoft Learn: Azure CLI `az identity create`, https://learn.microsoft.com/en-us/cli/azure/identity
- Microsoft Learn: Microsoft.Data.SqlClient authentication modes, https://learn.microsoft.com/en-us/sql/connect/ado-net/sql/azure-active-directory-authentication
- Microsoft Learn: ODBC Driver for SQL Server Microsoft Entra authentication and access tokens, https://learn.microsoft.com/en-us/sql/connect/odbc/using-azure-active-directory
- Microsoft Learn: Conditional Access with Azure SQL Database and Azure Synapse Analytics, https://learn.microsoft.com/en-us/azure/azure-sql/database/conditional-access-configure

## Issues Found
- The Python `pyodbc` access-token example used a two-byte length prefix for the token attribute. Microsoft ODBC Driver expects the `ACCESSTOKEN` structure with a four-byte little-endian length prefix followed by the UTF-16-LE token bytes. Added `import struct` and changed the token construction to `struct.pack('<I', len(token_bytes)) + token_bytes`.
- The Conditional Access claim was too broad. Microsoft documents Conditional Access for Microsoft Entra user authentication to Azure SQL, so the wording was narrowed to "user database connections."
- The troubleshooting note said only the Azure AD admin can create users from external provider. The admin can create initial users, but other Microsoft Entra users can do this with sufficient database permissions. Updated the note to mention permissions such as `ALTER ANY USER` or `db_owner`.

## Review Notes
- Microsoft has renamed Azure Active Directory to Microsoft Entra ID. The post still uses Azure AD terminology because the title and framing are built around that name, but several current Microsoft docs use the newer name.
- The Azure CLI command shapes, PowerShell cmdlet, T-SQL role membership syntax, managed identity setup flow, and .NET managed identity connection-string authentication mode are consistent with current Microsoft documentation.
