# Validation Summary: How to Require SSL for MySQL Users

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (CREATE USER, ALTER USER, REQUIRE clause)
- SSL/TLS encryption for MySQL connections
- X.509 client certificate authentication
- Node.js mysql2 driver
- MySQL command-line client

## Sources Consulted
- MySQL 8.0 Reference Manual: CREATE USER SSL/TLS Options — https://dev.mysql.com/doc/refman/8.0/en/create-user.html#create-user-tls
- MySQL 8.0 Reference Manual: ALTER USER — https://dev.mysql.com/doc/refman/8.0/en/alter-user.html
- MySQL 8.0 Reference Manual: Using Encrypted Connections — https://dev.mysql.com/doc/refman/8.0/en/using-encrypted-connections.html
- MySQL 8.0 Reference Manual: GRANT Statement — https://dev.mysql.com/doc/refman/8.0/en/grant.html
- mysql2 npm package documentation — https://github.com/sidorares/node-mysql2

## Issues Found
1. **Inaccurate description of `REQUIRE SSL`**: The original text described `REQUIRE SSL` as "Connection must use SSL (any valid certificate)". The parenthetical "(any valid certificate)" is misleading — `REQUIRE SSL` only requires that the connection uses SSL/TLS encryption and does NOT require the client to present any certificate. That is the key distinction from `REQUIRE X509`. Changed to "Connection must use SSL/TLS encryption".

2. **Missing `fs` import in Node.js example**: The code used `fs.readFileSync()` to read certificate files but did not import the `fs` module. Added `const fs = require('fs');` before the `mysql2` import.

## Review Notes
- `FLUSH PRIVILEGES` is included after every `CREATE USER`, `ALTER USER`, and `GRANT` statement. Since MySQL 5.7.6+, these statements automatically reload the grant tables, making `FLUSH PRIVILEGES` redundant (though harmless). This is a common convention and not incorrect, so it was left as-is.
- The "Connecting as an SSL-Required User" example shows `--ssl-cert` and `--ssl-key` flags for a user created with `REQUIRE SSL`. These client certificate flags are only necessary for `REQUIRE X509`; for `REQUIRE SSL`, only `--ssl-mode=REQUIRED` (or `--ssl-ca` for server cert verification) is needed. The example still works correctly since MySQL accepts client certificates even when not required, but it may give readers the impression that client certs are mandatory for `REQUIRE SSL`.
- The error message shown (ERROR 1045) is accurate — MySQL returns a generic "Access denied" rather than a specific "SSL required" error when SSL requirements are not met.
