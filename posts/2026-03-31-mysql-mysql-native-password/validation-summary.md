# Validation Summary: What Is mysql_native_password in MySQL

## Status
validated

## Post Type
Reference / Explainer

## Technologies Covered
- MySQL (5.7, 8.0, 9.0)
- mysql_native_password authentication plugin
- caching_sha2_password authentication plugin
- SHA-1 challenge-response protocol

## Sources Consulted
- MySQL 8.0 Reference Manual: Native Pluggable Authentication (https://dev.mysql.com/doc/refman/8.0/en/native-pluggable-authentication.html)
- MySQL 8.0 Reference Manual: Caching SHA-2 Pluggable Authentication (https://dev.mysql.com/doc/refman/8.0/en/caching-sha2-pluggable-authentication.html)
- MySQL 8.0 Reference Manual: Server System Variables — default_authentication_plugin (https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_default_authentication_plugin)
- MySQL 8.0 Reference Manual: ALTER USER Statement (https://dev.mysql.com/doc/refman/8.0/en/alter-user.html)
- MySQL 8.0 Reference Manual: FLUSH PRIVILEGES (https://dev.mysql.com/doc/refman/8.0/en/privilege-changes.html)
- MySQL 9.0 Release Notes (https://dev.mysql.com/doc/relnotes/mysql/9.0/en/)

## Issues Found

1. **`SET GLOBAL default_authentication_plugin` claimed to work at runtime**: `default_authentication_plugin` is a static (read-only) system variable that cannot be changed at runtime. It can only be set in the configuration file or on the command line at server startup. Removed the incorrect `SET GLOBAL` example and added a note that a server restart is required.

2. **"client-side cache" in caching_sha2_password description**: The post stated that caching_sha2_password "includes a client-side cache." This is incorrect — `caching_sha2_password` uses a **server-side** in-memory cache. On the first authentication a full SHA-256 exchange occurs; the server then caches the hash so subsequent connections from the same user can use a faster challenge-response. Changed "client-side cache" to "server-side in-memory cache."

3. **Unnecessary `FLUSH PRIVILEGES` after `ALTER USER`**: The post included `FLUSH PRIVILEGES;` after `ALTER USER`. This is unnecessary because `ALTER USER` modifies the grant tables directly and MySQL automatically reloads the in-memory privilege cache. `FLUSH PRIVILEGES` is only needed after direct manipulation of grant tables via `INSERT`/`UPDATE`/`DELETE`. Removed the unnecessary statement.

## Review Notes
- The client library version recommendations (Connector/Python 8.0.16, mysql2 2.3.0, PHP 7.4 with mysqlnd) are safe recommendations that will work, but actual caching_sha2_password support was available in earlier versions of some of these libraries (e.g., PHP mysqlnd added support in PHP 7.2.8). The current recommendations are conservative and not incorrect, so they were left as-is.
- The `default_authentication_plugin` variable was itself deprecated in MySQL 8.0.27 and replaced by the `authentication_policy` system variable in MySQL 8.4. The post does not mention `authentication_policy`, which could be a useful addition in a future update.
- The MFA claim ("added in MySQL 8.0") is accurate at the series level, though MFA was specifically introduced in MySQL 8.0.27.
