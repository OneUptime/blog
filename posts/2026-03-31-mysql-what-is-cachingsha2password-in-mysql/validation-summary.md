# Validation Summary: What Is caching_sha2_password in MySQL

## Status
validated

## Post Type
Reference / Explainer

## Technologies Covered
- MySQL 8.0
- caching_sha2_password authentication plugin
- mysql_native_password authentication plugin
- SHA-256 hashing
- RSA key exchange
- Python mysql-connector-python driver
- Node.js mysql2 driver

## Sources Consulted
- MySQL 8.0 Reference Manual: caching_sha2_password authentication plugin (https://dev.mysql.com/doc/refman/8.0/en/caching-sha2-pluggable-authentication.html)
- MySQL 8.0 Reference Manual: CREATE USER statement (https://dev.mysql.com/doc/refman/8.0/en/create-user.html)
- MySQL 8.0 Reference Manual: ALTER USER statement (https://dev.mysql.com/doc/refman/8.0/en/alter-user.html)
- MySQL 8.0 Reference Manual: FLUSH statement (https://dev.mysql.com/doc/refman/8.0/en/flush.html)
- MySQL 8.0 Reference Manual: Server system variables — default_authentication_plugin (https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_default_authentication_plugin)
- mysql-connector-python documentation (https://dev.mysql.com/doc/connector-python/en/)
- mysql2 npm package documentation (https://github.com/sidorares/node-mysql2)

## Issues Found

### 1. Inaccurate first-connection authentication flow
**What was wrong:** The original Step 3 stated "Client hashes password with SHA-256 and sends it," followed by Steps 4-5 about RSA as a separate concern. In reality, on the first connection (no cache entry), the client first sends a SHA-256 scramble which the server cannot verify without a cache entry. The server then requests full/complete authentication, where the client must send the actual password — either in cleartext over an SSL/TLS-encrypted channel, or RSA-encrypted if no TLS is available. The original description incorrectly implied the client simply hashes and sends the password hash.

**What was changed:** Rewrote the first-connection flow to accurately describe the two-phase process: initial scramble attempt, server fallback to full authentication, and the two paths (SSL cleartext vs. RSA-encrypted) for transmitting the password.

### 2. Incorrect terminology in cached authentication flow
**What was wrong:** Step 3 of the cached flow stated "Client responds with SHA-256(nonce + cached_hash)," implying the client holds a cached hash. The authentication cache is entirely server-side. The client computes a SHA-256-based scramble from its password and the server-provided nonce; the server verifies this against its own cached hash entry.

**What was changed:** Updated to "Client sends the same SHA-256-based scramble of the password" and "Server verifies against its cached hash," correctly attributing the cache to the server side.

## Review Notes
- The `default_authentication_plugin` variable was deprecated in MySQL 8.0.34 in favor of `authentication_policy`, and removed in MySQL 8.4. The post is scoped to MySQL 8.0 so this is not an error, but readers on newer versions should be aware.
- `mysql_native_password` was deprecated in MySQL 8.0.34 and removed as a built-in plugin in MySQL 8.4. The post correctly labels it as "Not Recommended" but a future update could note the formal deprecation.
- The Python code comment says `ssl_ca` is "Required for caching_sha2_password over network" — SSL (in some form) is required for non-cached authentication over TCP, but `ssl_ca` specifically is just one way to configure SSL. This is acceptable for an example but slightly overstated.
- All SQL syntax (CREATE USER, ALTER USER, SELECT from mysql.user, FLUSH PRIVILEGES) is correct.
- CLI flags `--ssl-mode=REQUIRED` and `--get-server-public-key` are correct.
- The explanation of mysql_native_password using double SHA-1 is accurate.
