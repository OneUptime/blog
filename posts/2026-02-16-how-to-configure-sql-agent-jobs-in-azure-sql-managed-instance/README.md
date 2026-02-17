# How to Configure SQL Agent Jobs in Azure SQL Managed Instance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure SQL, Managed Instance, SQL Agent, Job Scheduling, Automation, Azure, Database

Description: Learn how to create and configure SQL Agent jobs in Azure SQL Managed Instance to automate maintenance tasks, data processing, and scheduled operations.

---

SQL Server Agent is the built-in job scheduling service that runs tasks on a schedule, responds to alerts, and automates routine maintenance. If you are migrating from on-premises SQL Server, chances are you have dozens of Agent jobs handling everything from nightly ETL processes to index maintenance and backup verification. Azure SQL Managed Instance supports SQL Server Agent, making it one of the few Azure SQL offerings where you can run scheduled jobs natively.

In this post, I will cover how to create and manage SQL Agent jobs in Managed Instance, migrate existing jobs, set up notifications, and handle common scheduling scenarios.

## SQL Agent in Managed Instance vs On-Premises

SQL Agent in Managed Instance works mostly the same as on-premises, with a few differences:

**Supported features**:
- T-SQL job steps
- SSIS package execution (via the SSIS catalog)
- Scheduled and on-demand job execution
- Job notifications via Database Mail
- Multi-step jobs with conditional logic
- Job categories and operators

**Limitations**:
- No CmdExec job steps (you cannot run operating system commands)
- No PowerShell job steps (use Azure Automation instead)
- No ActiveX Script job steps
- No Replication Agent jobs (use Azure-native replication)
- No SSAS or SSRS job steps
- The Agent service is always running and cannot be stopped

## Creating a Basic Job

Let me start with a simple job that runs a T-SQL maintenance script on a schedule.

```sql
-- Create a new SQL Agent job
-- This job will update statistics on all tables nightly
EXEC msdb.dbo.sp_add_job
    @job_name = N'Nightly Statistics Update',
    @description = N'Updates statistics on all user tables every night at 2 AM',
    @category_name = N'Database Maintenance',
    @enabled = 1;

-- Add a T-SQL job step
-- This step runs the statistics update command against the target database
EXEC msdb.dbo.sp_add_jobstep
    @job_name = N'Nightly Statistics Update',
    @step_name = N'Update Statistics',
    @step_id = 1,
    @subsystem = N'TSQL',
    @command = N'
        EXEC sp_MSforeachtable
            @command1 = ''UPDATE STATISTICS ? WITH FULLSCAN'';
    ',
    @database_name = N'MyDatabase',
    @on_success_action = 1,  -- Quit with success
    @on_fail_action = 2;     -- Quit with failure

-- Create a schedule that runs every night at 2:00 AM
EXEC msdb.dbo.sp_add_schedule
    @schedule_name = N'Nightly at 2 AM',
    @freq_type = 4,           -- Daily
    @freq_interval = 1,       -- Every 1 day
    @active_start_time = 020000;  -- 2:00:00 AM

-- Attach the schedule to the job
EXEC msdb.dbo.sp_attach_schedule
    @job_name = N'Nightly Statistics Update',
    @schedule_name = N'Nightly at 2 AM';

-- Enable the job on the local server
EXEC msdb.dbo.sp_add_jobserver
    @job_name = N'Nightly Statistics Update';
```

## Creating a Multi-Step Job

Real-world jobs often have multiple steps with conditional logic. Here is a job that performs index maintenance with multiple steps:

