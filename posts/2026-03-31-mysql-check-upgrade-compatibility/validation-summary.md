# Validation Summary: How to Check MySQL Upgrade Compatibility

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL (8.0, 8.4)
- MySQL Shell (`util.checkForServerUpgrade()`)
- mysqlcheck CLI utility
- information_schema queries
- MySQL configuration validation

## Sources Consulted
- MySQL Shell 8.0 Upgrade Checker Utility documentation (https://dev.mysql.com/doc/mysql-shell/8.0/en/mysql-shell-utilities-upgrade.html)
- MySQL Shell 8.0 Command Line Integration (https://dev.mysql.com/doc/mysql-shell/8.0/en/command-line-integration-overview.html)
- MySQL 8.0 Reserved Words (https://dev.mysql.com/doc/refman/8.0/en/keywords.html)
- MySQL 8.0 Binary Logging Options — expire_logs_days (https://dev.mysql.com/doc/refman/8.0/en/replication-options-binary-log.html)
- MySQL 8.4 Native Pluggable Authentication (https://dev.mysql.com/doc/refman/8.4/en/native-pluggable-authentication.html)
- MySQL 8.0 mysqlcheck documentation (https://dev.mysql.com/doc/refman/8.0/en/mysqlcheck.html)

## Issues Found
1. **Missing "Notices" severity category**: The post stated the checker reports issues in "three severity categories" but only described Errors and Warnings, omitting Notices. Added a sentence describing Notices as informational items about manual checks that may be needed.

2. **Inaccurate comment about `expire_logs_days`**: The bash comment said "Variables removed in 8.0" but `expire_logs_days` was only deprecated in MySQL 8.0 (removed in 8.2). Changed the comment to "Variables removed or deprecated in 8.0" to be accurate.

3. **Incorrect description of `mysql_native_password` in 8.4**: The post said the plugin was "removed by default in 8.4". It was actually disabled by default in 8.4 (can be re-enabled with `--mysql-native-password=ON`); it was not fully removed until MySQL 9.0. Changed "removed" to "disabled".

## Review Notes
- The `mysqlsh` CLI invocation uses camelCase `checkForServerUpgrade` which works but the MySQL Shell docs more commonly show the kebab-case form `check-for-server-upgrade`. Both are accepted by the CLI integration.
- The `--check` flag in the `mysqlcheck` command is redundant since check is the default operation, but it does not cause any issues.
- The post's description of `mysqlcheck` as verifying "InnoDB table integrity" is a slight simplification — it works with all storage engines — but is not incorrect given InnoDB's dominance.
