# How to Set Up Azure Active Directory Authentication for Azure SQL Database

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure SQL, Azure Active Directory, Authentication, Security, Managed Identity, Azure, Database

Description: A step-by-step guide to configuring Azure Active Directory authentication for Azure SQL Database, including managed identities and user provisioning.

---

SQL authentication with usernames and passwords works, but it comes with overhead. You need to manage credentials, rotate passwords, store secrets securely, and track who has access where. Azure Active Directory (Azure AD) authentication for Azure SQL Database eliminates most of these problems by letting you use the same identity system that manages your Azure resources, Microsoft 365 accounts, and enterprise applications.

In this post, I will walk through setting up Azure AD authentication for Azure SQL Database, creating Azure AD users, configuring managed identities for applications, and handling common scenarios.

## Why Azure AD Authentication?

Here are the practical advantages over SQL authentication:

**Centralized identity management.** Users are managed in Azure AD. When someone leaves the organization and their Azure AD account is disabled, they immediately lose access to the database. No need to hunt down and revoke individual SQL logins.

**Multi-factor authentication.** Azure AD supports MFA out of the box. You can require a second factor for database access, something SQL authentication cannot do.

**No passwords in connection strings.** With managed identities, your applications authenticate without any secrets in code or configuration. The identity is managed by Azure infrastructure.

**Group-based access.** You can grant database access to Azure AD groups. When someone joins or leaves the group, their access changes automatically.

**Conditional Access.** You can apply Azure AD Conditional Access policies to database connections, controlling access based on device compliance, location, and risk level.

## Setting Up the Azure AD Admin

The first step is designating an Azure AD admin for your SQL server. This admin can then create Azure AD users and manage access.

### Via Azure Portal

1. Go to the Azure Portal and open your SQL server.
2. In the left menu, under "Settings", click "Azure Active Directory".
3. Click "Set admin".
4. Search for and select an Azure AD user or group. I recommend using a group (e.g., "SQL Admins") so you can manage membership without changing the server configuration.
5. Click "Select", then "Save".

### Via Azure CLI

```bash
# Set an Azure AD admin for the SQL server
az sql server ad-admin create \
    --resource-group myResourceGroup \
    --server myserver \
    --display-name "SQL Admins" \
    --object-id "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

The object-id is the Azure AD object ID of the user or group you want to set as admin.

### Via PowerShell

```powershell
# Set an Azure AD admin using PowerShell
Set-AzSqlServerActiveDirectoryAdministrator `
    -ResourceGroupName "myResourceGroup" `
    -ServerName "myserver" `
    -DisplayName "SQL Admins" `
    -ObjectId "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

## Connecting as the Azure AD Admin

Once the admin is set, you can connect using Azure AD authentication.

### From SSMS

1. Open SQL Server Management Studio.
2. In the Connect to Server dialog, set the server name to `myserver.database.windows.net`.
3. For Authentication, select "Azure Active Directory - Universal with MFA" (recommended) or "Azure Active Directory - Password".
4. Enter your Azure AD email address.
5. Click Connect. If using MFA, you will be prompted for the second factor.

### From Azure Data Studio

1. Click "New Connection".
2. Enter the server name.
3. For Authentication type, select "Azure Active Directory".
4. Sign in with your Azure AD credentials.

## Creating Azure AD Users in the Database

The Azure AD admin can now create contained database users for other Azure AD identities.

### Creating a User for an Azure AD User

Connect to the specific database (not master) as the Azure AD admin and run:

```sql
-- Create a contained database user for an Azure AD user
-- The name must match the Azure AD user principal name
CREATE USER [john.doe@company.com] FROM EXTERNAL PROVIDER;

-- Grant appropriate permissions
ALTER ROLE db_datareader ADD MEMBER [john.doe@company.com];
ALTER ROLE db_datawriter ADD MEMBER [john.doe@company.com];
```

### Creating a User for an Azure AD Group

```sql
-- Create a contained database user for an Azure AD group
-- All members of this group will have access
CREATE USER [Backend Developers] FROM EXTERNAL PROVIDER;

-- Grant permissions to the group
ALTER ROLE db_datareader ADD MEMBER [Backend Developers];
ALTER ROLE db_datawriter ADD MEMBER [Backend Developers];
```

Using groups is the recommended approach because you manage access by adding or removing members from the Azure AD group, without touching the database at all.

### Creating a User for a Managed Identity

```sql
-- Create a contained database user for an Azure managed identity
-- Use the name of the Azure resource (App Service, VM, etc.)
CREATE USER [my-web-app] FROM EXTERNAL PROVIDER;

-- Grant permissions appropriate for the application
ALTER ROLE db_datareader ADD MEMBER [my-web-app];
ALTER ROLE db_datawriter ADD MEMBER [my-web-app];
```

## Setting Up Managed Identity Authentication

Managed identities are the recommended way to authenticate Azure-hosted applications to Azure SQL Database. There are no passwords to manage.

### System-Assigned Managed Identity

