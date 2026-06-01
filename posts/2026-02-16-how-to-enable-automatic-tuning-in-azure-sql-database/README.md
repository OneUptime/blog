# How to Enable Automatic Tuning in Azure SQL Database

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure SQL, Automatic Tuning, Performance, Optimization, Azure, Database, Indexing

Description: Learn how to enable and configure automatic tuning in Azure SQL Database to let Azure automatically create indexes, drop unused indexes, and fix plan regressions.

---

Manually tuning a database is time-consuming work. You need to monitor query performance, analyze execution plans, identify missing indexes, test changes, and verify improvements. Azure SQL Database offers automatic tuning that handles much of this work for you. It can automatically create indexes, drop unused indexes, and revert query plan regressions, all without human intervention.

In this post, I will explain how automatic tuning works, how to enable and configure it, and how to monitor what it is doing.

## What Automatic Tuning Does

Azure SQL Database automatic tuning provides three capabilities:

### 1. Create Index

The system analyzes query patterns and identifies columns that would benefit from additional indexes. When it finds a candidate, it creates the index and monitors query performance. If the index improves performance, it keeps it. If the index does not help or causes regressions, it automatically drops it.

### 2. Drop Index

Over time, indexes that were once useful become dead weight. They consume storage, slow down write operations, and never get used by any query. Automatic tuning identifies unused and duplicate indexes, drops eligible indexes, and can revert the change if needed.

### 3. Force Last Good Plan

Sometimes the SQL query optimizer chooses a poor execution plan for a query, even though a better plan was used previously. This is called a plan regression. Automatic tuning detects these regressions and forces the last known good plan, restoring performance without any code changes.

```mermaid
flowchart TD
    A[Automatic Tuning] --> B[Create Index]
    A --> C[Drop Index]
    A --> D[Force Last Good Plan]
    B --> E[Analyze query patterns]
    E --> F[Create candidate index]
    F --> G{Performance improved?}
    G -->|Yes| H[Keep index]
    G -->|No| I[Revert - drop index]
    C --> J[Identify unused indexes]
    J --> K[Drop eligible indexes]
    D --> L[Detect plan regression]
    L --> M[Force previous good plan]
```

## How It Works Under the Hood

Automatic tuning relies on the Query Store to collect performance data. Query Store captures query text, execution statistics, and execution plans according to its capture policy. Automatic tuning analyzes this data to identify opportunities.

The system uses a safe experimentation approach:

1. **Identify a recommendation**: Based on Query Store data, the system proposes a change (create index, drop index, or force plan).
2. **Apply the change**: The change is applied to the database.
3. **Monitor the impact**: The system measures query performance before and after the change.
4. **Verify or revert**: If performance improves, the change is kept. If performance degrades, the change is automatically reverted.

This conservative approach is designed to make automatic tuning safe for production workloads. If there is no significant improvement, or if performance regresses, Azure SQL Database reverts the change.

## Enabling Automatic Tuning via Azure Portal

### Step 1: Navigate to Your Database or Server

You can configure automatic tuning at the server level (applies to all databases) or at the individual database level.

For server-level configuration:
1. Go to the Azure Portal and open your SQL server.
2. Under "Intelligent Performance", click "Automatic tuning".

For database-level configuration:
1. Go to the Azure Portal and open your SQL database.
2. Under "Intelligent Performance", click "Automatic tuning".

### Step 2: Configure the Three Options

For each of the three capabilities, you have three choices:

- **Inherit from server (or Azure defaults)**: Use the parent setting.
- **On**: Explicitly enable this capability.
- **Off**: Explicitly disable this capability.

For most production databases, I recommend:
- **Create Index**: On
- **Drop Index**: On (after a period of observation)
- **Force Last Good Plan**: On

### Step 3: Save

Click "Save" to apply the configuration. Changes take effect immediately.

## Enabling Automatic Tuning via Azure CLI

```bash
# Enable all three automatic tuning options at the server level with the REST API through Azure CLI
subscriptionId=$(az account show --query id -o tsv)

az rest --method patch \
    --uri "https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/myResourceGroup/providers/Microsoft.Sql/servers/myserver/automaticTuning/current?api-version=2023-08-01" \
    --body '{
        "properties": {
            "desiredState": "Custom",
            "options": {
                "createIndex": { "desiredState": "On" },
                "dropIndex": { "desiredState": "On" },
                "forceLastGoodPlan": { "desiredState": "On" }
            }
        }
    }'
```

For database-level settings:

```bash
# Enable automatic tuning on a specific database
subscriptionId=$(az account show --query id -o tsv)

az rest --method patch \
    --uri "https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/myResourceGroup/providers/Microsoft.Sql/servers/myserver/databases/mydb/automaticTuning/current?api-version=2023-08-01" \
    --body '{
        "properties": {
            "desiredState": "Custom",
            "options": {
                "createIndex": { "desiredState": "On" },
                "dropIndex": { "desiredState": "On" },
                "forceLastGoodPlan": { "desiredState": "On" }
            }
        }
    }'
```

## Enabling Automatic Tuning via T-SQL

T-SQL provides the most straightforward syntax:

