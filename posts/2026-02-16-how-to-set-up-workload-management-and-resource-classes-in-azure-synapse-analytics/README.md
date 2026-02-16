# How to Set Up Workload Management and Resource Classes in Azure Synapse Analytics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Synapse Analytics, Workload Management, Resource Classes, Dedicated SQL Pool, Performance, Query Prioritization

Description: Learn how to configure workload management and resource classes in Azure Synapse dedicated SQL pool to prioritize queries and allocate resources effectively.

---

In a shared data warehouse environment, different workloads compete for the same compute resources. An executive's dashboard query should not wait behind a massive ETL load. A data scientist's exploratory query should not consume all the memory and starve reporting queries. Workload management in Azure Synapse dedicated SQL pool lets you control how resources are allocated across different types of workloads.

## Understanding Resource Classes

Resource classes are the original mechanism for controlling resource allocation in Synapse dedicated SQL pools. They determine how much memory a query gets and how many queries can run concurrently.

There are two types of resource classes:

### Static Resource Classes

Static resource classes allocate a fixed amount of memory regardless of the DWU level.

| Resource Class | Memory Allocation |
|---------------|-------------------|
| staticrc10 | 250 MB |
| staticrc20 | 500 MB |
| staticrc30 | 750 MB |
| staticrc40 | 1 GB |
| staticrc50 | 1.25 GB |
| staticrc60 | 1.5 GB |
| staticrc70 | 1.75 GB |
| staticrc80 | 2 GB |

### Dynamic Resource Classes

Dynamic resource classes allocate memory as a percentage of total available memory. The actual allocation grows as you increase DWU.

| Resource Class | % of Memory | Memory at DW500c | Memory at DW1000c |
|---------------|-------------|-------------------|-------------------|
| smallrc | ~3% | 250 MB | 250 MB |
| mediumrc | ~10% | 800 MB | 800 MB |
| largerc | ~22% | 1.6 GB | 3.2 GB |
| xlargerc | ~70% | 5.2 GB | 10.4 GB |

The tradeoff between memory and concurrency is inverse. A query using xlargerc gets more memory but consumes more concurrency slots, meaning fewer other queries can run simultaneously.

### Assigning Resource Classes

```sql
-- Assign a user to a resource class
-- This user's queries will get more memory (and consume more concurrency slots)
EXEC sp_addrolemember 'largerc', 'etl_loader';

-- Check which resource class a user belongs to
SELECT
    r.name AS resource_class,
    m.name AS member_name
FROM sys.database_role_members rm
JOIN sys.database_principals r ON rm.role_principal_id = r.principal_id
JOIN sys.database_principals m ON rm.member_principal_id = m.principal_id
WHERE r.name LIKE '%rc%'
ORDER BY r.name, m.name;

-- Remove a user from a resource class
EXEC sp_droprolemember 'largerc', 'etl_loader';
```

## Workload Management (Modern Approach)

While resource classes still work, workload management provides more granular control through three components:

1. **Workload classifiers**: Route queries to workload groups based on rules
2. **Workload groups**: Define resource limits and importance levels
3. **Workload isolation**: Guarantee minimum resources for critical workloads

### Step 1: Create Workload Groups

Workload groups define resource boundaries for categories of queries.

```sql
-- Create a workload group for ETL/loading operations
-- Guarantees 50% of resources, can burst to 100%
CREATE WORKLOAD GROUP wg_ETL
WITH (
    MIN_PERCENTAGE_RESOURCE = 50,        -- Guaranteed minimum resources
    CAP_PERCENTAGE_RESOURCE = 100,       -- Maximum resources allowed
    REQUEST_MIN_RESOURCE_GRANT_PERCENT = 25,  -- Minimum memory per query
    REQUEST_MAX_RESOURCE_GRANT_PERCENT = 50   -- Maximum memory per query
);

-- Create a workload group for dashboard/reporting queries
-- Guarantees 25% of resources with lower per-query allocation
CREATE WORKLOAD GROUP wg_Reporting
WITH (
    MIN_PERCENTAGE_RESOURCE = 25,
    CAP_PERCENTAGE_RESOURCE = 75,
    REQUEST_MIN_RESOURCE_GRANT_PERCENT = 3,
    REQUEST_MAX_RESOURCE_GRANT_PERCENT = 10
);

-- Create a workload group for ad-hoc/exploratory queries
-- No guaranteed resources, limited per-query allocation
CREATE WORKLOAD GROUP wg_AdHoc
WITH (
    MIN_PERCENTAGE_RESOURCE = 0,
    CAP_PERCENTAGE_RESOURCE = 50,
    REQUEST_MIN_RESOURCE_GRANT_PERCENT = 3,
    REQUEST_MAX_RESOURCE_GRANT_PERCENT = 10
);
```

