# Schedule Azure SQL Maintenance Without SQL Server Agent

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure SQL, Automation, Maintenance, Monitoring, SQL Server

Description: Schedule targeted Azure SQL maintenance with Elastic Jobs, explicit UTC timing, bounded execution, and execution-history checks for every target database.

---

Azure SQL Database does not provide SQL Server Agent inside each database. For recurring T-SQL across one or many databases, Azure SQL Elastic Jobs supplies an external scheduler and execution service. SQL Managed Instance is a different product and does support SQL Server Agent.

Start with the maintenance operation you actually need. Azure manages backups and platform upkeep, and automatic statistics features may already address part of the workload. Scheduling a nightly rebuild of every index can add unnecessary log pressure and blocking.

## Define a small maintenance contract

Choose a bounded operation with a measurable benefit and explicit permissions. For example, after a known large data change, you may need to update statistics on a specific table before a reporting window. Record the table, expected duration, concurrency impact, and the evidence that automatic statistics updates are insufficient for that workflow.

The examples use an existing `dbo.OrderLines` table and a user-assigned identity already configured on the Elastic job agent. Create the matching user in the target and grant only what the chosen statement needs:

```sql
CREATE USER [jobs-statistics] FROM EXTERNAL PROVIDER;
GRANT ALTER ON OBJECT::dbo.OrderLines TO [jobs-statistics];
```

UPDATE STATISTICS requires ALTER permission on the table or view. That is broader than permission to call one carefully controlled procedure. If direct table ALTER is too broad for your design, use a reviewed signed-module or execution-context approach instead of silently granting `db_owner`.

## Establish agent and network prerequisites

Create an Elastic job agent with its dedicated job database. Use the agent's supported user-assigned managed identity for target authentication. Configure private connectivity through service-managed private endpoints when target public access is disabled.

Verify the identity can run the intended command in a staging target before configuring recurrence. An Azure RBAC role on the database resource does not by itself grant T-SQL execution permissions.

Keep the job database for job definitions and history. Do not modify the internal job tables directly; use the supported `jobs` stored procedures.

## Create an explicit target and disabled job

Connect to the job database, then create a single-database target:

```sql
EXEC jobs.sp_add_target_group
    @target_group_name = N'OrdersMaintenanceTarget';

EXEC jobs.sp_add_target_group_member
    @target_group_name = N'OrdersMaintenanceTarget',
    @target_type = N'SqlDatabase',
    @server_name = N'orders-prod.database.windows.net',
    @database_name = N'orders';

EXEC jobs.sp_add_job
    @job_name = N'OrdersStatistics',
    @description = N'Update OrderLines statistics after the scheduled load',
    @enabled = 0;

EXEC jobs.sp_add_jobstep
    @job_name = N'OrdersStatistics',
    @step_name = N'UpdateOrderLinesStatistics',
    @target_group_name = N'OrdersMaintenanceTarget',
    @command = N'UPDATE STATISTICS dbo.OrderLines;',
    @retry_attempts = 1,
    @step_timeout_seconds = 1800;
```

This is a one-time setup example. On subsequent deployments, inspect and update the existing job rather than attempting to create duplicate names. Managed-identity authentication omits the database-scoped credential parameters.

The timeout and retry count are example bounds that need workload testing. UPDATE STATISTICS can be expensive on large tables, and repeating it after an ambiguous interruption still consumes resources. Choose retry behavior from the operation's semantics.

## Run once and inspect every execution record

```sql
DECLARE @execution_id uniqueidentifier;
EXEC jobs.sp_start_job
    @job_name = N'OrdersStatistics',
    @job_execution_id = @execution_id OUTPUT;

SELECT @execution_id AS job_execution_id;
SELECT *
FROM jobs.job_executions
WHERE job_execution_id = @execution_id;
```

Starting the job is asynchronous. The immediate query can show pending or active work. Save the ID and query again until the relevant records reach a terminal state.

For multi-database targets, inspect child executions and retries, not just whether the top-level job was created successfully. Verify that statistics changed as expected and that foreground query latency remained acceptable during the run.

## Enable an explicit UTC schedule

After the manual execution passes, select a future start appropriate to your environment:

```sql
EXEC jobs.sp_update_job
    @job_name = N'OrdersStatistics',
    @enabled = 1,
    @schedule_start_time = '2026-09-13T02:00:00',
    @schedule_interval_type = N'Days',
    @schedule_interval_count = 1;
```

Replace this example date with your intended future UTC time. Elastic Jobs schedules use UTC, so a fixed UTC time changes its local-clock appearance when daylight saving changes. If the requirement is a business-local schedule, account for those transitions explicitly in the scheduling system.

A disabled recurring job can run immediately when re-enabled to catch up a missed interval. Before re-enabling, update its start time if immediate execution would violate the maintenance window.

## Prevent overlapping operational work

Do not assume separate jobs, manual runs, and external schedulers coordinate automatically. Check active executions and establish one owner for the maintenance schedule. If the operation needs stronger exclusion, implement an appropriate database lock or durable coordination rule and test cancellation and timeout paths.

Stagger work across databases sharing an elastic pool. A pool-wide target that starts maintenance on many databases at once can exhaust shared CPU, workers, or log throughput. Increase scope gradually after the single-target baseline is understood.

## Alert on failure and absence

Monitor execution outcome, duration, retry count, target coverage, and time since last successful completion. A job that never starts may produce no failed execution, so failure-only alerting misses schedule outages.

Keep enough history for investigation and export records if your retention needs exceed the service's job-history window. Include a runbook that identifies the target, owner, safe retry conditions, and how to disable recurrence during an incident.

## Conclusion

Elastic Jobs provides scheduled T-SQL without SQL Server Agent in Azure SQL Database. Keep maintenance targeted, test one execution first, use explicit UTC scheduling, and verify completion and impact for every target.

## Official Documentation

- [Azure SQL job automation choices](https://learn.microsoft.com/en-us/azure/azure-sql/database/job-automation-overview?view=azuresql)
- [Elastic Jobs concepts and scheduling](https://learn.microsoft.com/en-us/azure/azure-sql/database/elastic-jobs-overview?view=azuresql)
- [Elastic Jobs T-SQL setup and monitoring](https://learn.microsoft.com/en-us/azure/azure-sql/database/elastic-jobs-tsql-create-manage?view=azuresql)
- [jobs.sp_add_jobstep parameters](https://learn.microsoft.com/en-us/sql/relational-databases/system-stored-procedures/sp-add-jobstep-elastic-jobs-transact-sql)
- [UPDATE STATISTICS permissions and behavior](https://learn.microsoft.com/en-us/sql/t-sql/statements/update-statistics-transact-sql)
- [Index maintenance guidance](https://learn.microsoft.com/en-us/sql/relational-databases/indexes/reorganize-and-rebuild-indexes)
