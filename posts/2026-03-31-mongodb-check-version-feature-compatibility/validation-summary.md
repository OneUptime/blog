# Validation Summary: How to Check MongoDB Version and Feature Compatibility

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (7.0.x)
- mongosh (MongoDB Shell)
- featureCompatibilityVersion (FCV)
- MongoDB Replica Sets
- MongoDB Sharded Clusters
- Node.js MongoDB driver
- PyMongo

## Sources Consulted
- MongoDB official documentation on `db.version()`: https://www.mongodb.com/docs/manual/reference/method/db.version/
- MongoDB official documentation on `featureCompatibilityVersion`: https://www.mongodb.com/docs/manual/reference/command/setFeatureCompatibilityVersion/
- MongoDB official documentation on `getParameter`: https://www.mongodb.com/docs/manual/reference/command/getParameter/
- MongoDB official documentation on `serverStatus`: https://www.mongodb.com/docs/manual/reference/command/serverStatus/
- MongoDB upgrade procedures: https://www.mongodb.com/docs/manual/release-notes/7.0-upgrade-standalone/
- MongoDB driver compatibility: https://www.mongodb.com/docs/drivers/

## Issues Found
No technical issues found.

## Review Notes
- The `mongod --version` example output includes an `openSSLVersion` field at the top level of Build Info. In practice, OpenSSL information is nested differently in actual output (under `buildEnvironment` via `buildInfo` command). However, the output uses `...` and placeholder values (e.g., `abc123` for gitVersion), making it clearly illustrative rather than literal, so this is acceptable.
- The driver compatibility section (`npm info mongodb versions`, `pip show pymongo`) shows how to check installed driver versions but doesn't directly reveal which MongoDB server versions a driver supports. The post correctly directs readers to the official compatibility matrix for that information.
- The version upgrade path notation `5.0 -> 7.0 (not supported, skip upgrade)` could potentially be misread, but in context the meaning is clear: skipping major versions during upgrade is not supported.
- FCV in sharded clusters is set on the config server and propagated cluster-wide, but the advice to verify on each component (mongos, shard primaries) is sound operational practice.