Key parameters explained:

- **MIN_PERCENTAGE_RESOURCE**: Guaranteed minimum percentage of resources for this group. The sum across all groups cannot exceed 100%.
- **CAP_PERCENTAGE_RESOURCE**: Maximum percentage of resources this group can use. Allows bursting when other groups are idle.
- **REQUEST_MIN_RESOURCE_GRANT_PERCENT**: Minimum memory percentage per query. Determines concurrency - lower values mean more concurrent queries.
- **REQUEST_MAX_RESOURCE_GRANT_PERCENT**: Maximum memory percentage per query. For large queries that need more memory.

### Step 2: Create Workload Classifiers

Classifiers route queries to workload groups based on criteria like username, role, or label.

```sql
-- Route ETL user queries to the ETL workload group
CREATE WORKLOAD CLASSIFIER cls_ETL
WITH (
    WORKLOAD_GROUP = 'wg_ETL',
    MEMBERNAME = 'etl_service_account',
    IMPORTANCE = HIGH
);

-- Route reporting users to the Reporting workload group
CREATE WORKLOAD CLASSIFIER cls_Reporting
WITH (
    WORKLOAD_GROUP = 'wg_Reporting',
    MEMBERNAME = 'reporting_service',
    IMPORTANCE = ABOVE_NORMAL
);

-- Route data scientists to the AdHoc workload group
CREATE WORKLOAD CLASSIFIER cls_DataScience
WITH (
    WORKLOAD_GROUP = 'wg_AdHoc',
    MEMBERNAME = 'data_science_team',
    IMPORTANCE = NORMAL
);

-- You can also classify by query label
-- This is useful when the same user runs different types of queries
CREATE WORKLOAD CLASSIFIER cls_DashboardQueries
WITH (
    WORKLOAD_GROUP = 'wg_Reporting',
    LABEL = 'dashboard',
    IMPORTANCE = ABOVE_NORMAL
);
```

To use label-based classification, add the OPTION (LABEL) hint to your queries:

```sql
-- This query will be classified into wg_Reporting because of the label
SELECT CustomerName, SUM(Revenue) AS TotalRevenue
FROM dbo.SalesSummary
GROUP BY CustomerName
OPTION (LABEL = 'dashboard');
```

### Step 3: Set Importance Levels

Importance determines which queued queries get resources first when there is contention.

```sql
-- Five importance levels, from lowest to highest:
-- LOW, BELOW_NORMAL, NORMAL, ABOVE_NORMAL, HIGH

-- Create classifiers with different importance levels
CREATE WORKLOAD CLASSIFIER cls_CriticalDashboard
WITH (
    WORKLOAD_GROUP = 'wg_Reporting',
    MEMBERNAME = 'ceo_dashboard_user',
    IMPORTANCE = HIGH                    -- Gets resources before other queries
);

CREATE WORKLOAD CLASSIFIER cls_NightlyETL
WITH (
    WORKLOAD_GROUP = 'wg_ETL',
    MEMBERNAME = 'nightly_etl_user',
    IMPORTANCE = BELOW_NORMAL            -- Can wait for higher-priority queries
);
```

When the system is under load, higher-importance queries are dequeued before lower-importance ones, regardless of arrival order.

## Monitoring Workload Management

### View Active Queries and Their Workload Groups

```sql
-- See running and queued queries with their workload classification
SELECT
    r.request_id,
    r.status,
    r.submit_time,
    r.start_time,
    r.total_elapsed_time,
    r.resource_class,
    r.importance,
    r.group_name AS workload_group,
    r.classifier_name,
    r.command
FROM sys.dm_pdw_exec_requests r
WHERE r.status IN ('Running', 'Suspended')
ORDER BY r.importance DESC, r.submit_time ASC;
```

### Check Resource Utilization by Workload Group