```sql
-- Create an index maintenance job with multiple steps
EXEC msdb.dbo.sp_add_job
    @job_name = N'Weekly Index Maintenance',
    @description = N'Rebuilds fragmented indexes and reorganizes moderately fragmented ones',
    @enabled = 1;

-- Step 1: Reorganize indexes with 10-30% fragmentation
EXEC msdb.dbo.sp_add_jobstep
    @job_name = N'Weekly Index Maintenance',
    @step_name = N'Reorganize Moderately Fragmented',
    @step_id = 1,
    @subsystem = N'TSQL',
    @command = N'
        -- Reorganize indexes with fragmentation between 10% and 30%
        DECLARE @sql NVARCHAR(MAX) = N'''';
        SELECT @sql = @sql +
            ''ALTER INDEX '' + QUOTENAME(i.name) +
            '' ON '' + QUOTENAME(s.name) + ''.'' + QUOTENAME(t.name) +
            '' REORGANIZE;'' + CHAR(13)
        FROM sys.dm_db_index_physical_stats(DB_ID(), NULL, NULL, NULL, ''LIMITED'') ips
        JOIN sys.indexes i ON ips.object_id = i.object_id AND ips.index_id = i.index_id
        JOIN sys.tables t ON i.object_id = t.object_id
        JOIN sys.schemas s ON t.schema_id = s.schema_id
        WHERE ips.avg_fragmentation_in_percent BETWEEN 10 AND 30
            AND ips.page_count > 1000
            AND i.name IS NOT NULL;
        EXEC sp_executesql @sql;
    ',
    @database_name = N'MyDatabase',
    @on_success_action = 3,  -- Go to next step
    @on_fail_action = 3;     -- Go to next step even on failure

-- Step 2: Rebuild indexes with over 30% fragmentation
EXEC msdb.dbo.sp_add_jobstep
    @job_name = N'Weekly Index Maintenance',
    @step_name = N'Rebuild Heavily Fragmented',
    @step_id = 2,
    @subsystem = N'TSQL',
    @command = N'
        -- Rebuild indexes with fragmentation over 30%
        DECLARE @sql NVARCHAR(MAX) = N'''';
        SELECT @sql = @sql +
            ''ALTER INDEX '' + QUOTENAME(i.name) +
            '' ON '' + QUOTENAME(s.name) + ''.'' + QUOTENAME(t.name) +
            '' REBUILD WITH (ONLINE = ON);'' + CHAR(13)
        FROM sys.dm_db_index_physical_stats(DB_ID(), NULL, NULL, NULL, ''LIMITED'') ips
        JOIN sys.indexes i ON ips.object_id = i.object_id AND ips.index_id = i.index_id
        JOIN sys.tables t ON i.object_id = t.object_id
        JOIN sys.schemas s ON t.schema_id = s.schema_id
        WHERE ips.avg_fragmentation_in_percent > 30
            AND ips.page_count > 1000
            AND i.name IS NOT NULL;
        EXEC sp_executesql @sql;
    ',
    @database_name = N'MyDatabase',
    @on_success_action = 3,  -- Go to next step
    @on_fail_action = 2;     -- Quit with failure

-- Step 3: Update statistics after index changes
EXEC msdb.dbo.sp_add_jobstep
    @job_name = N'Weekly Index Maintenance',
    @step_name = N'Update Statistics',
    @step_id = 3,
    @subsystem = N'TSQL',
    @command = N'
        -- Update statistics on all tables after index maintenance
        EXEC sp_MSforeachtable @command1 = ''UPDATE STATISTICS ? WITH SAMPLE 50 PERCENT'';
    ',
    @database_name = N'MyDatabase',
    @on_success_action = 1,  -- Quit with success
    @on_fail_action = 2;     -- Quit with failure

-- Schedule it for every Sunday at 3:00 AM
EXEC msdb.dbo.sp_add_schedule
    @schedule_name = N'Weekly Sunday 3 AM',
    @freq_type = 8,           -- Weekly
    @freq_interval = 1,       -- Sunday
    @freq_recurrence_factor = 1,
    @active_start_time = 030000;

EXEC msdb.dbo.sp_attach_schedule
    @job_name = N'Weekly Index Maintenance',
    @schedule_name = N'Weekly Sunday 3 AM';

EXEC msdb.dbo.sp_add_jobserver
    @job_name = N'Weekly Index Maintenance';
```

## Common Job Patterns

### Data Archival Job

A job that moves old data to archive tables:

