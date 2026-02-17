# How to Use pg_cron in Cloud SQL PostgreSQL for Scheduled Database Maintenance Jobs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud SQL, PostgreSQL, pg_cron, Database Maintenance

Description: Learn how to enable and use pg_cron in Cloud SQL for PostgreSQL to automate scheduled database maintenance tasks like vacuuming, partition management, and data cleanup.

---

If you have ever managed a PostgreSQL database in production, you know that regular maintenance is not optional. Tables bloat, old data piles up, and statistics go stale. On a self-managed server, you would typically set up cron jobs on the host machine to run these tasks. But on Cloud SQL, you do not have access to the underlying VM. That is where pg_cron comes in.

pg_cron is a PostgreSQL extension that lets you schedule recurring SQL jobs directly inside the database. Cloud SQL for PostgreSQL supports it natively, which means you can automate vacuum operations, data purges, partition management, and more without leaving the database layer.

## Enabling pg_cron on Cloud SQL

Before you can use pg_cron, you need to enable it through Cloud SQL database flags. Head to your Cloud SQL instance in the Google Cloud Console, or use gcloud CLI.

The following command enables the pg_cron extension by adding it to the shared_preload_libraries flag:

```bash
# Enable pg_cron by updating the database flags on your Cloud SQL instance
gcloud sql instances patch my-instance \
  --database-flags=cloudsql.enable_pg_cron=on
```

This requires a restart of the instance. Once the restart completes, connect to your database and create the extension:

```sql
-- Create the pg_cron extension in the postgres database
-- pg_cron must be installed in the postgres database specifically
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

One important detail: pg_cron installs its metadata tables in the `postgres` database by default. All job scheduling is managed from there, even if the jobs themselves target other databases.

## Scheduling Your First Job

Let us start with something simple - running VACUUM ANALYZE on a table every night. This keeps table statistics fresh and reclaims dead tuple space.

```sql
-- Schedule a nightly vacuum analyze on the orders table
-- Runs at 2:00 AM UTC every day
SELECT cron.schedule(
  'nightly-vacuum-orders',          -- job name
  '0 2 * * *',                      -- cron expression: minute hour day month weekday
  'VACUUM ANALYZE public.orders'    -- SQL command to execute
);
```

The cron expression follows standard cron syntax. The five fields are minute, hour, day of month, month, and day of week. The example above runs at 2:00 AM UTC daily.

You can verify the job was created by querying the jobs table:

```sql
-- List all scheduled cron jobs
SELECT jobid, schedule, command, nodename, nodeport, database, username
FROM cron.job;
```

## Running Jobs Against Other Databases

By default, pg_cron runs jobs against the `postgres` database. If your application data lives in a different database, you need to use `cron.schedule_in_database` instead.

```sql
-- Schedule a job that runs in the 'myapp' database instead of 'postgres'
SELECT cron.schedule_in_database(
  'cleanup-expired-sessions',       -- job name
  '*/30 * * * *',                   -- every 30 minutes
  'DELETE FROM sessions WHERE expires_at < NOW()',  -- cleanup query
  'myapp'                           -- target database name
);
```

This is a common pattern. You define all your jobs from the `postgres` database, but they execute in whichever database you specify.

## Practical Maintenance Job Examples

Here are several real-world maintenance jobs that I have found useful in production Cloud SQL instances.

### Partition Management

If you are using table partitioning, you can automate creating future partitions and dropping old ones:

```sql
-- Create next month's partition for the events table on the 1st of each month
SELECT cron.schedule_in_database(
  'create-next-month-partition',
  '0 0 1 * *',                      -- midnight on the 1st of each month
  $$
    DO $$
    DECLARE
      partition_name TEXT;
      start_date DATE;
      end_date DATE;
    BEGIN
      -- Calculate the start and end dates for next month
      start_date := DATE_TRUNC('month', NOW()) + INTERVAL '1 month';
      end_date := start_date + INTERVAL '1 month';
      partition_name := 'events_' || TO_CHAR(start_date, 'YYYY_MM');

      -- Create the partition dynamically
      EXECUTE FORMAT(
        'CREATE TABLE IF NOT EXISTS %I PARTITION OF events FOR VALUES FROM (%L) TO (%L)',
        partition_name, start_date, end_date
      );
    END $$;
  $$,
  'myapp'
);
```

### Refreshing Materialized Views

Materialized views are great for pre-computing expensive aggregations, but they need periodic refreshes:

```sql
-- Refresh the daily sales summary materialized view every hour
SELECT cron.schedule_in_database(
  'refresh-daily-sales-summary',
  '0 * * * *',                       -- top of every hour
  'REFRESH MATERIALIZED VIEW CONCURRENTLY daily_sales_summary',
  'myapp'
);
```

The `CONCURRENTLY` keyword is important here - it allows reads on the materialized view while the refresh is happening. Without it, the view would be locked during the refresh.

### Purging Old Audit Logs

Audit tables tend to grow fast. A scheduled purge keeps them manageable:

```sql
-- Delete audit log entries older than 90 days, every day at 3 AM
SELECT cron.schedule_in_database(
  'purge-old-audit-logs',
  '0 3 * * *',
  'DELETE FROM audit_log WHERE created_at < NOW() - INTERVAL ''90 days''',
  'myapp'
);
```

### Updating Statistics on High-Churn Tables

For tables with heavy write activity, the autovacuum daemon might not keep statistics fresh enough:

```sql
-- Analyze the high-traffic user_activity table every 15 minutes
SELECT cron.schedule_in_database(
  'frequent-analyze-user-activity',
  '*/15 * * * *',
  'ANALYZE public.user_activity',
  'myapp'
);
```

## Monitoring Job Execution

pg_cron logs the results of every job run. You can check recent execution history with this query:

```sql
-- Check the last 20 job execution results
SELECT
  j.jobname,
  d.runid,
  d.job_pid,
  d.status,
  d.return_message,
  d.start_time,
  d.end_time,
  d.end_time - d.start_time AS duration
