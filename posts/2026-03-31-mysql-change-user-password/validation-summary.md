# Validation Summary: How to Change a User Password in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0
- SQL (ALTER USER, SET PASSWORD statements)
- mysqladmin CLI
- MySQL authentication plugins (caching_sha2_password, mysql_native_password)

## Sources Consulted
- MySQL 8.0 Reference Manual — ALTER USER Statement: https://dev.mysql.com/doc/refman/8.0/en/alter-user.html
- MySQL 8.0 Reference Manual — SET PASSWORD Statement: https://dev.mysql.com/doc/refman/8.0/en/set-password.html
- MySQL 8.0 Reference Manual — mysqladmin: https://dev.mysql.com/doc/refman/8.0/en/mysqladmin.html
- MySQL 8.0 Reference Manual — Grant Tables (mysql.user columns): https://dev.mysql.com/doc/refman/8.0/en/grant-tables.html
- MySQL 8.0 Reference Manual — Expired Password Handling: https://dev.mysql.com/doc/refman/8.0/en/expired-password-handling.html
- MySQL 8.0 Reference Manual — Native Pluggable Authentication: https://dev.mysql.com/doc/refman/8.0/en/native-pluggable-authentication.html

## Issues Found

1. **SET PASSWORD incorrectly described as deprecated**: The post stated "SET PASSWORD still works in MySQL 8.0 but is deprecated in some contexts." SET PASSWORD is NOT deprecated in MySQL 8.0. The old `SET PASSWORD = PASSWORD('...')` syntax (using the PASSWORD() function) was removed in 8.0, but the statement itself is fully supported. Changed to: "SET PASSWORD still works in MySQL 8.0, though ALTER USER is the preferred method."

2. **mysqladmin password security concern omitted**: The post described `mysqladmin password` as "convenient for scripted password rotations." The MySQL docs explicitly warn that this method should be considered insecure because the new password may be visible in the process list via `ps`. Changed to include a security warning and a recommendation to prefer ALTER USER.

3. **Incorrect privilege scope for ALTER USER**: The post stated ALTER USER requires "UPDATE on `mysql.user`." The actual requirement per the MySQL 8.0 docs is UPDATE on the `mysql` system schema (the entire database), not specifically the `mysql.user` table. Corrected to "UPDATE on the `mysql` system schema."

## Review Notes
- `mysql_native_password` is deprecated as of MySQL 8.0.34 and removed in MySQL 9.0. The post appropriately frames its use as a legacy scenario, but a future update could add an explicit deprecation note.
- The section "Unlocking a Password-Expired Account" uses the term "unlocked" colloquially. In MySQL, password expiration (PASSWORD EXPIRE) and account locking (ACCOUNT LOCK) are distinct mechanisms. The account is not technically "locked" when the password is expired — the user can still connect but is restricted to changing their password. This is a minor terminology issue that doesn't affect the code examples.
- The PASSWORD EXPIRE NEVER clause shown removes the password expiration entirely, overriding the global `default_password_lifetime` setting. This is correctly demonstrated but readers should be aware it bypasses any organizational password rotation policy.
