# Validation Summary: How to Troubleshoot MongoDB TLS/SSL Connection Issues

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- MongoDB (server configuration, TLS/SSL)
- OpenSSL (certificate inspection and verification)
- Node.js MongoDB driver (v6.x TLS connection options)
- mongosh (connection strings with TLS parameters)

## Sources Consulted
- MongoDB documentation: db.rotateCertificates() - https://www.mongodb.com/docs/manual/reference/method/db.rotateCertificates/
- MongoDB documentation: Configuration File Options (net.tls settings) - https://www.mongodb.com/docs/manual/reference/configuration-options/
- MongoDB documentation: Server Parameters (opensslCipherConfig) - https://www.mongodb.com/docs/manual/reference/parameters/
- MongoDB Node.js Driver v6.x: Enable TLS on a Connection - https://www.mongodb.com/docs/drivers/node/current/security/tls/
- OpenSSL x509 manual page (for -ext flag availability) - https://docs.openssl.org/1.1.1/man1/x509/

## Issues Found
1. **Incorrect certificate reload command (Fix 3 - Expired Certificate)**: The post recommended `db.adminCommand({setParameter: 1, opensslCipherConfig: ""})` to reload TLS certificates without downtime. This is wrong — `opensslCipherConfig` controls which cipher suites are available, not certificate reloading. Changed to `db.rotateCertificates()`, which is the correct method introduced in MongoDB 4.4 for rotating TLS certificates without restarting the server.

2. **Unused `fs` import (Fix 5 - Client Certificate Required)**: The Node.js code example imported `const fs = require("fs")` but never used it. In the current MongoDB Node.js driver (v6.x), TLS file paths are passed directly as strings via `tlsCertificateKeyFile` and `tlsCAFile` options, so `fs.readFileSync()` is not needed. Removed the unused import.

## Review Notes
- The `openssl x509 -ext subjectAltName` command in Fix 2 requires OpenSSL 1.1.1 or later. On older systems (e.g., RHEL 7 with OpenSSL 1.0.x), users would need `openssl x509 -noout -text | grep -A1 "Subject Alternative Name"` instead. This is a minor compatibility note, not an error.
- The `net.tls` configuration section (Fix 4) uses the modern TLS config namespace, which is correct. The older `net.ssl` namespace is deprecated since MongoDB 4.2.
- The `db.rotateCertificates()` method requires MongoDB 4.4+. Users on older versions would need to restart the server to pick up new certificates.
