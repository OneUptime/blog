# Stop SqlPackage Deployments from Revoking Azure SQL CONNECT

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure SQL, SQL Server, Deployment, Security, Troubleshooting

Description: Inspect SqlPackage deployment plans to find unexpected CONNECT changes, then align permission ownership and verify application access before publishing.

---

If a SqlPackage deployment produces `REVOKE CONNECT` for an application user, first determine why that statement exists in the deployment plan. It may reflect a source-versus-target permission difference, a user-related model change, or explicit pre/post-deployment SQL. One generic ignore switch cannot explain every case.

`REVOKE CONNECT` removes an explicit permission state. It is not the same operation as disabling a server login, and its effective impact depends on permissions inherited through roles and other principals. Test a fresh application connection instead of inferring the outcome from the statement alone.

## Generate the exact plan before publishing

Use the same DACPAC, publish profile, variables, tool version, and target as the proposed deployment. The Script action generates a deployment script without publishing the schema changes:

```bash
sqlpackage /Action:Script \
  /SourceFile:artifacts/Orders.dacpac \
  /Profile:deploy/Orders.publish.xml \
  /OutputPath:artifacts/orders-deploy.sql

rg -n -i 'revoke\s+connect|deny\s+connect|grant\s+connect|create\s+user|alter\s+user|drop\s+user' \
  artifacts/orders-deploy.sql
```

The profile must identify the intended target and use your approved authentication mechanism. Keep secrets out of checked-in profiles. Generating a script still connects to and reads target metadata, so use the appropriate environment and protect the output.

Inspect the surrounding SQL and the complete plan, not just matching lines. Multi-line statements or SQLCMD includes can defeat a simple text search. A DeployReport can help identify the planned object operations, but it does not replace reading the generated SQL.

## Compare the user's permissions and model

On the target database, inspect the principal and explicit CONNECT entries:

```sql
SELECT name, type_desc, authentication_type_desc
FROM sys.database_principals
WHERE name = N'orders-app';

SELECT
    principal.name,
    permission.state_desc,
    permission.permission_name
FROM sys.database_permissions AS permission
JOIN sys.database_principals AS principal
  ON principal.principal_id = permission.grantee_principal_id
WHERE permission.class = 0
  AND permission.permission_name = N'CONNECT'
  AND principal.name = N'orders-app';

SELECT role_principal.name AS role_name
FROM sys.database_role_members AS membership
JOIN sys.database_principals AS role_principal
  ON role_principal.principal_id = membership.role_principal_id
JOIN sys.database_principals AS member_principal
  ON member_principal.principal_id = membership.member_principal_id
WHERE member_principal.name = N'orders-app';
```

This is an explicit-permission and membership inventory, not a complete calculation of effective authorization. Review DENY entries and inherited access too. Compare the user definition and grants with the database project, extracted source model, and scripts bundled into the DACPAC.

If the source intentionally owns application permissions, express the intended permission in that source:

```sql
GRANT CONNECT TO [orders-app];
```

Include the appropriate user definition and object permissions as part of the same reviewed security model. A CONNECT grant alone does not grant access to application tables or procedures.

## Choose one owner for runtime security

If the schema deployment owns users and permissions, fix the source model and regenerate the plan. Do not hide an accidental removal by ignoring all permission changes: that also prevents intended security changes from being deployed.

If a separate identity-provisioning process owns runtime users, evaluate these documented properties:

| Property | What it controls |
| --- | --- |
| `IgnorePermissions=True` | Ignores permission differences during comparison |
| `DropPermissionsNotInSource=False` | Avoids dropping permissions solely because they are absent from the source |
| `IgnoreRoleMembership=True` | Ignores role-membership differences |
| `ExcludeObjectTypes=Users;Permissions;RoleMembership` | Excludes those object categories from deployment |

These choices have different scopes. `DropObjectsNotInSource=False` is not a blanket guarantee that existing permissions cannot change. `IgnoreUserSettingsObjects` concerns user settings; it is not a universal security-permission switch.

For a deployment that intentionally leaves all three security categories to a separate process, test a Script action with an explicit exclusion:

```bash
sqlpackage /Action:Script \
  /SourceFile:artifacts/Orders.dacpac \
  /Profile:deploy/Orders.publish.xml \
  '/p:ExcludeObjectTypes=Users;Permissions;RoleMembership' \
  /OutputPath:artifacts/orders-schema-only.sql
```

Quote the semicolon-delimited value so the shell passes it as one argument. Check for dependencies, such as schemas owned by excluded users, and ensure the external provisioning process creates required principals before schema deployment.

## Inspect explicit deployment scripts separately

Ignore and exclusion properties govern model comparison. They do not rewrite arbitrary SQL inside pre-deployment or post-deployment scripts. Search those source files for grants, revokes, denies, user recreation, and dynamic SQL.

If a script revokes CONNECT explicitly, correct its intended behavior in source. Do not assume an ignore property suppresses it. Keep the resulting plan as the review artifact and use the same configuration for the eventual publish.

## Verify fresh access after a staging deployment

Publish to a representative staging database and open a new connection using the application's actual identity. Existing pooled sessions are insufficient evidence because they may survive a change that blocks new connections.

Test a permitted application operation and an intentionally forbidden operation. Re-run the generated plan against the resulting target to detect recurring security drift. Record the DACPAC and SqlPackage versions alongside the result.

For a live outage, an authorized administrator can restore the intended grant after inspecting the effective permission state. Make the matching source or provisioning correction immediately; otherwise the next deployment can repeat the outage.

## Conclusion

Treat unexpected CONNECT changes as a deployment-model and ownership problem. Inspect the exact script, decide which process owns security, and verify fresh application authentication and least-privilege behavior before publishing.

## Official Documentation

- [SqlPackage Script action](https://learn.microsoft.com/en-us/sql/tools/sqlpackage/sqlpackage-script)
- [SqlPackage Publish properties](https://learn.microsoft.com/en-us/sql/tools/sqlpackage/sqlpackage-publish)
- [SqlPackage deployment reports](https://learn.microsoft.com/en-us/sql/tools/sqlpackage/sqlpackage-deploy-drift-report)
- [REVOKE database permissions](https://learn.microsoft.com/en-us/sql/t-sql/statements/revoke-database-permissions-transact-sql)
- [Database permissions catalog](https://learn.microsoft.com/en-us/sql/relational-databases/system-catalog-views/sys-database-permissions-transact-sql)
- [Pre-deployment and post-deployment scripts](https://learn.microsoft.com/en-us/sql/tools/sql-database-projects/concepts/pre-post-deployment-scripts)
