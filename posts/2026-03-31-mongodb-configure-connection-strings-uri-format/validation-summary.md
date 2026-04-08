# Validation Summary: How to Configure MongoDB Connection Strings (URI Format)

## Status
validated

## Post Type
Reference / Quick-start guide

## Technologies Covered
- MongoDB connection string URI format (standard and SRV)
- MongoDB authentication mechanisms (SCRAM-SHA-1, SCRAM-SHA-256, X.509, GSSAPI, PLAIN)
- MongoDB TLS/SSL connection options
- MongoDB replica set read preferences
- MongoDB connection pool and timeout tuning
- MongoDB write concern URI parameters
- MongoDB wire compression (snappy, zstd)
- mongosh CLI

## Sources Consulted
- MongoDB Connection String URI Format documentation: https://www.mongodb.com/docs/manual/reference/connection-string/
- MongoDB Connection String Options reference: https://www.mongodb.com/docs/manual/reference/connection-string/#connection-string-options
- MongoDB Authentication Mechanisms documentation: https://www.mongodb.com/docs/manual/core/authentication/#authentication-mechanisms
- MongoDB Read Preference documentation: https://www.mongodb.com/docs/manual/core/read-preference/
- MongoDB Write Concern documentation: https://www.mongodb.com/docs/manual/reference/write-concern/
- MongoDB TLS/SSL Configuration documentation: https://www.mongodb.com/docs/manual/reference/connection-string/#tls-options

## Issues Found
No technical issues found.

## Review Notes
- The description of SCRAM-SHA-256 as "MongoDB 4.0+ default" is a common simplification. More precisely, SCRAM-SHA-256 is preferred when the user was created with SHA-256 credentials (MongoDB 4.0+), but SCRAM-SHA-1 remains available and is used as a fallback. The post's phrasing is standard in reference material and not misleading.
- The `socketTimeoutMS` option is noted without a deprecation warning. Some newer MongoDB drivers (e.g., Node.js 4.0+) have deprecated `socketTimeoutMS` in favor of `timeoutMS` (introduced with the Client-Side Operation Timeout specification). This is worth monitoring as driver versions evolve, but the option remains valid in the connection string and across most drivers.
- The `maxPoolSize` default of 100 is correct for most official MongoDB drivers (Node.js, Java, Python, etc.).
- All percent-encoding examples (`%40` for `@`, `%3A` for `:`, `%21` for `!`) are correct.
