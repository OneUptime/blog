# Validation Summary: How to Configure TLS Options in mongod.conf

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MongoDB (4.2+ TLS configuration via `net.tls` settings)
- TLS/SSL encryption
- mongod.conf configuration
- mongosh CLI
- Node.js MongoDB driver

## Sources Consulted
- MongoDB Manual: net.tls Options — https://www.mongodb.com/docs/manual/reference/configuration-options/#net-tls-options
- MongoDB Manual: TLS/SSL Configuration for Clients — https://www.mongodb.com/docs/manual/tutorial/configure-ssl-clients/
- MongoDB Manual: serverStatus output — https://www.mongodb.com/docs/manual/reference/command/serverStatus/
- MongoDB Node.js Driver: Connection Options — https://www.mongodb.com/docs/drivers/node/current/fundamentals/connection/connection-options/

## Issues Found

1. **Unused `fs` import in Node.js example**: The `require("fs")` import was included but never used in the code snippet. Removed the dead import.

2. **Missing `certificateKeyFile` in "Disabling Certificate Validation" section**: The config snippet set `net.tls.mode: allowTLS` with `allowInvalidCertificates` and `allowInvalidHostnames`, but omitted `certificateKeyFile`. MongoDB requires `certificateKeyFile` when the TLS mode is anything other than `disabled` — without it, mongod will fail to start. Added `certificateKeyFile: /etc/ssl/mongodb/server.pem` to the snippet.

3. **Incorrect `serverStatus` field name**: The "Verifying TLS is Active" section referenced `security.SSLServerSubjectDN`, which does not exist in MongoDB's `serverStatus` output. The correct field name is `security.SSLServerSubjectName`. Fixed the field name.

## Review Notes
- All `net.tls.*` configuration field names are correct for MongoDB 4.2+ (the version that introduced the `tls`-prefixed options replacing the older `ssl`-prefixed options).
- The post does not mention that the older `net.ssl.*` configuration options are deprecated but still functional. This could be noted for readers working with older configs, but is not an error.
- The `bindIp: 0.0.0.0` in the basic config example binds to all interfaces. While appropriate for demonstrating TLS setup, production deployments should consider restricting this to specific interfaces. This is not a technical error in the post.
