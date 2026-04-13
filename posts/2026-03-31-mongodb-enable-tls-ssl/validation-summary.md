# Validation Summary: How to Enable TLS/SSL in MongoDB

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- MongoDB (mongod configuration, mongosh client)
- OpenSSL (certificate generation)
- TLS/SSL (transport encryption, mutual TLS)
- Node.js MongoDB driver
- PyMongo (Python MongoDB driver)

## Sources Consulted
- MongoDB documentation: TLS/SSL Configuration for mongod — https://www.mongodb.com/docs/manual/reference/configuration-options/#net-tls-options
- MongoDB documentation: TLS/SSL Configuration for Clients — https://www.mongodb.com/docs/manual/tutorial/configure-ssl-clients/
- MongoDB documentation: net.tls.mode options — https://www.mongodb.com/docs/manual/reference/configuration-options/#mongodb-setting-net.tls.mode
- MongoDB Node.js Driver documentation: Connection Options — https://www.mongodb.com/docs/drivers/node/current/fundamentals/connection/connection-options/
- PyMongo documentation: TLS/SSL configuration — https://pymongo.readthedocs.io/en/stable/examples/tls.html
- OpenSSL man pages for genrsa, req, x509

## Issues Found
1. **Certificate file creation before directory exists**: The post had a standalone `cat server.crt server.key > /etc/ssl/mongodb/mongodb.pem` command that would fail because `/etc/ssl/mongodb/` was not yet created (the `mkdir -p` came later in the permissions section). Merged the two sections into one coherent block that creates the directory first, then writes the PEM file.

2. **Unused `fs` import in Node.js example**: `const fs = require("fs")` was imported but never used. The MongoDB Node.js driver accepts file paths as strings for `tlsCAFile`, so `fs` is not needed. Removed the unused import.

3. **Unused `ssl` import in Python example**: `import ssl` was imported but never used. PyMongo's current API (4.x+) uses `tls=True` and `tlsCAFile` parameters directly without needing the `ssl` module. Removed the unused import.

## Review Notes
- The TLS handshake sequence diagram is a simplified representation. In TLS 1.3, the handshake flow differs (no separate ClientKeyExchange message), but the simplification is acceptable for a conceptual overview in a blog post.
- The certificate rotation section describes a manual approach using TLS mode changes and restarts. MongoDB 5.0+ supports the `rotateCertificates` admin command, which allows hot-reloading certificates without restarting mongod. A future update could mention this as the preferred approach for MongoDB 5.0+.
- All `mongod.conf` field names (`net.tls.mode`, `net.tls.certificateKeyFile`, `net.tls.CAFile`, `net.tls.allowConnectionsWithoutCertificates`, `net.tls.disabledProtocols`) are correct per current MongoDB documentation.
- The TLS mode descriptions (`disabled`, `allowTLS`, `preferTLS`, `requireTLS`) are accurate.
- Connection string parameters (`tls=true`, `tlsCAFile`, `tlsCertificateKeyFile`) are correct for both mongosh and driver usage.
