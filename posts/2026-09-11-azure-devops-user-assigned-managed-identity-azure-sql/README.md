# Use a User-Assigned Identity with Azure SQL from Azure DevOps

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure SQL, Azure DevOps, Managed Identity, Authentication, Azure

Description: Connect an Azure DevOps pipeline to Azure SQL using a user-assigned managed identity, workload identity federation, and an in-memory SQL access token.

---

An Azure DevOps pipeline can authenticate as a user-assigned managed identity without storing a client secret. The useful distinction is how the pipeline obtains that identity: workload identity federation lets the pipeline exchange an OpenID Connect (OIDC) ID token for a Microsoft Entra access token, while an agent-assigned identity depends on the machine hosting the agent.

This example uses an Azure Resource Manager service connection backed by a user-assigned identity and workload identity federation. It requests a token for Azure SQL inside an `AzureCLI@2` task and passes that token directly to PowerShell's `Invoke-Sqlcmd`.

## Prepare identity and network access

Create or select a user-assigned managed identity dedicated to the pipeline. Record its name, client ID, principal ID, and tenant:

```bash
az identity show --resource-group rg-identities \
  --name sql-release-identity \
  --query '{name:name,clientId:clientId,principalId:principalId,tenantId:tenantId}' \
  --output json
```

The identity need not be attached to a Microsoft-hosted build agent when using federation. Do not run `az login --identity` on an arbitrary hosted agent and expect it to impersonate the selected identity: that command uses the hosting environment's managed identity endpoint.

Separately choose an agent with connectivity to the SQL endpoint. For a database with public access disabled, use an agent whose network can route to the private endpoint and resolve the SQL hostname through the appropriate private DNS path. The YAML below uses a preconfigured self-hosted pool named `sql-private-agents` for that reason.

Federation does not provide a network tunnel. A valid access token and a working TCP path are independent prerequisites.

## Create the federated service connection

In Azure DevOps, open Project settings, Service connections, and create an Azure Resource Manager connection using the Managed identity option. Select the existing identity and the narrow Azure scope required by the pipeline. Name the connection `sql-release-wif` and authorize the intended pipeline to use it.

Follow the [current service connection wizard](https://learn.microsoft.com/en-us/azure/devops/pipelines/library/connect-to-azure?view=azure-devops), which establishes the federated credential for the selected identity. Avoid copying an issuer or subject from a different organization or service connection. If using manual configuration, transfer the exact issuer, subject, and audience provided by that connection.

The account configuring federation needs permission to update the identity's federated credentials. That permission is separate from the pipeline's runtime access. Review any Azure role assignment created by the wizard; SQL data access does not require subscription-wide Contributor access.

## Grant access inside the database

Configure a Microsoft Entra administrator on the Azure SQL logical server. Connect using Microsoft Entra authentication as an authorized administrator directly to the target database and create the identity's contained user:

```sql
CREATE USER [sql-release-identity] FROM EXTERNAL PROVIDER;
GRANT CONNECT TO [sql-release-identity];
GRANT SELECT ON OBJECT::dbo.SchemaVersion TO [sql-release-identity];
```

This example assumes an existing `dbo.SchemaVersion` table. Replace that grant with the actual permissions required by your verification or deployment process. A smoke test needs far fewer privileges than a migration that creates tables and alters schemas. Build a reviewed migration role if schema deployment is needed; do not make every release identity a database owner by default.

Use the identity's display name for ordinary external user creation. If names are ambiguous, use Azure SQL's supported object-ID-qualified creation with the principal ID, after checking the [`CREATE USER` reference](https://learn.microsoft.com/en-us/sql/t-sql/statements/create-user-transact-sql?view=sql-server-ver17).

## Request the SQL token inside the task

Prepare the agent with Azure CLI, PowerShell 7, and the `SqlServer` PowerShell module version 22 or later. Install and manage those dependencies in the agent image so deployments do not depend on an unreviewed module installation during each run.

```yaml
trigger: none

pool:
  name: sql-private-agents

steps:
  - task: AzureCLI@2
    displayName: Verify Azure SQL access
    inputs:
      azureSubscription: sql-release-wif
      scriptType: pscore
      scriptLocation: inlineScript
      visibleAzLogin: false
      inlineScript: |
        $ErrorActionPreference = 'Stop'
        Import-Module SqlServer -MinimumVersion 22.0.0

        $sqlToken = az account get-access-token `
          --resource https://database.windows.net/ `
          --query accessToken --output tsv
        if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($sqlToken)) {
          throw 'Could not acquire an Azure SQL access token.'
        }

        try {
          Invoke-Sqlcmd `
            -ServerInstance 'orders-prod.database.windows.net' `
            -Database 'orders' `
            -AccessToken $sqlToken `
            -Encrypt Mandatory `
            -ConnectionTimeout 30 `
            -QueryTimeout 30 `
            -AbortOnError `
            -Query 'SELECT DB_NAME() AS database_name, USER_NAME() AS database_user;'
        }
        finally {
          $sqlToken = $null
        }
```

`AzureCLI@2` logs in through the named service connection before executing its script. The subsequent token request uses that context, with Azure SQL as the resource audience. An Azure Resource Manager token cannot be substituted for a SQL token.

Keep token acquisition and consumption inside the same task. Do not echo the token, publish it as an output variable, write it into a pipeline artifact, or pass it to another job. The cleanup assignment drops this script's reference; it is not a claim of secure memory erasure.

## Verify the complete deployment path

The query should return `orders` and the expected contained user. Then exercise a narrowly scoped operation that matches the release's real permissions. If deploying an approved SQL script, `Invoke-Sqlcmd` supports `-InputFile`; preserve error handling and review the script's transactional behavior.

A federation failure points to service connection authorization or the federated credential. A token-identified-principal login failure points toward the SQL user, database, or tenant. A timeout points toward agent networking, DNS, or database availability. Classifying those failures avoids repeatedly broadening permissions for a routing problem.

## Conclusion

Use a federated service connection to select the pipeline identity, SQL grants to define its data access, and an appropriately connected agent to reach the database. The resulting pipeline can validate Azure SQL access without a stored password or client secret.

## Official Documentation

- [Azure Resource Manager service connections](https://learn.microsoft.com/en-us/azure/devops/pipelines/library/connect-to-azure?view=azure-devops)
- [Configure workload identity federation](https://learn.microsoft.com/en-us/azure/devops/pipelines/release/configure-workload-identity?view=azure-devops)
- [AzureCLI task reference](https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/azure-cli-v2?view=azure-pipelines)
- [Invoke-Sqlcmd](https://learn.microsoft.com/en-us/powershell/module/sqlserver/invoke-sqlcmd?view=sqlserver-ps)
- [Azure CLI access tokens](https://learn.microsoft.com/en-us/cli/azure/account?view=azure-cli-latest#az-account-get-access-token)
