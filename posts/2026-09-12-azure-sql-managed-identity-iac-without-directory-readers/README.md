# Grant Managed Identities Azure SQL Access from IaC

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure SQL, Managed Identity, Infrastructure as Code, Microsoft Entra ID, Security

Description: Provision Azure SQL contained users from verified managed identity client IDs, avoiding per-server Directory Readers assignments and detecting identity drift.

---

An infrastructure deployment can successfully create a managed identity and Azure SQL Database yet fail at `CREATE USER ... FROM EXTERNAL PROVIDER`. The SQL resource exists, but the identity performing directory lookup may lack Microsoft Graph permissions.

For Azure SQL Database, Microsoft documents a contained-user creation path using `SID` and `TYPE` that skips directory validation. This can remove a per-server Directory Readers assignment from the workflow, provided the deployment supplies and verifies the correct identity ID itself.

This walkthrough targets Azure SQL Database. Do not transfer ID-format assumptions or syntax to SQL Managed Instance, on-premises SQL Server, or Microsoft Fabric without consulting their product-specific documentation.

## Separate the identities and permission planes

There are at least three actors: the application's managed identity, the deployment identity connecting to SQL, and the logical server's identity used for directory lookup in flows that require it. They need not be the same principal.

Azure resource permissions allow provisioning or reading resources. Database permissions authorize T-SQL. Microsoft Graph permissions authorize directory queries. Subscription Contributor does not automatically grant the other two.

Keep an existing authorized bootstrap path, typically the configured Microsoft Entra administrator, for database-user provisioning. The SID syntax does not let an unauthenticated deployment create its first administrator or bypass SQL permissions.

## Obtain the application's client ID from IaC

A user-assigned identity exposes both a principal ID and a client ID. For this Azure SQL contained-user mapping, use the identity's application/client ID, as specified for service principals in the current `CREATE USER` documentation. The principal ID is the object ID of the identity's service principal and is a different value.

For a Bicep deployment that creates the application identity:

```bicep
param location string = resourceGroup().location
param identityName string = 'orders-api'

resource applicationIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: identityName
  location: location
}

output applicationPrincipalId string = applicationIdentity.properties.principalId
output applicationClientId string = applicationIdentity.properties.clientId
output applicationIdentityResourceId string = applicationIdentity.id
```

Assign that identity to the application host through the host resource's own configuration. Save the deployment output as a typed input to the SQL provisioning stage rather than resolving a potentially ambiguous display name.

For an existing identity, an authorized deployment can inspect it through Azure Resource Manager:

```bash
az identity show \
  --resource-group rg-app \
  --name orders-api \
  --query '{resourceId:id,principalId:principalId,clientId:clientId,tenantId:tenantId}' \
  --output json
```

Check the expected tenant and resource ID. Do not accept a client ID supplied by an untrusted application caller. Skipping server-side lookup transfers validation responsibility to the provisioning process.

## Create the contained user with drift detection

Connect directly to the target user database using the authorized provisioning identity. Replace the example GUID with the verified `clientId` from the deployment output:

```sql
DECLARE @user_name sysname = N'orders-api';
DECLARE @client_id uniqueidentifier = '11111111-2222-3333-4444-555555555555';
DECLARE @sid varbinary(16) = CONVERT(varbinary(16), @client_id);

IF NOT EXISTS (
    SELECT 1 FROM sys.database_principals WHERE name = @user_name
)
BEGIN
    DECLARE @sql nvarchar(max) =
        N'CREATE USER ' + QUOTENAME(@user_name) +
        N' WITH SID = ' + CONVERT(nvarchar(34), @sid, 1) +
        N', TYPE = E;';
    EXEC sys.sp_executesql @sql;
END
ELSE IF NOT EXISTS (
    SELECT 1
    FROM sys.database_principals
    WHERE name = @user_name AND sid = @sid AND type = 'E'
)
BEGIN
    THROW 50001, 'Existing database user does not match the expected identity.', 1;
END;

GRANT CONNECT TO [orders-api];
GRANT SELECT ON OBJECT::dbo.OrderStatus TO [orders-api];
```

The example assumes `dbo.OrderStatus` already exists and that reading it is the application's intended permission. Replace that grant with the actual least-privilege access requirement.

`TYPE = E` identifies an external user or service principal. `TYPE = X` is for a group and is not appropriate for the managed identity in this example. Converting a `uniqueidentifier` to binary in SQL preserves the SQL representation; do not invent a hexadecimal byte order by stripping hyphens from the GUID.

The mismatch check is deliberate. If an identity is deleted and recreated, its client ID changes even if its display name stays the same. Silently accepting the existing database user can leave the new application unable to authenticate or mask an unintended identity change.

## Verify the mapping and actual login

Inspect the result:

```sql
SELECT name, type_desc, authentication_type_desc,
       CONVERT(uniqueidentifier, sid) AS client_id
FROM sys.database_principals
WHERE name = N'orders-api'
  AND type = 'E'
  AND DATALENGTH(sid) = 16;
```

Then connect from the real application host using its managed identity, explicitly selecting the target database. For a user-assigned identity with modern SqlClient, select it using its client ID in the driver's managed identity configuration. Test the allowed query and an operation that should remain forbidden.

A successful provisioning statement does not prove that the ID exists, that the host has the identity attached, or that the token belongs to the expected tenant. Those are separate acceptance checks precisely because the SID path skips directory validation.

## Know when Graph lookup is still needed

If the deployment continues to use `FROM EXTERNAL PROVIDER`, the service-principal flow normally requires the logical server identity to read Microsoft Graph. Microsoft documents individual Graph application permissions and a role-assignable Directory Readers group as alternatives to manual per-server role assignment.

`WITH OBJECT_ID` disambiguates directory resolution; it is not the same as the no-validation `SID` and `TYPE` path. Choose one supported model and document who owns its tenant-level permissions.

Keep database-user provisioning idempotent, preserve evidence of identity outputs, and fail on drift rather than automatically dropping users and losing their grants or owned objects.

## Conclusion

Azure SQL's SID-based contained-user creation can make managed-identity provisioning repeatable without manual Directory Readers setup. Use authoritative client IDs, retain SQL authorization, reject mismatched existing users, and verify a real application login afterward.

## Official Documentation

- [Azure SQL managed identities and user creation without validation](https://learn.microsoft.com/en-us/azure/azure-sql/database/authentication-azure-ad-user-assigned-managed-identity?view=azuresql)
- [CREATE USER syntax and external principal types](https://learn.microsoft.com/en-us/sql/t-sql/statements/create-user-transact-sql)
- [Azure SQL Microsoft Entra identity and SID mapping](https://learn.microsoft.com/en-us/azure/azure-sql/database/authentication-aad-overview?view=azuresql)
- [Service-principal directory lookup requirements](https://learn.microsoft.com/en-us/azure/azure-sql/database/authentication-aad-service-principal?view=azuresql)
- [Bicep user-assigned identity resource](https://learn.microsoft.com/en-us/azure/templates/microsoft.managedidentity/2023-01-31/userassignedidentities)
- [Azure identity CLI](https://learn.microsoft.com/en-us/cli/azure/identity?view=azure-cli-latest)