```sql
-- Create a data archival job that runs monthly
EXEC msdb.dbo.sp_add_job
    @job_name = N'Monthly Data Archive',
    @description = N'Archives order data older than 2 years',
    @enabled = 1;

EXEC msdb.dbo.sp_add_jobstep
    @job_name = N'Monthly Data Archive',
    @step_name = N'Archive Old Orders',
    @step_id = 1,
    @subsystem = N'TSQL',
    @command = N'
        -- Move orders older than 2 years to the archive table
        BEGIN TRANSACTION;

        INSERT INTO dbo.Orders_Archive
        SELECT * FROM dbo.Orders
        WHERE OrderDate < DATEADD(YEAR, -2, GETDATE());

        DELETE FROM dbo.Orders
        WHERE OrderDate < DATEADD(YEAR, -2, GETDATE());

        COMMIT TRANSACTION;

        -- Log the result
        DECLARE @count INT = @@ROWCOUNT;
        RAISERROR(''Archived %d orders'', 0, 1, @count) WITH NOWAIT;
    ',
    @database_name = N'MyDatabase',
    @on_success_action = 1,
    @on_fail_action = 2;

-- Schedule for the first day of each month at 4 AM
EXEC msdb.dbo.sp_add_schedule
    @schedule_name = N'First of Month 4 AM',
    @freq_type = 32,          -- Monthly relative
    @freq_interval = 1,       -- First day
    @freq_relative_interval = 1,
    @freq_recurrence_factor = 1,
    @active_start_time = 040000;

EXEC msdb.dbo.sp_attach_schedule
    @job_name = N'Monthly Data Archive',
    @schedule_name = N'First of Month 4 AM';

EXEC msdb.dbo.sp_add_jobserver
    @job_name = N'Monthly Data Archive';
```

### ETL/Data Refresh Job

A job that refreshes aggregated reporting data:

```sql
-- Create an ETL job that refreshes summary tables every 15 minutes
EXEC msdb.dbo.sp_add_job
    @job_name = N'Refresh Sales Summary',
    @description = N'Refreshes the SalesSummary table from transaction data',
    @enabled = 1;

EXEC msdb.dbo.sp_add_jobstep
    @job_name = N'Refresh Sales Summary',
    @step_name = N'Rebuild Summary',
    @step_id = 1,
    @subsystem = N'TSQL',
    @command = N'
        -- Truncate and reload the sales summary table
        -- This provides a consistent, up-to-date view for reporting
        TRUNCATE TABLE dbo.SalesSummary;

        INSERT INTO dbo.SalesSummary (ProductID, TotalSales, OrderCount, LastUpdated)
        SELECT
            ProductID,
            SUM(Amount) AS TotalSales,
            COUNT(*) AS OrderCount,
            GETDATE() AS LastUpdated
        FROM dbo.Orders
        WHERE OrderDate >= DATEADD(DAY, -30, GETDATE())
        GROUP BY ProductID;
    ',
    @database_name = N'MyDatabase',
    @on_success_action = 1,
    @on_fail_action = 2;

-- Schedule every 15 minutes during business hours
EXEC msdb.dbo.sp_add_schedule
    @schedule_name = N'Every 15 Min Business Hours',
    @freq_type = 4,            -- Daily
    @freq_interval = 1,
    @freq_subday_type = 4,     -- Minutes
    @freq_subday_interval = 15,
    @active_start_time = 080000,   -- 8 AM
    @active_end_time = 180000;     -- 6 PM

EXEC msdb.dbo.sp_attach_schedule
    @job_name = N'Refresh Sales Summary',
    @schedule_name = N'Every 15 Min Business Hours';

EXEC msdb.dbo.sp_add_jobserver
    @job_name = N'Refresh Sales Summary';
```

## Setting Up Notifications

To get notified when jobs fail, set up Database Mail and operators.

### Configure Database Mail

```sql
-- Enable Database Mail
EXEC sp_configure 'show advanced options', 1;
RECONFIGURE;
EXEC sp_configure 'Database Mail XPs', 1;
RECONFIGURE;

-- Create a mail profile
EXEC msdb.dbo.sysmail_add_profile_sp
    @profile_name = N'SQLAlerts',
    @description = N'Profile for SQL Agent notifications';

-- Create a mail account (using your SMTP server details)
EXEC msdb.dbo.sysmail_add_account_sp
    @account_name = N'AlertAccount',
    @email_address = N'sqlagent@company.com',
    @mailserver_name = N'smtp.company.com',
    @port = 587,
    @enable_ssl = 1,
    @username = N'smtp_user',
    @password = N'smtp_password';

-- Add the account to the profile
EXEC msdb.dbo.sysmail_add_profileaccount_sp
    @profile_name = N'SQLAlerts',
    @account_name = N'AlertAccount',
    @sequence_number = 1;
```

