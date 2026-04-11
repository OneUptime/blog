# How to Use the MySQL Resource Group Feature

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Resource Group, Performance, CPU, Administration

Description: Learn how to use MySQL resource groups to control CPU thread affinity and thread priority for specific connections and queries.

---

MySQL 8.0 introduced resource groups, a feature that lets administrators control CPU resource allocation by assigning threads to named groups with specific CPU affinity and thread priority settings. This is useful for isolating workloads on multi-core servers and preventing batch jobs from starving interactive queries.

## What Resource Groups Control

Resource groups currently control:
- **CPU affinity** - Which CPU cores a thread can run on
- **Thread priority** - The OS-level scheduling priority for threads in the group

They do not control memory, I/O bandwidth, or network access.

## Viewing Existing Resource Groups

MySQL 8.0 comes with two predefined groups:

```sql
SELECT * FROM information_schema.RESOURCE_GROUPS;
```

Default groups:
- `USR_default` - For user threads (type `USER`, all CPUs, priority 0)
- `SYS_default` - For system threads (type `SYSTEM`, all CPUs, priority 0)

## Creating a Resource Group

Create a resource group for background batch jobs, limiting them to 2 CPUs:

```sql
CREATE RESOURCE GROUP batch_work
  TYPE = USER
  VCPU = 0, 1
  THREAD_PRIORITY = 10
  ENABLE;
```

`VCPU` accepts individual core numbers or ranges:

```sql
CREATE RESOURCE GROUP oltp_high
  TYPE = SYSTEM
  VCPU = 2-7
  THREAD_PRIORITY = -10
  ENABLE;
```

Thread priority ranges from -20 (highest) to 19 (lowest). USER groups accept values 0 to 19, and SYSTEM groups accept -20 to 0. Negative values require the `CAP_SYS_NICE` capability on Linux.

## Assigning a Resource Group to the Current Session

```sql
SET RESOURCE GROUP batch_work;
```

All queries in this session now run with the CPU affinity and priority defined by `batch_work`.

## Assigning a Resource Group to a Specific Thread

Look up a thread ID in the processlist:

```sql
SELECT THREAD_ID FROM performance_schema.threads WHERE PROCESSLIST_USER = 'batch_user' LIMIT 1;
```

Assign the resource group to that thread:

```sql
SET RESOURCE GROUP batch_work FOR 54321;
```

## Using Resource Groups in Query Hints

You can assign a resource group for a single statement using an optimizer hint:

```sql
SELECT /*+ RESOURCE_GROUP(batch_work) */
  customer_id, SUM(amount)
FROM orders
GROUP BY customer_id;
```

## Modifying a Resource Group

Change the CPU affinity of an existing group:

```sql
ALTER RESOURCE GROUP batch_work VCPU = 0, 1, 2;
```

Disable a resource group (threads remain assigned but use default settings):

```sql
ALTER RESOURCE GROUP batch_work DISABLE FORCE;
```

`FORCE` causes currently assigned threads to move to the default group immediately.

## Dropping a Resource Group

```sql
DROP RESOURCE GROUP batch_work FORCE;
```

## Required Privileges

```sql
GRANT RESOURCE_GROUP_ADMIN ON *.* TO 'dba'@'localhost';
GRANT RESOURCE_GROUP_USER ON *.* TO 'app_user'@'%';
```

`RESOURCE_GROUP_ADMIN` allows creating, altering, and dropping groups. `RESOURCE_GROUP_USER` allows assigning the current thread to an existing group.

## Summary

MySQL resource groups provide CPU-level workload isolation by binding threads to specific cores and adjusting OS scheduling priority. Use them to prevent batch jobs from consuming CPU capacity needed by interactive queries: create a low-priority group for batch work, a high-priority group for OLTP, and assign sessions at connection time or per-query using optimizer hints. The feature requires MySQL 8.0 on Linux with CAP_SYS_NICE for negative priorities.