Most Azure services (App Service, Azure Functions, Virtual Machines, Container Instances) support system-assigned managed identities.

Step 1: Enable the managed identity on your Azure resource.

```bash
# Enable system-assigned managed identity on an App Service
az webapp identity assign \
    --resource-group myResourceGroup \
    --name my-web-app
```

Step 2: Create a database user for the managed identity (see the T-SQL above).

Step 3: Configure your application to use managed identity authentication. Here is a .NET example:

```csharp
// .NET connection string for managed identity authentication
// No password needed - the identity is provided by the Azure environment
string connectionString =
    "Server=myserver.database.windows.net;" +
    "Database=mydb;" +
    "Authentication=Active Directory Managed Identity;" +
    "Encrypt=True;";
```

For Python:

```python
from azure.identity import DefaultAzureCredential
import pyodbc

# DefaultAzureCredential automatically uses managed identity in Azure
credential = DefaultAzureCredential()
token = credential.get_token("https://database.windows.net/.default")

conn_str = (
    'DRIVER={ODBC Driver 18 for SQL Server};'
    'SERVER=myserver.database.windows.net;'
    'DATABASE=mydb;'
    'Encrypt=yes;'
    'TrustServerCertificate=no;'
)

# Pass the token to the connection
token_bytes = token.token.encode('utf-16-le')
token_struct = bytes([len(token_bytes) & 0xFF, (len(token_bytes) >> 8) & 0xFF]) + token_bytes
conn = pyodbc.connect(conn_str, attrs_before={1256: token_struct})
```

### User-Assigned Managed Identity

If you need the same identity across multiple resources, use a user-assigned managed identity:

```bash
# Create a user-assigned managed identity
az identity create \
    --resource-group myResourceGroup \
    --name my-db-identity

# Assign it to an App Service
az webapp identity assign \
    --resource-group myResourceGroup \
    --name my-web-app \
    --identities /subscriptions/{sub-id}/resourceGroups/myResourceGroup/providers/Microsoft.ManagedIdentity/userAssignedIdentities/my-db-identity
```

## Azure AD Only Authentication

For maximum security, you can disable SQL authentication entirely and require Azure AD for all connections:

```bash
# Enable Azure AD only authentication
az sql server ad-only-auth enable \
    --resource-group myResourceGroup \
    --name myserver
```

Once enabled, SQL authentication logins will stop working. All connections must use Azure AD. This is the recommended configuration for production environments where you have fully transitioned to Azure AD.

To disable it (if you need SQL authentication back):

```bash
# Disable Azure AD only authentication
az sql server ad-only-auth disable \
    --resource-group myResourceGroup \
    --name myserver
```

## Role-Based Access Patterns

Here is how I typically structure Azure AD-based database access for a team.

```sql
-- Developers get read access to production, full access to dev
CREATE USER [Dev Team] FROM EXTERNAL PROVIDER;
ALTER ROLE db_datareader ADD MEMBER [Dev Team];

-- Application managed identity gets read/write
CREATE USER [production-app] FROM EXTERNAL PROVIDER;
ALTER ROLE db_datareader ADD MEMBER [production-app];
ALTER ROLE db_datawriter ADD MEMBER [production-app];

-- Data analysts get read-only access
CREATE USER [Data Analysts] FROM EXTERNAL PROVIDER;
ALTER ROLE db_datareader ADD MEMBER [Data Analysts];

-- DBAs get full control through the Azure AD admin group
-- (already configured at the server level)
```

## Troubleshooting Common Issues

**"Principal 'user@company.com' could not be found"**: The user must exist in the same Azure AD tenant as the SQL server. Guest accounts from other tenants may need special configuration.

**"Login failed for user token-identified principal"**: The managed identity might not have a corresponding database user. Make sure you ran `CREATE USER [identity-name] FROM EXTERNAL PROVIDER` in the target database.

**"AADSTS700016: Application not found"**: This can happen when using service principal authentication with an incorrect application ID. Verify the client ID of your app registration.

**Cannot create Azure AD users**: Only the Azure AD admin can create users from external provider. Make sure you are connected as the designated Azure AD admin.

**MFA prompts for service accounts**: If you are using Azure AD authentication in automated processes, use managed identities or service principals instead of user accounts. User accounts may trigger MFA prompts.

## Migration Strategy

If you are transitioning from SQL authentication to Azure AD:

1. Set up the Azure AD admin.
2. Create Azure AD users for all team members and applications.
3. Test all connections with Azure AD authentication.
4. Update application connection strings to use managed identities.
5. Run both authentication methods in parallel for a transition period.
6. Once everything works, enable Azure AD only authentication.
7. Remove or disable SQL authentication logins.

## Summary

Azure AD authentication for Azure SQL Database brings centralized identity management, passwordless authentication with managed identities, MFA support, and group-based access control. Start by setting an Azure AD admin on your SQL server, create contained database users for Azure AD identities, and configure managed identities for your applications. For production environments, consider enabling Azure AD only authentication to fully eliminate SQL passwords from your infrastructure.
