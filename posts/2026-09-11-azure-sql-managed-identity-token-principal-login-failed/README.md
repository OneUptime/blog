# Fix Azure SQL Login Failed for a Token-Identified Principal

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure SQL, Managed Identity, Authentication, Troubleshooting, Azure

Description: Trace Azure SQL managed identity login failures through identity selection, tenant configuration, database users, and narrowly scoped permissions.

---

The error `Login failed for user '<token-identified principal>'` means that an access token reached the SQL authentication path, but the connection did not become an authenticated database session. The text does not identify which managed identity was selected, which database the client requested, or whether that database contains the expected user.

Treat the incident as a sequence of identity checks. Granting broad Azure roles or increasing a timeout does not establish which link failed. This walkthrough targets Azure SQL Database with a contained Microsoft Entra user; SQL Managed Instance has additional server-login options.

## Record the effective connection settings

Collect the logical server hostname, database name, authentication mode, driver version, and identity client ID from the failing application. Record configuration values after environment overrides are applied, without logging tokens or passwords.

For a current Microsoft.Data.SqlClient application using a user-assigned identity, the relevant shape is:

```text
Server=tcp:orders-prod.database.windows.net,1433;Database=orders;Authentication=Active Directory Managed Identity;User ID=<managed-identity-client-id>;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;
```

The `User ID` identifies the user-assigned identity by its **client ID** in Microsoft.Data.SqlClient 3.0 and later. It is not the identity's display name or object ID. For a system-assigned identity, omit that field. Starting with Microsoft.Data.SqlClient 7.0, include the `Microsoft.Data.SqlClient.Extensions.Azure` NuGet package to use this authentication mode. Check the [driver authentication reference](https://learn.microsoft.com/en-us/sql/connect/ado-net/sql/azure-active-directory-authentication?view=sql-server-ver17) if maintaining an older application.

Specify `Database=orders` explicitly. A contained user created in `orders` does not automatically become a user in `master`. A tool that first opens `master` can therefore fail while an application connecting directly to `orders` succeeds.

## Verify the selected identity

Read the identity resource without changing it:

```bash
az identity show \
  --resource-group rg-identities \
  --name orders-api-identity \
  --query '{clientId:clientId,principalId:principalId,tenantId:tenantId}' \
  --output json
```

Compare the client ID with the connection string and the principal ID with the service principal represented in the database. Inspect the hosting service's Identity configuration to confirm this identity is actually assigned to that service. An identity existing in Azure is insufficient if the application cannot request its tokens.

For a VM-based reproduction, run the following on a VM to which the identity is assigned:

```bash
az login --identity --client-id '<managed-identity-client-id>' --allow-no-subscriptions
az account get-access-token \
  --resource https://database.windows.net/ \
  --query '{tenant:tenant,expiresOn:expiresOn}' --output json
```

The `--allow-no-subscriptions` flag supports identities that have SQL permissions without access to an Azure subscription. This verifies token acquisition without printing the token. Running an ordinary developer `az login` tests the developer's identity instead. Likewise, `DefaultAzureCredential` can select a developer or environment credential, so a successful local run is not proof of production identity selection.

If a token must be inspected during an incident, decode it only in a controlled local tool, never a public token viewer. Compare its tenant, audience, and object identity with the intended configuration; decoding alone does not validate its signature.

## Check the logical server's Entra administrator

The logical server needs Microsoft Entra authentication configured. Inspect it:

```bash
az sql server ad-admin list \
  --resource-group rg-data \
  --server orders-prod \
  --output json
```

Have the database administrator verify that the server and managed identity belong to the intended tenant and that the configured Entra administrator can connect to the target database. Follow Microsoft's [Entra configuration guide](https://learn.microsoft.com/en-us/azure/azure-sql/database/authentication-aad-configure?view=azuresql) to repair a missing administrator.

Keep the caller identity separate from the SQL server's own identity. The application identity authenticates the application. The server identity can be used for directory lookups during principal provisioning. Changing one does not automatically repair the other.

## Inspect and provision the database user

Connect as the Entra administrator directly to `orders`, then inspect existing external principals:

```sql
SELECT name, type_desc, authentication_type_desc,
       CONVERT(varchar(170), sid, 1) AS principal_sid
FROM sys.database_principals
WHERE type IN ('E', 'X')
ORDER BY name;
```

If the expected identity has no user, provision it using its actual unique display name:

```sql
CREATE USER [orders-api-identity] FROM EXTERNAL PROVIDER;
GRANT CONNECT TO [orders-api-identity];
GRANT SELECT ON OBJECT::dbo.OrderStatus TO [orders-api-identity];
```

The table is an example: substitute the existing object and permissions the application requires. A recreated managed identity can retain a familiar name while receiving a new principal ID. Investigate that mismatch before dropping a database user, because the old user may own schemas or have permissions that need deliberate migration.

For duplicate display names, Azure SQL supports object-ID-qualified external user creation; use the documented [`CREATE USER` syntax](https://learn.microsoft.com/en-us/sql/t-sql/statements/create-user-transact-sql?view=sql-server-ver17) and the managed identity's principal object ID. Directory lookup failures during `CREATE USER` are provisioning failures, not evidence that the application needs `db_owner`.

Azure subscription roles control Azure resource management. They do not replace SQL object permissions. Keep database grants specific to the operations the application performs.

## Verify with the original application identity

Retry from the failing environment using a new connection and the corrected configuration. A useful first query is:

```sql
SELECT DB_NAME() AS database_name,
       USER_NAME() AS database_user,
       ORIGINAL_LOGIN() AS original_login;
```

Then run the smallest representative application operation. A successful login followed by `SELECT permission denied` is progress: authentication works and the remaining issue is authorization. Conversely, token acquisition exceptions occur before this SQL login checklist can succeed and should be investigated in the hosting identity configuration.

## Conclusion

Resolve token-identified-principal failures by proving the selected identity, target database, Entra configuration, and database user mapping. Verify the repair from the actual workload identity, then grant only the SQL permissions its workload needs.

## Official Documentation

- [Microsoft Entra authentication overview](https://learn.microsoft.com/en-us/azure/azure-sql/database/authentication-aad-overview?view=azuresql)
- [Configure Microsoft Entra authentication](https://learn.microsoft.com/en-us/azure/azure-sql/database/authentication-aad-configure?view=azuresql)
- [SqlClient authentication modes](https://learn.microsoft.com/en-us/sql/connect/ado-net/sql/azure-active-directory-authentication?view=sql-server-ver17)
- [CREATE USER](https://learn.microsoft.com/en-us/sql/t-sql/statements/create-user-transact-sql?view=sql-server-ver17)
- [Azure CLI token acquisition](https://learn.microsoft.com/en-us/cli/azure/account?view=azure-cli-latest#az-account-get-access-token)
