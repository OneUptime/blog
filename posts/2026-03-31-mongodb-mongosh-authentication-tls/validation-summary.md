# Validation Summary: How to Use mongosh with Authentication and TLS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB
- mongosh (MongoDB Shell)
- SCRAM-SHA-256 authentication
- X.509 certificate authentication
- TLS/SSL encryption
- Mutual TLS (mTLS)
- MongoDB Atlas

## Sources Consulted
- MongoDB mongosh documentation: https://www.mongodb.com/docs/mongodb-shell/
- MongoDB mongosh connection options: https://www.mongodb.com/docs/mongodb-shell/reference/options/
- MongoDB TLS/SSL configuration: https://www.mongodb.com/docs/manual/reference/program/mongosh/#tls-options
- MongoDB X.509 authentication: https://www.mongodb.com/docs/manual/core/security-x.509/
- MongoDB connectionStatus command: https://www.mongodb.com/docs/manual/reference/command/connectionStatus/
- MongoDB serverStatus command: https://www.mongodb.com/docs/manual/reference/command/serverStatus/
- MongoDB getCmdLineOpts command: https://www.mongodb.com/docs/manual/reference/command/getCmdLineOpts/

## Issues Found
1. **Incorrect TLS verification method using `connectionStatus`**: The "Verifying the TLS Connection" section used `db.adminCommand({ connectionStatus: 1 })` with a comment saying to "Look for 'sslMode' in the response." The `connectionStatus` command returns authentication information (authenticated users and roles), not TLS/SSL connection details. It does not include `sslMode` in its response. Replaced with `db.adminCommand({ serverStatus: 1 }).security`, which returns the TLS version information and secure connection counts, and is the correct way to verify TLS status on the server.

## Review Notes
- All mongosh CLI flags (`--tls`, `--tlsCAFile`, `--tlsCertificateKeyFile`, `--tlsCertificateKeyFilePassword`, `--tlsAllowInvalidCertificates`, `--authenticationMechanism`, `--authenticationDatabase`) are correct and current.
- The `$external` database escaping in the bash command (`"\$external"`) is correctly handled for shell interpretation.
- The X.509 user creation example uses the correct `db.getSiblingDB("$external").createUser()` pattern with an RFC2253-formatted distinguished name.
- The text says "Subject (CN) must match" — technically it is the full Subject DN that must match the user entry, not just the CN component. The example DN provided is correct and complete, so this is a minor wording ambiguity rather than an error.
- The `getCmdLineOpts` command requires the user to have the `getCmdLineOpts` action privilege; a note about this was added in the fix.
- The MongoDB Atlas section correctly notes that `mongodb+srv://` connections use TLS by default and do not need a custom CA file.
