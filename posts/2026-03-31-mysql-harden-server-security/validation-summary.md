# Validation Summary: How to Harden MySQL Server Security

## Status
validated

## Post Type
Guide

## Technologies Covered
- MySQL 8.0
- mysql_secure_installation
- validate_password component
- MySQL Enterprise Audit plugin
- SSL/TLS for MySQL connections
- MySQL access control and privilege system

## Sources Consulted
- MySQL 8.0 Reference Manual: Password Validation Component — https://dev.mysql.com/doc/refman/8.0/en/validate-password.html
- MySQL 8.0 Reference Manual: Password Validation Installation — https://dev.mysql.com/doc/refman/8.0/en/validate-password-installation.html
- MySQL 8.0 Reference Manual: Transitioning to the Password Validation Component — https://dev.mysql.com/doc/refman/8.0/en/validate-password-transitioning.html
- MySQL 8.0 Reference Manual: Audit Log Reference (System Variables) — https://dev.mysql.com/doc/refman/8.0/en/audit-log-reference.html
- MySQL 8.0 Reference Manual: mysql_secure_installation — https://dev.mysql.com/doc/refman/8.0/en/mysql-secure-installation.html
- MySQL 8.0 Reference Manual: Using Encrypted Connections — https://dev.mysql.com/doc/refman/8.0/en/using-encrypted-connections.html

## Issues Found

1. **validate_password plugin vs component mismatch**: The post used `INSTALL PLUGIN validate_password SONAME 'validate_password.so'` (the deprecated plugin approach) but then referenced variables with dot notation (`validate_password.policy`), which is the component syntax. In MySQL 8.0, the plugin uses underscore-separated variable names (`validate_password_policy`) while the component uses dot notation. Fixed by changing the install command to `INSTALL COMPONENT 'file://component_validate_password'`, which is the recommended approach for MySQL 8.0+.

2. **my.cnf used plugin-load-add with component-style variable names**: The `plugin-load-add=validate_password.so` directive loads the deprecated plugin, but the accompanying variable names used dot notation (component style). Fixed by removing `plugin-load-add` since the component auto-persists in the `mysql.component` table after `INSTALL COMPONENT` and loads automatically on restart.

3. **audit_log_file set with SET GLOBAL**: `audit_log_file` is a read-only system variable that can only be configured at server startup. The `SET GLOBAL audit_log_file = '/var/log/mysql/audit.log'` command would fail at runtime. Fixed by moving to a `my.cnf` configuration block.

4. **audit_log_policy set with SET GLOBAL**: `audit_log_policy` is also a read-only system variable. The `SET GLOBAL audit_log_policy = 'ALL'` command would fail at runtime. Fixed by moving to the same `my.cnf` configuration block.

## Review Notes
- The `audit_log` plugin (`audit_log.so`) is only available in MySQL Enterprise Edition. The post already has a note at the top about this, which is appropriate.
- The "Restrict Network Binding" section shows `bind-address = 127.0.0.1` alongside `skip-networking`. When `skip-networking` is enabled, `bind-address` is irrelevant since TCP/IP is completely disabled. This is technically redundant but not incorrect, and the intent is clear.
- The post includes example passwords in SQL statements (e.g., `'StrongP@ssw0rd!'`). This is standard for tutorials but readers should be reminded to use unique, randomly generated passwords in production.
