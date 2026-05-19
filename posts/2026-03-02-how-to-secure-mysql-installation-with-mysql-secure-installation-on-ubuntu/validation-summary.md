# Validation Summary: How to Secure MySQL Installation with mysql_secure_installation on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- MySQL 8.0
- Ubuntu (system administration)
- `mysql_secure_installation` script
- MySQL `validate_password` component
- MySQL user/privilege management
- MySQL account locking (`FAILED_LOGIN_ATTEMPTS` / `PASSWORD_LOCK_TIME`)
- MySQL audit logging (general log)
- Linux file system permissions
- systemd (`systemctl restart mysql`)

## Sources Consulted
- MySQL 8.0 `CREATE USER` Statement — https://dev.mysql.com/doc/refman/8.0/en/create-user.html
- MySQL 8.0 `mysqldump` documentation (privileges required) — https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html
- MySQL 8.0 server options / `skip-name-resolve` — https://dev.mysql.com/doc/refman/8.0/en/server-options.html
- MySQL 8.0 `validate_password` Component Options and Variables — https://dev.mysql.com/doc/refman/8.0/en/validate-password-options-variables.html
- MySQL 8.0 Reference Manual — Securing the Initial MySQL Account / `mysql_secure_installation`
- Ubuntu MySQL package defaults (file system permissions on `/var/lib/mysql`)

## Issues Found

1. **`PASSWORD_LOCK_TIME` unit was misstated as hours.** The comment in the account-lockout SQL snippet read `-- Lock an account after 5 failed attempts for 1 hour`, but per MySQL 8 docs, `PASSWORD_LOCK_TIME N` is in **days**, not hours. Changed the comment to `for 1 day`.

2. **`chmod 750 /var/lib/mysql` weakened the default permissions.** The post's own `ls -la` example correctly showed `drwx------` (700) as the expected state, but then recommended `chmod 750`, which loosens permissions by granting read/execute to the `mysql` group. Changed to `chmod 700` to match the secure default.

3. **Backup user grant was missing `PROCESS` privilege.** Since MySQL 8.0.21, `mysqldump` requires the `PROCESS` privilege (unless run with `--no-tablespaces`). The grant listed `EVENT` instead, which is not in mysqldump's required privilege set. Swapped `EVENT` for `PROCESS` in the `GRANT` statement for the `backup` user.

## Review Notes
- `skip-name-resolve = ON` is non-idiomatic but valid — the more common form is the bare directive `skip-name-resolve` in `my.cnf`. Left as-is since it is functionally correct.
- `SET GLOBAL validate_password.policy = STRONG;` (unquoted enum) is valid in MySQL 8.0; quoted (`'STRONG'`) and numeric (`2`) forms also work.
- The post correctly notes that Ubuntu's default root authentication uses the `auth_socket` plugin, and that `mysql -u root` (without `sudo`) will be denied — accurate for stock Ubuntu MySQL 8 installs.
- The `validate_password.length` minimum value floor is 4; the recommended 12 is fine.
- `REPLICATION CLIENT` in the backup grant is only needed for dumps that include binlog coordinates (`--master-data` / `--source-data`); it is harmless but optional for plain dumps. Left in place since the author may intend point-in-time recovery support, which the binary logging section implies.
- The `general_log` based "audit" approach is a reasonable community-edition fallback but is not a true audit log; for compliance use cases, the MySQL Enterprise Audit plugin or Percona Audit Log plugin would be more appropriate. The post already calls this out.
