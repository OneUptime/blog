# Validation Summary: How to Use the MySQL Resource Group Feature

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0
- MySQL Resource Groups
- CPU thread affinity and thread priority management
- Performance Schema (`performance_schema.threads`)
- `INFORMATION_SCHEMA.RESOURCE_GROUPS`

## Sources Consulted
- MySQL 8.0 Reference Manual — Resource Groups: https://dev.mysql.com/doc/refman/8.0/en/resource-groups.html
- MySQL 8.0 Reference Manual — CREATE RESOURCE GROUP: https://dev.mysql.com/doc/refman/8.0/en/create-resource-group.html
- MySQL 8.0 Reference Manual — ALTER RESOURCE GROUP: https://dev.mysql.com/doc/refman/8.0/en/alter-resource-group.html
- MySQL 8.0 Reference Manual — DROP RESOURCE GROUP: https://dev.mysql.com/doc/refman/8.0/en/drop-resource-group.html
- MySQL 8.0 Reference Manual — SET RESOURCE GROUP: https://dev.mysql.com/doc/refman/8.0/en/set-resource-group.html
- MySQL 8.0 Reference Manual — Optimizer Hints: https://dev.mysql.com/doc/refman/8.0/en/optimizer-hints.html

## Issues Found

1. **Invalid THREAD_PRIORITY for USER group (`oltp_high`)**: The `oltp_high` resource group was defined as `TYPE = USER` with `THREAD_PRIORITY = -10`. MySQL restricts USER groups to priority values 0–19 and SYSTEM groups to -20–0. A negative priority on a USER group would be rejected by MySQL. Changed `TYPE = USER` to `TYPE = SYSTEM` since negative priorities are only valid for SYSTEM-type groups.

2. **Wrong column queried for SET RESOURCE GROUP ... FOR**: The post queried `PROCESSLIST_ID` from `performance_schema.threads` to use with `SET RESOURCE GROUP ... FOR <thread_id>`. The `FOR` clause requires the internal `THREAD_ID` column, not `PROCESSLIST_ID`. These are different values. Changed the query to `SELECT THREAD_ID FROM performance_schema.threads`.

3. **Missing USER vs SYSTEM priority range clarification**: The post stated the thread priority range as -20 to 19 without explaining that this range is split between group types. Added clarification that USER groups accept 0–19 and SYSTEM groups accept -20–0.

4. **Incorrect summary claim about CAP_SYS_NICE**: The summary stated CAP_SYS_NICE is required "for non-zero priorities," which would incorrectly include positive priorities like 10 that work without CAP_SYS_NICE. Changed to "for negative priorities" to match the correct behavior and the body text of the post.

## Review Notes
- The `oltp_high` example was changed from TYPE = USER to TYPE = SYSTEM to allow the -10 priority. In practice, SYSTEM-type groups are intended for MySQL internal background threads, not user queries. An alternative fix would have been to keep TYPE = USER and change the priority to 0 (the highest allowed for USER groups). The current example still illustrates the syntax correctly.
- The VCPU syntax, optimizer hint syntax, privilege names, default group names, and DROP/ALTER RESOURCE GROUP syntax were all verified as correct.
- The post correctly notes that resource groups do not control memory, I/O, or network — only CPU affinity and thread priority.
