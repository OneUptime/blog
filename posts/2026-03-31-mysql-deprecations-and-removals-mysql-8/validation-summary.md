# Validation Summary: How to Understand Deprecations and Removals in MySQL 8

## Status
validated

## Post Type
Guide

## Technologies Covered
- MySQL 8.0
- MySQL 5.7 (as upgrade source)
- MySQL Shell (upgrade checker utility)
- caching_sha2_password authentication plugin
- mysql_native_password authentication plugin

## Sources Consulted
- MySQL 8.0 Reference Manual: Server System Variables Added, Deprecated, or Removed — https://dev.mysql.com/doc/refman/8.0/en/added-deprecated-removed.html
- MySQL 8.0: Retiring Support for the Query Cache — https://dev.mysql.com/blog-archive/mysql-8-0-retiring-support-for-the-query-cache/
- MySQL 8.0.4: New Default Authentication Plugin: caching_sha2_password — https://dev.mysql.com/blog-archive/mysql-8-0-4-new-default-authentication-plugin-caching_sha2_password/
- Removal of Implicit and Explicit Sorting for GROUP BY — https://dev.mysql.com/blog-archive/removal-of-implicit-and-explicit-sorting-for-group-by/
- MySQL 8.0 Reference Manual: Server SQL Modes — https://dev.mysql.com/doc/refman/8.0/en/sql-mode.html
- MySQL Shell 8.0: Upgrade Checker Utility — https://dev.mysql.com/doc/mysql-shell/8.0/en/mysql-shell-utilities-upgrade.html

## Issues Found
1. **Incorrect section title "Removed: Old-Style Stored Procedure Syntax"**: The content under this section discusses the removal of implicit GROUP BY sorting in MySQL 8.0, which has nothing to do with stored procedure syntax. Renamed the section to "Removed: Implicit GROUP BY Sorting" and updated the introductory sentence to accurately describe the content.
2. **Missing `ONLY_FULL_GROUP_BY` from SQL mode defaults**: The list of default SQL modes in MySQL 8.0 omitted `ONLY_FULL_GROUP_BY`, which is one of the six modes enabled by default. This is especially relevant given the post discusses GROUP BY behavior changes. Added it to the list.

## Review Notes
- The `mysql_native_password` plugin was deprecated in MySQL 8.0.34, disabled by default in MySQL 8.4, and fully removed in MySQL 9.0 (not in 8.0 itself). The post's section "Deprecated: mysql_native_password Plugin (8.0 to 8.4)" is a reasonable simplification of this timeline.
- The upgrade checker command `mysqlsh -- util check-for-server-upgrade` supports both camelCase and kebab-case forms; the kebab-case used in the post is valid.
- The query filtering for deprecated plugins excludes `auth_socket` and `mysql_no_login`, which are valid non-deprecated plugins, so the logic is correct.
