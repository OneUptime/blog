# Validation Summary: Stop SqlPackage Deployments from Revoking Azure SQL CONNECT

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Azure SQL Database
- SQL Server and Transact-SQL permissions
- SqlPackage and DacFx deployment properties
- DACPAC database projects
- SQLCMD pre-deployment and post-deployment scripts

## Sources Consulted
- [SqlPackage Script action](https://learn.microsoft.com/en-us/sql/tools/sqlpackage/sqlpackage-script)
- [SqlPackage Publish properties](https://learn.microsoft.com/en-us/sql/tools/sqlpackage/sqlpackage-publish)
- [SqlPackage CLI reference](https://learn.microsoft.com/en-us/sql/tools/sqlpackage/cli-reference)
- [SqlPackage deployment reports](https://learn.microsoft.com/en-us/sql/tools/sqlpackage/sqlpackage-deploy-drift-report)
- [REVOKE database permissions](https://learn.microsoft.com/en-us/sql/t-sql/statements/revoke-database-permissions-transact-sql)
- [REVOKE statement overview](https://learn.microsoft.com/en-us/sql/t-sql/statements/revoke-transact-sql)
- [sys.database_permissions](https://learn.microsoft.com/en-us/sql/relational-databases/system-catalog-views/sys-database-permissions-transact-sql)
- [sys.database_principals](https://learn.microsoft.com/en-us/sql/relational-databases/system-catalog-views/sys-database-principals-transact-sql)
- [sys.database_role_members](https://learn.microsoft.com/en-us/sql/relational-databases/system-catalog-views/sys-database-role-members-transact-sql)
- [Pre-deployment and post-deployment scripts](https://learn.microsoft.com/en-us/sql/tools/sql-database-projects/concepts/pre-post-deployment-scripts)
- [SqlDeploymentOptions.DropPermissionsNotInSource](https://learn.microsoft.com/en-us/dotnet/api/microsoft.sqlserver.dac.deployment.sqldeploymentoptions.droppermissionsnotinsource)

## Issues Found
- The staging verification step said to “re-run the generated plan,” which could be read as executing the generated deployment SQL and thereby changing the target. Changed it to “Run the Script action again” so the drift check is explicitly non-publishing and matches the documented SqlPackage workflow.

## Review Notes
- The SqlPackage command parameters and deployment property names are current as of the validation date. The semicolon-delimited `ExcludeObjectTypes` value is correctly quoted for a shell.
- The catalog queries correctly inventory the database principal, explicit database-level `CONNECT` entries, and direct database-role memberships. The post appropriately states that these queries do not calculate complete effective permissions.
- The distinction between model-comparison properties and arbitrary pre-deployment or post-deployment SQL is accurate. Those scripts are packaged in the DACPAC but are not part of the validated database object model.
- All external documentation links in the post resolved successfully during validation.