```sql
-- Enable automatic index creation
ALTER DATABASE CURRENT
SET AUTOMATIC_TUNING (CREATE_INDEX = ON);

-- Enable automatic plan correction
ALTER DATABASE CURRENT
SET AUTOMATIC_TUNING (FORCE_LAST_GOOD_PLAN = ON);

-- Enable automatic unused index dropping
ALTER DATABASE CURRENT
SET AUTOMATIC_TUNING (DROP_INDEX = ON);

-- Or enable all three at once
ALTER DATABASE CURRENT
SET AUTOMATIC_TUNING (
    CREATE_INDEX = ON,
    DROP_INDEX = ON,
    FORCE_LAST_GOOD_PLAN = ON
);
```

To check the current automatic tuning configuration:

```sql
-- View current automatic tuning settings
SELECT
    name,
    desired_state_desc,
    actual_state_desc,
    reason_desc
FROM sys.database_automatic_tuning_options;
```

## Monitoring Automatic Tuning Recommendations

The system generates recommendations even when automatic tuning is set to manual (not auto-applied). You can review these recommendations before deciding whether to apply them.

### Via Azure Portal

Go to your database, then "Intelligent Performance" > "Automatic tuning". The page shows current recommendations, their status, and the estimated impact.

Each recommendation includes:
- The type (create index, drop index, or force plan)
- The estimated improvement percentage
- The affected query or queries
- The current status (pending, applied, reverted, etc.)

### Via T-SQL

```sql
-- View current automatic tuning recommendations
SELECT
    name,
    type,
    reason,
    score,
    JSON_VALUE(state, '$.currentValue') AS current_state,
    is_revertable_action,
    is_executable_action,
    JSON_VALUE(details, '$.implementationDetails.script') AS script
FROM sys.dm_db_tuning_recommendations
ORDER BY score DESC;
```

To see the history of applied recommendations:

```sql
-- View history of automatic tuning actions
SELECT
    name,
    type,
    reason,
    score,
    JSON_VALUE(state, '$.currentValue') AS current_state,
    execute_action_start_time,
    revert_action_start_time,
    JSON_VALUE(details, '$.implementationDetails.script') AS script
FROM sys.dm_db_tuning_recommendations
WHERE execute_action_start_time IS NOT NULL
ORDER BY execute_action_start_time DESC;
```

## Manually Applying Recommendations

If you prefer to review recommendations before they are applied (a cautious approach), keep automatic tuning in a monitoring-only mode and apply recommendations manually.

```sql
-- Apply a specific recommendation using its name/ID
DECLARE @script nvarchar(max);

SELECT @script = JSON_VALUE(details, '$.implementationDetails.script')
FROM sys.dm_db_tuning_recommendations
WHERE name = N'<recommendation_name>'
  AND is_executable_action = 1;

EXEC sp_executesql @script;
```

## Real-World Impact

Let me share what I have seen in practice.

On a medium-sized production database (50 GB, roughly 200 distinct queries), enabling automatic tuning resulted in:
- 5 new indexes created over the first month
- 2 unused indexes dropped
- 3 plan regressions automatically corrected
- Overall query performance improved by roughly 25% as measured by average DTU consumption

The system does not make dramatic changes overnight. It is conservative, testing one recommendation at a time and verifying the results before moving on. The improvements accumulate over weeks.

## Considerations and Limitations

**Query Store must be operational.** Automatic tuning depends on Query Store data. If Query Store is off, read-only, or has insufficient data, automatic tuning cannot function correctly.

**Index creation uses resources.** Creating indexes on large tables consumes CPU and I/O. The system tries to avoid creating indexes during peak hours, but be aware that index creation could briefly increase resource usage.

**Drop Index is the most cautious option.** The system drops indexes that have been unused over the last 90 days and duplicate indexes. Unique indexes, including indexes that support primary key and unique constraints, are never dropped. On Premium and Business Critical service tiers, unused indexes are not dropped, but duplicate indexes can still be dropped.

**Not a replacement for database design.** Automatic tuning handles incremental optimizations. It cannot fix fundamental design problems like poor schema design, missing primary keys, or inappropriate data types.

**Elastic pools considerations.** For databases in elastic pools, automatic tuning is configured per database, not per pool. Each database needs its own configuration.

## Best Practices

**Start with Force Last Good Plan.** This is the safest option and provides immediate value. Plan regressions are common and cause sudden, noticeable performance drops.

**Enable Create Index after observing recommendations.** Turn on the recommendation system first (without auto-apply) and review the suggestions for a week or two. Once you are comfortable with the quality of recommendations, enable auto-apply.

**Be careful with Drop Index in active development.** If you are frequently changing queries and adding new features, an index that is currently unused might be needed by a feature about to be deployed. Consider enabling Drop Index only on stable production databases.

**Monitor the results.** Check the automatic tuning page regularly to see what changes have been made. This builds your understanding of the system and helps you catch any issues early.

**Combine with Query Performance Insight.** Use QPI to understand your workload and automatic tuning to optimize it. They complement each other well.

## Summary

Automatic tuning in Azure SQL Database is a practical tool that handles routine performance optimization tasks. It creates missing indexes, removes unused ones, and fixes query plan regressions - all with automatic verification and rollback if things do not improve. Enable it through the Portal or T-SQL, start with Force Last Good Plan for quick wins, and gradually enable Create Index and Drop Index as you gain confidence in the system. It is not a silver bullet, but it is a solid layer of automation that keeps your database performing well with minimal manual effort.
