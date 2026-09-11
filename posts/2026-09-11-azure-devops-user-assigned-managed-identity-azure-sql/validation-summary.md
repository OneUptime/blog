# Validation Summary: Use a User-Assigned Identity with Azure SQL from Azure DevOps

## Status
validated

## Post Type
Tutorial / implementation guide with Azure CLI, Transact-SQL, and Azure Pipelines YAML examples.

## Technologies Covered
- Azure SQL Database and contained Microsoft Entra database users
- Azure DevOps Pipelines and Azure Resource Manager service connections
- User-assigned managed identities and workload identity federation (OIDC)
- Azure CLI
- PowerShell 7 and the SqlServer module version 22 or later
- Private endpoints, DNS, and agent networking

## Sources Consulted
- [Azure Resource Manager service connections](https://learn.microsoft.com/en-us/azure/devops/pipelines/library/connect-to-azure?view=azure-devops)
- [Configure workload identity federation](https://learn.microsoft.com/en-us/azure/devops/pipelines/release/configure-workload-identity?view=azure-devops)
- [Azure DevOps ID token refresh](https://devblogs.microsoft.com/devops/introducing-azure-devops-id-token-refresh-and-terraform-task-version-5/)
- [AzureCLI@2 task reference](https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/azure-cli-v2?view=azure-pipelines)
- [Azure CLI identity commands](https://learn.microsoft.com/en-us/cli/azure/identity?view=azure-cli-latest#az-identity-show)
- [Azure CLI access tokens](https://learn.microsoft.com/en-us/cli/azure/account?view=azure-cli-latest#az-account-get-access-token)
- [Azure CLI managed identity authentication](https://learn.microsoft.com/en-us/cli/azure/authenticate-azure-cli-managed-identity?view=azure-cli-latest)
- [Invoke-Sqlcmd reference](https://learn.microsoft.com/en-us/powershell/module/sqlserver/invoke-sqlcmd?view=sqlserver-ps)
- [Configure Microsoft Entra authentication for Azure SQL](https://learn.microsoft.com/en-us/azure/azure-sql/database/authentication-aad-configure?view=azuresql)
- [CREATE USER reference](https://learn.microsoft.com/en-us/sql/t-sql/statements/create-user-transact-sql?view=sql-server-ver17)
- [GRANT object permissions](https://learn.microsoft.com/en-us/sql/t-sql/statements/grant-object-permissions-transact-sql?view=sql-server-ver17)
- [Azure SQL private endpoints](https://learn.microsoft.com/en-us/azure/azure-sql/database/private-endpoint-overview?view=azuresql)
- [Troubleshoot workload identity service connections](https://learn.microsoft.com/en-us/azure/devops/pipelines/release/troubleshoot-workload-identity?view=azure-devops)

## Issues Found
1. **Token terminology:** The introduction described federation as exchanging a “job token.” Changed this to an OIDC ID token exchanged for a Microsoft Entra access token. The federation assertion is distinct from the Azure DevOps job access token used to authorize DevOps API requests.
2. **Database administrator authentication:** The user creation instructions said to connect as an authorized administrator without specifying the authentication method. Explicitly required Microsoft Entra authentication, matching the documented prerequisites for creating an Entra contained user through `FROM EXTERNAL PROVIDER`.

## Review Notes
- Reviewed all command and configuration examples against the documented syntax. The identity lookup flags, JMESPath projection, SQL grants, YAML task inputs, and PowerShell continuation syntax are consistent with the intended use.
- The Managed identity service connection wizard supports an existing user-assigned identity and creates its federated credential. Federation setup permissions, pipeline authorization, Azure resource permissions, and SQL data permissions are separate concerns.
- `Invoke-Sqlcmd` accepts a string access token. Its `Encrypt` parameter was introduced in module version 22 and accepts `Mandatory`; the stated minimum version is appropriate. The SQL resource audience, timeout parameters, error handling, and `InputFile` guidance are valid.
- The sample query verifies login and database context; it does not exercise the table-level SELECT grant. The post correctly instructs readers to follow it with an operation matching their actual release permissions.
- Private access requires agent routing and DNS configuration. Keeping the logical server hostname in the SQL connection is correct even when traffic uses a private endpoint.
- External principal resolution requires directory access. If database user provisioning is automated under a service principal, the SQL server identity needs the documented Microsoft Graph permissions; the example uses an administrator provisioning step.
- The post avoids hard-coded federation issuer values. Current documentation notes migration from the Azure DevOps issuer to the Microsoft Entra issuer, so following the current wizard remains appropriate.
- All technical documentation links in the post resolved to the intended Microsoft resources. No deprecated command or parameter was identified in the examples.
- Validation was a documentation-based and static code review. No live Azure service connection, managed identity, private agent, or SQL database was provisioned or used to execute the pipeline; tenant permissions and network reachability remain deployment-specific prerequisites.
