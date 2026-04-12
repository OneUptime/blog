# Validation Summary: How to Set Up Write Retries for High Availability in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (server and retryable writes protocol)
- MongoDB Node.js Driver (v4+)
- Write Concern configuration
- Replica set failover handling

## Sources Consulted
- MongoDB Retryable Writes documentation: https://www.mongodb.com/docs/manual/core/retryable-writes/
- MongoDB Write Concern documentation: https://www.mongodb.com/docs/manual/reference/write-concern/
- MongoDB error codes source (error_codes.yml): confirmed error codes 91 (ShutdownInProgress), 189 (PrimarySteppedDown), 10107 (NotWritablePrimary)
- MongoDB 5.0 release notes: terminology change from "not master" to "not primary"
- MongoDB Node.js Driver API documentation for MongoClient options and WriteConcern

## Issues Found

### Issue 1: Incorrect driver version for default retryWrites
- **What was wrong:** The post stated "Retryable writes are enabled by default in MongoDB drivers version 4.0 and above." This is inaccurate — MongoDB 4.0 introduced retryable writes as a feature, but drivers did not default `retryWrites` to `true` until drivers compatible with MongoDB 4.2.
- **What was changed:** Updated to "Retryable writes are enabled by default in official MongoDB drivers compatible with MongoDB 4.2 and above."
- **Why:** The MongoDB documentation explicitly ties the default-on behavior to the 4.2-compatible driver generation (`4.2-changes-drivers-retryWrites-default`). Using "version 4.0" could also be confused with MongoDB server version 4.0, which did not default to retryable writes.

### Issue 2: Outdated error message check in manual retry logic
- **What was wrong:** The manual retry function only checked `err.message?.includes("not master")` for detecting a non-primary node error. MongoDB 5.0+ replaced the "not master" terminology with "not primary" as part of inclusive language changes. Code relying solely on the old string would fail to detect this error on MongoDB 5.0+ servers.
- **What was changed:** Added error code `10107` (NotWritablePrimary) check and a `"not primary"` string check alongside the existing `"not master"` check.
- **Why:** Error code 10107 is the version-independent way to detect this condition. Adding both string variants ensures the fallback works across all MongoDB versions.

## Review Notes
- The post's distinction between ordered and unordered `insertMany` for retryability is a practical simplification. The official MongoDB documentation lists `insertMany` as retryable without distinguishing ordered vs unordered. However, the practical concern about ordered `insertMany` partially completing before failure is valid and useful guidance for developers.
- The `wtimeoutMS` field name used in the Node.js driver code examples is correct for the Node.js driver API, though the MongoDB server-level write concern specification uses `wtimeout`. Since all code examples use the Node.js driver, this is not an issue.
- The post could benefit from mentioning the `RetryableWriteError` error label available on MongoError objects in newer drivers, which provides a more robust way to detect retryable errors. This is not an error in the current post, just a potential future enhancement.