```sql
-- View resource utilization per workload group
SELECT
    group_name,
    total_request_count,
    active_request_count,
    queued_request_count,
    total_resource_consumption_percent,
    effective_min_percentage_resource,
    effective_cap_percentage_resource
FROM sys.dm_workload_management_workload_groups_stats;
```

### View Classifier Effectiveness

```sql
-- Check which classifier is matching which queries
SELECT
    classifier_name,
    group_name,
    importance,
    total_classify_count,
    start_time,
    end_time
FROM sys.dm_pdw_exec_classifier_info
ORDER BY start_time DESC;
```

## Practical Example: Multi-Tenant Workload

Here is a complete setup for a data warehouse serving three workload types:

```sql
-- Step 1: Create workload groups with resource guarantees
-- Total MIN_PERCENTAGE_RESOURCE must not exceed 100

-- ETL gets guaranteed 40% of resources
CREATE WORKLOAD GROUP wg_ETL
WITH (
    MIN_PERCENTAGE_RESOURCE = 40,
    CAP_PERCENTAGE_RESOURCE = 100,
    REQUEST_MIN_RESOURCE_GRANT_PERCENT = 10,
    REQUEST_MAX_RESOURCE_GRANT_PERCENT = 50
);

-- Dashboards get guaranteed 40% of resources
CREATE WORKLOAD GROUP wg_Dashboard
WITH (
    MIN_PERCENTAGE_RESOURCE = 40,
    CAP_PERCENTAGE_RESOURCE = 80,
    REQUEST_MIN_RESOURCE_GRANT_PERCENT = 3,
    REQUEST_MAX_RESOURCE_GRANT_PERCENT = 10
);

-- Ad-hoc queries get remaining 20%
CREATE WORKLOAD GROUP wg_Exploration
WITH (
    MIN_PERCENTAGE_RESOURCE = 20,
    CAP_PERCENTAGE_RESOURCE = 60,
    REQUEST_MIN_RESOURCE_GRANT_PERCENT = 3,
    REQUEST_MAX_RESOURCE_GRANT_PERCENT = 10
);

-- Step 2: Create classifiers to route queries
CREATE WORKLOAD CLASSIFIER cls_ETLUser
WITH (WORKLOAD_GROUP = 'wg_ETL', MEMBERNAME = 'etl_user', IMPORTANCE = HIGH);

CREATE WORKLOAD CLASSIFIER cls_PowerBI
WITH (WORKLOAD_GROUP = 'wg_Dashboard', MEMBERNAME = 'powerbi_service', IMPORTANCE = ABOVE_NORMAL);

CREATE WORKLOAD CLASSIFIER cls_Analysts
WITH (WORKLOAD_GROUP = 'wg_Exploration', MEMBERNAME = 'analyst_group', IMPORTANCE = NORMAL);
```

## Modifying and Dropping Workload Objects

```sql
-- Modify a workload group
ALTER WORKLOAD GROUP wg_ETL
WITH (
    MIN_PERCENTAGE_RESOURCE = 30,        -- Reduced from 40 to 30
    CAP_PERCENTAGE_RESOURCE = 80
);

-- Drop a classifier (must drop classifier before dropping its workload group)
DROP WORKLOAD CLASSIFIER cls_ETLUser;

-- Drop a workload group
DROP WORKLOAD GROUP wg_ETL;
```

## Best Practices

1. **Start with resource classes, migrate to workload management**: If your needs are simple, resource classes might be enough. Switch to workload management when you need isolation, importance, or label-based routing.

2. **Do not over-allocate MIN_PERCENTAGE_RESOURCE**: The sum of all groups' minimums cannot exceed 100%. Leave some unallocated for flexibility.

3. **Use importance sparingly**: If everything is HIGH importance, nothing is. Reserve HIGH for genuinely critical workloads.

4. **Monitor before configuring**: Observe your actual workload patterns before creating groups. Check `sys.dm_pdw_exec_requests` to understand who runs what and when.

5. **Test with realistic load**: Workload management only matters under contention. Test with concurrent workloads to verify your configuration works as expected.

## Wrapping Up

Workload management in Azure Synapse dedicated SQL pool gives you fine-grained control over how compute resources are shared across different workload types. Resource classes provide a simple memory-per-query mechanism. Workload groups and classifiers add isolation guarantees, importance-based scheduling, and label-based routing. The goal is to ensure that critical workloads always get the resources they need, even when the system is under heavy load from multiple concurrent users.
