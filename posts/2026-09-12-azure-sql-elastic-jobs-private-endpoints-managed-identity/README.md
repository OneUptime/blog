# Secure Azure SQL Elastic Jobs with Private Endpoints

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure SQL, Managed Identity, Networking, Security, Automation

Description: Configure Elastic Jobs service-managed private endpoints and a user-assigned identity so Azure SQL targets remain reachable with public access disabled.

---

Azure SQL Elastic Jobs can reach target databases without enabling the broad `Allow Azure services and resources to access this server` setting. The supported mechanism is an Elastic Jobs service-managed private endpoint, created for the job agent and approved on each target server.

Authentication and network reachability are separate. A private endpoint does not grant SQL permissions, and a database user does not create a private network route.

## Map every connection before configuring access

Inventory the job agent, its job database, all target logical servers, and any server receiving job output. Record their resource IDs, subscriptions, cloud environment, and database names.

The agent connects to its own job database using internal certificate-based authentication. That control connection does not use the target private-endpoint feature. If you also add the job database as a target, it becomes an ordinary target for that execution and needs the corresponding target connectivity setup.

Use a private endpoint for every target server and output server that must remain private. One endpoint covers databases under that logical server for the agent; it does not authorize the agent to connect to arbitrary unrelated servers.

## Choose the supported identity model

Microsoft recommends a user-assigned managed identity for Elastic Jobs target authentication. System-assigned managed identity is not supported for this purpose. Each agent supports one user-assigned identity, and its targets use a consistent authentication method.

Assign the identity to the agent and create a contained database user for it in each target. The following example assumes an existing, narrowly scoped maintenance procedure and a provisioning principal that can resolve the identity and create users:

```sql
CREATE USER [jobs-maintenance] FROM EXTERNAL PROVIDER;
GRANT EXECUTE ON OBJECT::dbo.RefreshOrderStatistics TO [jobs-maintenance];
```

Replace the display name with the actual user-assigned identity. Validate the resolved identity, especially in tenants with duplicate display names. If the procedure needs permissions beyond those provided by ownership chaining, use a reviewed execution context or module-signing design; merely granting EXECUTE does not automatically grant every permission inside arbitrary dynamic SQL.

For server or pool target groups, configure the additional discovery access documented for those targets. An explicit database target is easier for an initial test because it does not depend on enumerating databases.

## Create and approve the service-managed endpoint

In the Azure portal, open the Elastic job agent's **Private endpoints** page, add the target server, and create an endpoint. Then open that logical server's **Networking > Private access** page and approve the pending request. Verify that the request belongs to the expected agent and resource before approving it.

Repeat for each target and output server. The required `Microsoft.Network` provider registration must exist in the relevant subscriptions. The agent and target must be in the same Azure cloud type; supported cross-region or cross-subscription placement does not mean public-cloud to government-cloud connectivity.

Do not substitute an ordinary private endpoint created in an application VNet. That endpoint serves clients with access to that VNet; it does not put the managed Elastic Jobs service inside your application's network.

## Test one database using the agent

Connect to the job database and create an explicit test target:

```sql
EXEC jobs.sp_add_target_group
    @target_group_name = N'PrivateConnectivityProbe';

EXEC jobs.sp_add_target_group_member
    @target_group_name = N'PrivateConnectivityProbe',
    @target_type = N'SqlDatabase',
    @server_name = N'orders-prod.database.windows.net',
    @database_name = N'orders';

EXEC jobs.sp_add_job
    @job_name = N'PrivateIdentityProbe',
    @description = N'Check target connectivity and current database identity';

EXEC jobs.sp_add_jobstep
    @job_name = N'PrivateIdentityProbe',
    @target_group_name = N'PrivateConnectivityProbe',
    @command = N'SELECT DB_NAME() AS database_name, USER_NAME() AS database_user;';

DECLARE @execution_id uniqueidentifier;
EXEC jobs.sp_start_job
    @job_name = N'PrivateIdentityProbe',
    @job_execution_id = @execution_id OUTPUT;
SELECT @execution_id AS job_execution_id;
```

These are one-time creation commands; reuse or deliberately update existing definitions on reruns. The managed-identity path omits `@credential_name`, `@refresh_credential_name`, and `@output_credential_name`. Those parameters belong to the database-scoped credential path.

Inspect the returned execution ID in `jobs.job_executions`. Include child records so you can identify which target failed. A successful `SELECT` demonstrates target execution; capturing its result rows centrally requires configured job output storage and that storage's permissions and endpoint.

## Disable broad public access and retest

Once endpoints are approved and the job succeeds, disable the broad Azure-services allowance. If the requirement is fully private targets, disable the target server's public network access as well. Ensure application and administrator access has its own working private path before that change.

Run the same probe again through the agent, followed by the least-privileged real job. A test from a laptop does not prove the managed service's connection path. Confirm an unapproved public path fails separately if that is part of the acceptance criteria.

For output jobs, verify that results arrive at the output database. Successful target work with failed output persistence is still a failed operational workflow.

## Diagnose failures by layer

A pending endpoint needs approval, not a larger SQL role. A login failure after connectivity is established needs identity and database-user checks. An EXECUTE denial needs a targeted permission correction. A failed server-target refresh can indicate missing discovery configuration even when an explicit database target works.

Preserve execution IDs and error text. Alert on failed or missed jobs and retain enough history to explain which server, identity, and job version were used.

## Conclusion

Use the agent's service-managed private endpoints for network access and a user-assigned identity for database authorization. Verify both through a real agent execution after public access is restricted.

## Official Documentation

- [Elastic Jobs authentication and private endpoints](https://learn.microsoft.com/en-us/azure/azure-sql/database/elastic-jobs-overview?view=azuresql)
- [Configure Elastic Jobs private endpoints](https://learn.microsoft.com/en-us/azure/azure-sql/database/elastic-jobs-tutorial?view=azuresql)
- [Create and manage jobs with T-SQL](https://learn.microsoft.com/en-us/azure/azure-sql/database/elastic-jobs-tsql-create-manage?view=azuresql)
- [Microsoft Entra user creation by service principals](https://learn.microsoft.com/en-us/azure/azure-sql/database/authentication-aad-service-principal?view=azuresql)
- [Azure SQL firewall rules](https://learn.microsoft.com/en-us/azure/azure-sql/database/firewall-configure?view=azuresql)
