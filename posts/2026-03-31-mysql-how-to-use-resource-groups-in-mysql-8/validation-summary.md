# Validation Summary: How to Use Resource Groups in MySQL 8

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0
- MySQL Resource Groups
- information_schema.RESOURCE_GROUPS
- performance_schema.threads

## Sources Consulted
- MySQL 8.0 Reference Manual: Resource Groups — https://dev.mysql.com/doc/refman/8.0/en/resource-groups.html
- MySQL 8.0 Reference Manual: CREATE RESOURCE GROUP — https://dev.mysql.com/doc/refman/8.0/en/create-resource-group.html
- MySQL 8.0 Reference Manual: ALTER RESOURCE GROUP — https://dev.mysql.com/doc/refman/8.0/en/alter-resource-group.html
- MySQL 8.0 Reference Manual: DROP RESOURCE GROUP — https://dev.mysql.com/doc/refman/8.0/en/drop-resource-group.html
- MySQL 8.0 Reference Manual: SET RESOURCE GROUP — https://dev.mysql.com/doc/refman/8.0/en/set-resource-group.html
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA RESOURCE_GROUPS Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-resource-groups-table.html

## Issues Found

1. **Invalid THREAD_PRIORITY for USER resource group**: The `high_priority_group` example used `THREAD_PRIORITY = -10` with `TYPE = USER`. USER resource groups only allow priorities in the range 0 to 19. Negative priorities (-20 to 0) are exclusively for SYSTEM resource groups. Changed to `THREAD_PRIORITY = 0` (highest allowed priority for a USER group).

2. **Incorrect priority range explanation**: The post stated the range is "-20 to 19 on Unix, 0 to 19 on Windows", implying the range depends on the operating system. The range actually depends on the resource group TYPE: USER groups allow 0-19, SYSTEM groups allow -20 to 0. Updated the explanation to reflect this.

3. **Example output table formatting errors**: The `SELECT * FROM information_schema.RESOURCE_GROUPS` example output had incorrect column names (`TYPE` instead of `RESOURCE_GROUP_TYPE`, `ENABLED` instead of `RESOURCE_GROUP_ENABLED`), showed `YES` instead of the actual integer value `1` for the ENABLED column, had an extra column separator in the border lines, and showed `-10` for the high_priority_group. Fixed all column names, values, and formatting to match actual MySQL output.

## Review Notes
- The `RESOURCE_GROUP_USER` privilege description ("Assigning threads requires RESOURCE_GROUP_USER") is slightly simplified. `RESOURCE_GROUP_USER` only allows assigning the current session's own thread. Assigning other threads via `SET RESOURCE GROUP ... FOR thread_id` requires the more powerful `RESOURCE_GROUP_ADMIN` privilege. The current wording is acceptable but could be more precise.
- On Linux, the mysqld process needs the `CAP_SYS_NICE` capability for thread priority changes to take effect. Without it, resource groups still work but priority settings are silently ignored. The post does not mention this prerequisite, which could be a useful addition in the future.
- Resource Groups feature was introduced in MySQL 8.0.3. The post refers to "MySQL 8" generically, which is fine.
