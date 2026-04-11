# Validation Summary: How to Rotate MySQL Passwords Automatically

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL (5.7+ / 8.0) — `ALTER USER`, `mysql.user` system table
- Bash shell scripting with `openssl rand` for password generation
- Cron scheduling
- HashiCorp Vault — Database secrets engine, static roles
- AWS Secrets Manager — managed rotation for RDS MySQL
- AWS CLI (`aws secretsmanager`)

## Sources Consulted
- AWS CLI v2 `rotate-secret` help output — verified `--rotation-rules` shorthand syntax (`AutomaticallyAfterDays=long`) is valid, and `--rotation-lambda-arn` can be omitted for managed rotation
- MySQL 8.0 documentation — `ALTER USER ... IDENTIFIED BY` syntax, `mysql.user` table schema (`password_last_changed` column)
- HashiCorp Vault documentation — Database secrets engine static roles API paths (`database/static-roles/`, `database/rotate-role/`, `database/static-creds/`), parameter names (`db_name`, `username`, `rotation_period`, `rotation_statements`), and template variables (`{{name}}`, `{{password}}`)
- Cron syntax reference — verified `0 2 * * 0` (2 AM every Sunday)

## Issues Found
No technical issues found.

## Review Notes
- The `CURRENT_PASS` variable in the shell script (Option 1) is assigned but never used. This is dead code rather than a technical error — it may have been intended for verification or rollback logic. A future improvement could either remove it or add a verification step that tests the new password before overwriting the file.
- The AWS Secrets Manager section describes the managed Lambda rotation function as handling the "dual-user rotation pattern." This is accurate for the multi-user rotation template (`SecretsManagerRDSMySQLRotationMultiUser`), but readers should be aware that the default/single-user rotation strategy rotates the password for the same user without an alternating pattern. The post could benefit from clarifying which rotation strategy is being referenced.
- The `FLUSH PRIVILEGES` statement is correctly omitted after `ALTER USER` — MySQL applies credential changes immediately without requiring it.
- All SQL syntax is valid for MySQL 5.7+. The `password_last_changed` column in `mysql.user` was introduced in MySQL 5.7 and is present in 8.0+.
