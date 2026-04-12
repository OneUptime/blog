# Validation Summary: MySQL Error Codes Cheat Sheet

## Status
validated

## Post Type
Reference / Cheat Sheet

## Technologies Covered
- MySQL (server error codes, client error codes)
- InnoDB (locking, deadlocks, foreign keys)
- MySQL replication (binary log, relay log)
- caching_sha2_password authentication plugin
- performance_schema.error_log

## Sources Consulted
- MySQL 8.0 Server Error Message Reference: https://dev.mysql.com/doc/mysql-errors/8.0/en/server-error-reference.html
- MySQL 8.0 Client Error Message Reference: https://dev.mysql.com/doc/mysql-errors/8.0/en/client-error-reference.html
- MySQL 8.0 SELECT ... FOR UPDATE NOWAIT / SKIP LOCKED documentation: https://dev.mysql.com/doc/refman/8.0/en/innodb-locking-reads.html
- MySQL 8.0 caching_sha2_password documentation: https://dev.mysql.com/doc/refman/8.0/en/caching-sha2-pluggable-authentication.html
- MySQL 8.0 perror utility documentation: https://dev.mysql.com/doc/refman/8.0/en/perror.html

## Issues Found

### Issue 1: Error 3572 fix was incorrect
- **What was wrong:** The fix for error 3572 (ER_LOCK_NOWAIT) said "Use SELECT ... FOR UPDATE SKIP LOCKED or NOWAIT." This is incorrect because NOWAIT is what *causes* error 3572 — it tells MySQL to fail immediately if the lock cannot be acquired. Suggesting NOWAIT as a fix for a NOWAIT-triggered error is contradictory.
- **What was changed:** Updated the fix to: "Retry the transaction, use SKIP LOCKED instead of NOWAIT, or remove NOWAIT to wait for the lock."
- **Why:** These are the actual remediation strategies: retry logic in the application, using SKIP LOCKED to skip locked rows instead of failing, or removing NOWAIT to use the default lock-wait behavior.

### Issue 2: Error 3889 fix was incomplete/misleading
- **What was wrong:** The fix said "Use SSL or set caching_sha2_password_auto_generate_rsa_keys." The variable `caching_sha2_password_auto_generate_rsa_keys` defaults to ON and merely controls RSA key file generation — setting it alone does not fix the client connection issue. The client still needs to request the server's public key.
- **What was changed:** Updated the fix to: "Use SSL, pass --get-server-public-key on the client, or switch to mysql_native_password."
- **Why:** The `--get-server-public-key` client option is the standard practical fix for unencrypted connections using caching_sha2_password. Switching to mysql_native_password is a common alternative workaround.

## Review Notes
- Error numbers 2002 and 2003 are client-side error codes (CR_CONNECTION_ERROR and CR_CONN_HOST_ERROR), not server error codes. The post correctly lists them but doesn't distinguish this. This is fine for a cheat sheet format.
- The `perror` utility was deprecated in MySQL 8.0.31 in favor of looking up errors in the MySQL documentation or performance_schema. The post doesn't mention a specific version, so this is acceptable.
- The `performance_schema.error_log` table (added in MySQL 8.0.22) shows server error log entries rather than looking up individual error code meanings. The section title "Looking Up Error Codes" is slightly misleading but the information is still useful.
- All other error codes, messages, and fixes were verified as accurate.
