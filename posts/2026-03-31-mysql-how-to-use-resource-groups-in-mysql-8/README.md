# How to Use Resource Groups in MySQL 8

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Resource Group, Performance, Database Administration

Description: Learn how to create and manage Resource Groups in MySQL 8 to control CPU thread priorities and improve workload isolation.

---

## What Are Resource Groups in MySQL 8

Resource Groups in MySQL 8 allow administrators to assign threads to named groups with defined CPU affinity and thread priorities. This gives you control over how database workloads compete for system resources, enabling better isolation between OLTP and reporting queries.

MySQL 8 ships with two default resource groups:
- `USR_default` - for user threads
- `SYS_default` - for system threads

## Creating a Resource Group

Use `CREATE RESOURCE GROUP` to define a new group with a specific priority and CPU affinity.

```sql
CREATE RESOURCE GROUP high_priority_group
  TYPE = USER
  VCPU = 0-3
  THREAD_PRIORITY = 0
  ENABLE;
```

- `TYPE = USER` means the group is for user connection threads.
- `VCPU = 0-3` assigns CPU cores 0 through 3 to this group.
- `THREAD_PRIORITY = 0` gives the highest scheduling priority for a USER group (USER range is 0 to 19, SYSTEM range is -20 to 0).

## Creating a Low-Priority Reporting Group

```sql
CREATE RESOURCE GROUP reporting_group
  TYPE = USER
  VCPU = 4-7
  THREAD_PRIORITY = 10
  ENABLE;
```

This group pins reporting workloads to cores 4-7 with lower scheduling priority, keeping them from starving OLTP queries.

## Assigning a Thread to a Resource Group

You can assign the current session's thread to a resource group:

```sql
SET RESOURCE GROUP high_priority_group;
```

Or assign a specific thread by its ID from `performance_schema.threads`:

```sql
SELECT THREAD_ID, NAME, TYPE FROM performance_schema.threads
WHERE NAME LIKE 'thread/sql/one_connection'
LIMIT 5;
```

```sql
SET RESOURCE GROUP reporting_group FOR 42;
```

## Assigning a Resource Group in a Hint

MySQL 8 supports resource group hints at the statement level:

```sql
SELECT /*+ RESOURCE_GROUP(reporting_group) */
  order_date,
  SUM(total_amount) AS revenue
FROM orders
GROUP BY order_date;
```

This is useful for ad-hoc reporting queries without permanently changing the session's group.

## Viewing Existing Resource Groups

```sql
SELECT * FROM information_schema.RESOURCE_GROUPS;
```

Example output:

```text
+----------------------+---------------------+------------------------+----------+-----------------+
| RESOURCE_GROUP_NAME  | RESOURCE_GROUP_TYPE  | RESOURCE_GROUP_ENABLED | VCPU_IDS | THREAD_PRIORITY |
+----------------------+---------------------+------------------------+----------+-----------------+
| USR_default          | USER                |                      1 | 0-7      |               0 |
| SYS_default          | SYSTEM              |                      1 | 0-7      |               0 |
| high_priority_group  | USER                |                      1 | 0-3      |               0 |
| reporting_group      | USER                |                      1 | 4-7      |              10 |
+----------------------+---------------------+------------------------+----------+-----------------+
```

## Modifying a Resource Group

You can alter an existing resource group to update its CPU affinity or priority:

```sql
ALTER RESOURCE GROUP reporting_group
  VCPU = 6-7
  THREAD_PRIORITY = 15;
```

## Disabling a Resource Group

```sql
ALTER RESOURCE GROUP reporting_group DISABLE FORCE;
```

The `FORCE` option moves existing threads assigned to the group to the default group.

## Dropping a Resource Group

```sql
DROP RESOURCE GROUP reporting_group FORCE;
```

## Required Privileges

Managing resource groups requires the `RESOURCE_GROUP_ADMIN` privilege:

```sql
GRANT RESOURCE_GROUP_ADMIN ON *.* TO 'dba_user'@'localhost';
```

Assigning threads requires `RESOURCE_GROUP_USER`:

```sql
GRANT RESOURCE_GROUP_USER ON *.* TO 'app_user'@'localhost';
```

## Practical Use Case - Isolating ETL Jobs

When running nightly ETL loads, assign the ETL session to a low-priority group so production traffic is unaffected:

```sql
-- At the start of the ETL stored procedure
SET RESOURCE GROUP reporting_group;

-- Run heavy data transformation
INSERT INTO summary_table
SELECT date, product_id, SUM(qty)
FROM raw_events
GROUP BY date, product_id;
```

## Summary

MySQL 8 Resource Groups provide fine-grained CPU and thread priority control without requiring OS-level tuning. By separating OLTP threads from analytics or ETL workloads, you can achieve better performance isolation and prevent noisy-neighbor problems. Always test priority settings under realistic load to find the configuration that fits your workload mix.