### Create an Operator

```sql
-- Create an operator who receives notifications
EXEC msdb.dbo.sp_add_operator
    @name = N'DBA Team',
    @enabled = 1,
    @email_address = N'dba-team@company.com';
```

### Add Notifications to a Job

```sql
-- Add email notification on job failure
EXEC msdb.dbo.sp_update_job
    @job_name = N'Nightly Statistics Update',
    @notify_level_email = 2,  -- Notify on failure
    @notify_email_operator_name = N'DBA Team';
```

## Monitoring Job Execution

### View Job History

```sql
-- View recent job execution history
SELECT
    j.name AS JobName,
    h.step_name AS StepName,
    h.run_date,
    h.run_time,
    h.run_duration,
    CASE h.run_status
        WHEN 0 THEN 'Failed'
        WHEN 1 THEN 'Succeeded'
        WHEN 2 THEN 'Retry'
        WHEN 3 THEN 'Canceled'
    END AS Status,
    h.message
FROM msdb.dbo.sysjobhistory h
JOIN msdb.dbo.sysjobs j ON h.job_id = j.job_id
ORDER BY h.run_date DESC, h.run_time DESC;
```

### View Currently Running Jobs

```sql
-- Check which jobs are currently running
SELECT
    j.name AS JobName,
    ja.start_execution_date,
    DATEDIFF(MINUTE, ja.start_execution_date, GETDATE()) AS RunningMinutes
FROM msdb.dbo.sysjobactivity ja
JOIN msdb.dbo.sysjobs j ON ja.job_id = j.job_id
WHERE ja.start_execution_date IS NOT NULL
    AND ja.stop_execution_date IS NULL
    AND ja.session_id = (SELECT MAX(session_id) FROM msdb.dbo.sysjobactivity);
```

## Migrating Jobs from On-Premises

When migrating from on-premises SQL Server, you can script out your existing jobs and run the scripts on Managed Instance.

### Scripting Jobs from On-Premises

In SSMS, right-click on a job, select "Script Job as" > "CREATE To" > "New Query Window". This generates the T-SQL to recreate the job.

For bulk migration, script all jobs:

```sql
-- On the source server, generate job creation scripts
-- Use SSMS: right-click "SQL Server Agent" > "Jobs" folder
-- Select "Script Job as" > "CREATE To" > "Clipboard" for each job
```

### Important Migration Considerations

1. **Remove unsupported step types**: CmdExec and PowerShell steps will not work. Replace them with T-SQL equivalents or use Azure Automation for OS-level tasks.

2. **Update database references**: If your jobs reference databases by name, make sure those databases exist on the Managed Instance.

3. **Update linked server references**: If job steps query linked servers, those linked servers must be recreated on the Managed Instance.

4. **Recreate operators**: Operators and notification settings are not part of the database backup. Recreate them on the Managed Instance.

5. **Reconfigure Database Mail**: SMTP settings and mail profiles need to be set up from scratch.

6. **Adjust schedules for UTC**: Managed Instance uses UTC time by default. Adjust your schedules accordingly if your on-premises server uses a different time zone.

## Best Practices

**Use descriptive job and step names.** When something fails at 3 AM, the on-call person should understand what the job does from its name.

**Set up failure notifications.** Every production job should notify someone when it fails. Do not let jobs fail silently for days.

**Log execution details.** Add print statements or insert into a logging table so you have context when investigating issues.

**Keep job steps focused.** Each step should do one logical thing. This makes it easier to identify which part failed and to rerun from a specific step.

**Test schedule configurations.** Use `sp_help_schedule` to verify your schedule settings are correct before relying on them.

**Monitor job duration trends.** A job that normally takes 5 minutes but starts taking 30 minutes is a warning sign that something in the underlying data or queries is changing.

## Summary

SQL Agent jobs in Azure SQL Managed Instance let you maintain the scheduling and automation patterns you built on-premises. Create jobs with T-SQL or SSMS, set up multi-step workflows with conditional logic, configure notifications through Database Mail, and monitor execution through system views. When migrating, replace unsupported step types (CmdExec, PowerShell) with T-SQL alternatives or Azure Automation, and remember to adjust schedules for UTC time. Regular monitoring and failure notifications ensure your automated processes keep running smoothly.
