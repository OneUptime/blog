# Validation Summary: How to Use CREATE SERVER Statement in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (CREATE SERVER, ALTER SERVER, DROP SERVER statements)
- FEDERATED storage engine
- MySQL privilege system (SUPER privilege)
- mysql.servers system table

## Sources Consulted
- MySQL 8.0 Reference Manual — CREATE SERVER: https://dev.mysql.com/doc/refman/8.0/en/create-server.html
- MySQL 8.0 Reference Manual — ALTER SERVER: https://dev.mysql.com/doc/refman/8.0/en/alter-server.html
- MySQL 8.0 Reference Manual — DROP SERVER: https://dev.mysql.com/doc/refman/8.0/en/drop-server.html
- MySQL 8.0 Reference Manual — FEDERATED Storage Engine: https://dev.mysql.com/doc/refman/8.0/en/federated-storage-engine.html
- MySQL 8.0 Reference Manual — Privileges: https://dev.mysql.com/doc/refman/8.0/en/privileges-provided.html

## Issues Found

1. **ALTER SERVER syntax had incorrect `SET` keyword**: The blog used `OPTIONS (SET PASSWORD 'new_password')` but the correct syntax is `OPTIONS (PASSWORD 'new_password')` — there is no `SET` keyword in ALTER SERVER OPTIONS. Fixed by removing `SET`.

2. **Incorrect privilege claim for MySQL 8.0**: The post stated that `SYSTEM_VARIABLES_ADMIN` is the MySQL 8.0 replacement for `SUPER` regarding CREATE SERVER. This is wrong — `SYSTEM_VARIABLES_ADMIN` applies to setting system variables, not to server definition management. No specific dynamic privilege replacement for CREATE/ALTER/DROP SERVER has been introduced yet; `SUPER` is still required. Fixed by removing the incorrect parenthetical about `SYSTEM_VARIABLES_ADMIN`.

3. **Incorrect behavior claim for DROP SERVER**: The post stated that dropping a server causes existing FEDERATED tables to "fail to connect." Per the official documentation, dropping a server does NOT affect FEDERATED tables that already used that connection information — they retain the connection details captured at creation time and continue to function. Fixed to match documented behavior.

## Review Notes
- The `OWNER` option is a valid CREATE SERVER option but is documented as having no effect. The post's omission of it is reasonable for a practical guide.
- The `SUPER` privilege is deprecated in MySQL 8.0, but no granular dynamic privilege has been introduced to replace it for CREATE/ALTER/DROP SERVER operations. This is a known gap in the SUPER deprecation migration path.
- The FEDERATED storage engine is not enabled by default in MySQL and must be activated with `--federated` option at server startup. The post could mention this but it's not strictly an error.
- SHOW CREATE SERVER exists but has limited documentation in MySQL 8.0. The post's usage appears correct.