FROM cron.job_run_details d
JOIN cron.job j ON j.jobid = d.jobid
ORDER BY d.start_time DESC
LIMIT 20;
```

The `status` column will show either `succeeded` or `failed`. If a job fails, the `return_message` column contains the error details.

Over time, the `cron.job_run_details` table can grow large. It is a good idea to schedule a job that cleans it up:

```sql
-- Clean up pg_cron's own execution history, keeping only the last 7 days
SELECT cron.schedule(
  'cleanup-cron-history',
  '0 4 * * *',
  'DELETE FROM cron.job_run_details WHERE end_time < NOW() - INTERVAL ''7 days'''
);
```

## Managing Jobs

To update a job's schedule, you can unschedule and reschedule it, or update the cron.job table directly:

```sql
-- Unschedule a job by name
SELECT cron.unschedule('nightly-vacuum-orders');

-- Or unschedule by job ID
SELECT cron.unschedule(1);
```

You can also temporarily disable a job without removing it:

```sql
-- Deactivate a job (it remains in the table but will not run)
UPDATE cron.job SET active = false WHERE jobname = 'nightly-vacuum-orders';

-- Reactivate it later
UPDATE cron.job SET active = true WHERE jobname = 'nightly-vacuum-orders';
```

## Things to Watch Out For

There are a few gotchas worth knowing about when using pg_cron on Cloud SQL.

First, all schedules are in UTC. There is no way to set a different timezone for the cron expressions. Plan your schedules accordingly.

Second, pg_cron uses a single background worker process. If you schedule many jobs at the same time (say, all at midnight), they will run sequentially, not in parallel. Stagger your job schedules to avoid bottlenecks.

Third, long-running jobs can overlap with the next scheduled run. pg_cron does not prevent this by default. If a job takes longer than the interval between runs, you could end up with multiple instances of the same job running simultaneously. For critical jobs, add a lock check at the beginning of your SQL.

Fourth, Cloud SQL has a maximum number of database flags and connections. Each pg_cron job uses a connection when it runs, so factor that into your connection pool planning.

## Wrapping Up

pg_cron turns Cloud SQL for PostgreSQL into a self-maintaining database. Instead of building external cron infrastructure or relying on Cloud Scheduler with Cloud Functions to poke your database, you keep the scheduling logic right where the data lives. The setup is straightforward - enable the flag, create the extension, and start scheduling. For most teams running PostgreSQL on Cloud SQL, this is one of the first extensions worth enabling.
