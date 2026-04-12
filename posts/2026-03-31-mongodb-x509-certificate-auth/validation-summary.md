# Validation Summary: How to Configure MongoDB x.509 Certificate Authentication

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (4.2+ TLS configuration syntax)
- OpenSSL (certificate generation and inspection)
- x.509 / TLS certificate authentication
- Node.js MongoDB driver
- mongosh (MongoDB Shell)

## Sources Consulted
- MongoDB Manual: x.509 Certificate Authentication — https://www.mongodb.com/docs/manual/core/security-x.509/
- MongoDB Manual: TLS/SSL Configuration for mongod — https://www.mongodb.com/docs/manual/reference/configuration-options/#net-tls-options
- MongoDB Manual: Appendix C - OpenSSL Client Certificates — https://www.mongodb.com/docs/manual/appendix/security/appendixC-openssl-client/
- MongoDB Manual: db.createUser() — https://www.mongodb.com/docs/manual/reference/method/db.createUser/
- MongoDB Node.js Driver: Connection Options — https://www.mongodb.com/docs/drivers/node/current/fundamentals/connection/connection-options/
- OpenSSL documentation: req, x509, genrsa commands
- RFC 2253: Lightweight Directory Access Protocol (v3) — UTF-8 String Representation of Distinguished Names

## Issues Found

### 1. Certificate `-subj` ordering (all OpenSSL commands)
**What was wrong:** All `openssl req` commands used non-standard DN component ordering in the `-subj` parameter (e.g., `/CN=alice/O=MyOrg/OU=Clients/C=US`). The standard X.500 ordering is least-specific to most-specific: `/C=US/O=MyOrg/OU=Clients/CN=alice`. This matters because `openssl x509 -subject -nameopt RFC2253` reverses the internal DER storage order when producing the RFC 2253 string representation. With the original ordering, the RFC 2253 output would be `C=US,OU=Clients,O=MyOrg,CN=alice` — not `CN=alice,OU=Clients,O=MyOrg,C=US` as shown in the blog. Since MongoDB requires the `$external` username to match the certificate's RFC 2253 subject exactly, following the original examples would cause authentication to fail.

**What was changed:** Fixed all four `-subj` parameters to use standard ordering:
- CA: `/CN=MongoDB-CA/O=MyOrg/C=US` → `/C=US/O=MyOrg/CN=MongoDB-CA`
- Server: `/CN=mongodb.example.com/O=MyOrg/OU=Servers/C=US` → `/C=US/O=MyOrg/OU=Servers/CN=mongodb.example.com`
- Client: `/CN=alice/O=MyOrg/OU=Clients/C=US` → `/C=US/O=MyOrg/OU=Clients/CN=alice`
- Member: `/CN=rs-member-2/O=MyOrg/OU=Servers/C=US` → `/C=US/O=MyOrg/OU=Servers/CN=rs-member-2`

**Why:** This ensures the RFC 2253 output from `openssl x509 -subject -nameopt RFC2253` matches the example output shown in the post (`CN=alice,OU=Clients,O=MyOrg,C=US`), and therefore matches the MongoDB username used in `db.createUser()`. This also aligns with MongoDB's own documentation examples which use the standard C, O, OU, CN ordering.

### 2. Unused `fs` import in Node.js example
**What was wrong:** The Node.js example included `const fs = require("fs")` but `fs` was never used anywhere in the code.

**What was changed:** Removed the unused `require("fs")` import line.

**Why:** Dead imports are confusing and suggest the reader needs the `fs` module for x.509 authentication, which they don't when using file path options directly.

## Review Notes
- The `clusterAuthMode: x509` setting in Step 2's mongod.conf is only relevant for replica sets/sharded clusters. The comment clarifies this, but standalone deployments don't need it.
- The `db.auth({ mechanism: "MONGODB-X509" })` shown in Step 4 is redundant when connecting with `--authenticationMechanism MONGODB-X509` on the command line (authentication happens during connection). It's presented as an alternative for manual authentication after connecting, which is valid.
- The Node.js example uses top-level `await` with CommonJS `require()` syntax. Top-level `await` is only valid in ES modules. This is a common convention in code examples and unlikely to confuse readers.
- The Certificate Rotation section could be clearer: if the new certificate has the same Subject DN, no MongoDB user changes are needed — just replace the certificate file. The `db.updateUser()` call shown only updates roles. The section's guidance is technically valid but could be more precise about when user changes are needed vs. just file replacement.
