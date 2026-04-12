# Validation Summary: How to Troubleshoot Network Connectivity to MongoDB Atlas

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- MongoDB Atlas
- MongoDB Shell (mongosh)
- MongoDB Node.js Driver
- DNS (SRV records)
- TLS/SSL (OpenSSL)
- Atlas Administration API v2
- Network diagnostic tools (dig, nc, telnet, curl)

## Sources Consulted
- MongoDB Atlas Troubleshoot Connection Issues: https://www.mongodb.com/docs/atlas/troubleshoot-connection/
- MongoDB Atlas Administration API (v2) documentation: https://www.mongodb.com/docs/atlas/reference/api-resources-spec/v2/
- MongoDB Atlas Administration API (v1, deprecated): https://www.mongodb.com/docs/api/doc/atlas-admin-api-v1/
- Migrate to the New Versioned Atlas Administration API: https://www.mongodb.com/docs/atlas/api/migrate-to-new-version/
- MongoDB Node.js Driver Connection Options: https://www.mongodb.com/docs/drivers/node/current/connect/connection-options/
- MongoDB Node.js Driver CSOT (timeoutMS): https://www.mongodb.com/docs/drivers/node/current/connect/connection-options/csot/
- mongosh Command-Line Options: https://www.mongodb.com/docs/mongodb-shell/reference/options/
- OpenSSL s_client documentation for TLS protocol testing

## Issues Found

### 1. Incorrect DNS lookup command for SRV-based connections
- **What was wrong:** The post used `dig cluster0.abcde.mongodb.net +short` to verify DNS resolution. MongoDB Atlas `mongodb+srv://` connection strings rely on SRV DNS records at `_mongodb._tcp.<hostname>`, not A records on the base hostname. The original command would likely return no results.
- **What was changed:** Updated to `dig _mongodb._tcp.cluster0.abcde.mongodb.net SRV +short` which correctly queries the SRV records that Atlas uses for service discovery.
- **Why:** The `mongodb+srv://` protocol uses DNS SRV records to discover replica set members. Querying A records on the cluster hostname does not verify the DNS path that the driver actually uses.

### 2. Deprecated Atlas Administration API v1.0 endpoints
- **What was wrong:** The API examples used `https://cloud.mongodb.com/api/atlas/v1.0/...` which is the deprecated v1 API.
- **What was changed:** Updated both the GET and POST access list API calls to use `https://cloud.mongodb.com/api/atlas/v2/...` and added the required `Accept: application/vnd.atlas.2023-02-01+json` header for the v2 API.
- **Why:** The Atlas Admin API v1.0 is officially deprecated. The v2 API is the current recommended version and uses date-based resource versioning via the Accept header.

## Review Notes
- The `socketTimeoutMS` option shown in the Node.js driver example was deprecated in driver v6.11.0 as part of the Client-Side Operations Timeout (CSOT) feature. The new `timeoutMS` option is its replacement. However, `socketTimeoutMS` still functions in current driver versions and the post uses it in a debugging context, so no change was made. This may warrant an update if CSOT reaches GA status.
- The `openssl s_client -tls1_2` command, `nc -zv` port test, `mongosh` authentication flags, and all error message patterns are technically correct.
- The Atlas UI navigation paths (Metrics > Real-Time, Monitoring > Connections) are generally accurate but may shift as the Atlas UI is updated over time.
