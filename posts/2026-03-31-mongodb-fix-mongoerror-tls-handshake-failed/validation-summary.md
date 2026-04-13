# Validation Summary: How to Fix MongoError: TLS Handshake Failed in MongoDB

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- MongoDB (server configuration, mongod.conf)
- MongoDB Node.js Driver (MongoClient TLS options)
- PyMongo (Python MongoDB driver)
- OpenSSL (certificate inspection commands)
- TLS/SSL (protocol versions, certificates, mTLS)

## Sources Consulted
- MongoDB Node.js Driver documentation for MongoClientOptions TLS settings (mongodb.com/docs/drivers/node/current/)
- MongoDB Server documentation for net.tls configuration (mongodb.com/docs/manual/reference/configuration-options/#net.tls-options)
- MongoDB 4.2 release notes regarding TLS 1.0/1.1 deprecation and introduction of net.tls config syntax
- MongoDB 6.0 release notes regarding TLS 1.0/1.1 removal
- Node.js tls module documentation for DEFAULT_MIN_VERSION
- PyMongo documentation for MongoClient TLS parameters

## Issues Found
1. **Unused import in Node.js example (Cause 1)**: The code had `import { readFileSync } from 'fs'` but never used it. The `tlsCAFile` option accepts a file path string and the driver reads the file internally, so `readFileSync` is not needed. Removed the unused import.

2. **Inconsistent heading for Cause 2**: The heading was `### 2. Hostname Mismatch` (an h3 with a numbered list style), while all other causes used `## Cause N: Title` (h2 format). Changed to `## Cause 2: Hostname Mismatch` for consistency.

3. **Incorrect MongoDB version for TLS 1.2 requirement**: The post claimed "MongoDB 4.0+ requires TLS 1.2 or higher." This is inaccurate. TLS 1.0/1.1 were deprecated in MongoDB 4.2 and effectively removed in MongoDB 6.0+. Additionally, the `net.tls` configuration syntax shown in the examples was introduced in MongoDB 4.2, not 4.0. Corrected to "MongoDB 4.2+ deprecated TLS 1.0 and 1.1, and MongoDB 6.0+ effectively requires TLS 1.2 or higher."

4. **Invalid `tlsMinVersion` MongoClient option**: The Node.js example used `tlsMinVersion: 'TLSv1.2'` as a MongoClient option, but this is not a valid MongoDB Node.js driver option. The driver does not expose TLS version control directly. Replaced with the correct Node.js approach: setting `tls.DEFAULT_MIN_VERSION = 'TLSv1.2'` at the runtime level before creating the client.

## Review Notes
- The `net.tls` configuration examples (Causes 3 and 4) are valid for MongoDB 4.2+. Users on MongoDB 4.0 would need to use the deprecated `net.ssl` equivalents instead, but since 4.0 is EOL this is not worth calling out.
- The openssl diagnostic commands are all correct and useful.
- The PyMongo `tlsCAFile` parameter usage is correct.
- The mTLS (Cause 5) example correctly shows `tlsCertificateKeyFile` which is a valid driver option.
