# Validation Summary: How to Configure MongoDB net.tls Settings for Secure Connections

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MongoDB (net.tls configuration)
- TLS/SSL encryption
- OpenSSL (certificate generation and verification)
- mongosh (MongoDB Shell)
- MongoDB Node.js Driver
- Replica set internal TLS communication
- X.509 certificate authentication

## Sources Consulted
- MongoDB Configuration Options Reference (net.tls settings): https://www.mongodb.com/docs/manual/reference/configuration-options/#tls-options
- MongoDB net.tls.mode documentation: https://www.mongodb.com/docs/manual/reference/configuration-options/#mongodb-setting-net.tls.mode
- MongoDB rotateCertificates command reference: https://www.mongodb.com/docs/manual/reference/command/rotateCertificates/
- MongoDB serverStatus command reference: https://www.mongodb.com/docs/manual/reference/command/serverStatus/
- MongoDB mongosh TLS options: https://www.mongodb.com/docs/mongodb-shell/reference/options/
- MongoDB Node.js Driver connection options: https://www.mongodb.com/docs/drivers/node/current/fundamentals/connection/connection-options/
- MongoDB 4.2 release notes (net.ssl to net.tls transition): https://www.mongodb.com/docs/manual/release-notes/4.2/

## Issues Found

### Issue 1: Incorrect MongoDB version for rotateCertificates command
- **What was wrong:** The post stated that the `rotateCertificates` admin command was available in "MongoDB 4.4+". This appeared in both the Certificate Rotation section code comment and the Summary section.
- **What was changed:** Corrected both instances to "MongoDB 5.0+", which is when the `rotateCertificates` command was actually introduced.
- **Why:** The `rotateCertificates` command was introduced in MongoDB 5.0, not 4.4. Using the wrong version could mislead users running MongoDB 4.4 into expecting the command to work.

### Issue 2: Non-existent serverStatus security field name
- **What was wrong:** The post stated to look for `"SSLServerHasCertificateAuthority": true` in the `serverStatus` security output. This field does not exist in MongoDB.
- **What was changed:** Replaced `"SSLServerHasCertificateAuthority": true` with `"SSLServerCertificateExpirationDate"`, which is the actual second field returned in the security section of serverStatus output.
- **Why:** The `serverStatus.security` section returns `SSLServerSubjectName` and `SSLServerCertificateExpirationDate`. There is no `SSLServerHasCertificateAuthority` field. Referencing a non-existent field would confuse users trying to verify their TLS setup.

## Review Notes
- The `net.tls.clusterAuthX509` configuration option shown in the Replica Set section was introduced in MongoDB 7.0. The post does not mention this version requirement, which could cause confusion for users on older versions. Consider adding a version note.
- The OpenSSL certificate generation commands are correct and functional but generate certificates without Subject Alternative Names (SANs). Modern TLS clients increasingly require SANs rather than relying solely on the CN field. For production use, adding `-addext "subjectAltName=DNS:mongodb.example.com"` to the CSR generation step would be more robust.
- The `fs` module is imported but unused in the Node.js driver example. This is a minor cosmetic issue that doesn't affect functionality.
- The `await client.connect()` in the Node.js example uses top-level await, which requires ES modules or an async function wrapper. This is a common pattern in documentation examples but could confuse beginners.
