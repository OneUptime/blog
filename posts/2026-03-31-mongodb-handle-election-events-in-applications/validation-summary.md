# Validation Summary: How to Handle Election Events in MongoDB Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (replica sets, elections, retryable writes)
- Node.js MongoDB driver (SDAM events, MongoClient options)
- PyMongo (Python MongoDB driver)
- JavaScript / Python

## Sources Consulted
- MongoDB official documentation on retryable writes (https://www.mongodb.com/docs/manual/core/retryable-writes/)
- MongoDB Node.js driver API documentation for TopologyDescription (https://mongodb.github.io/node-mongodb-native/)
- MongoDB Node.js driver source code confirming `TopologyDescription.servers` is `Map<string, ServerDescription>`
- MongoDB SDAM specification (https://github.com/mongodb/specifications/tree/master/source/server-discovery-and-monitoring)
- MongoDB error codes reference (error 10107 = NotWritablePrimary, error 91 = ShutdownInProgress)
- PyMongo documentation for `NotPrimaryError` and `ConnectionFailure` exceptions

## Issues Found

### 1. Runtime error in SDAM topologyDescriptionChanged event handler
- **What was wrong:** The code called `newDescription.servers.some(([, s]) => ...)` but `TopologyDescription.servers` is a `Map<string, ServerDescription>` in the Node.js MongoDB driver, not an array. `Map` does not have a `.some()` method, so this code would throw a `TypeError` at runtime.
- **What was changed:** Replaced `newDescription.servers.some(([, s]) => s.type === "RSPrimary")` with `Array.from(newDescription.servers.values()).some((s) => s.type === "RSPrimary")`.
- **Why:** `Map` values must be converted to an array (or iterated) before calling array methods like `.some()`.

### 2. Misleading claim about insertMany retryability
- **What was wrong:** The post stated "Multi-document writes with `insertMany` (ordered) are also retried as a batch." The "(ordered)" qualifier is misleading because `insertMany` is retryable regardless of whether it is ordered or unordered. The phrasing also implied only ordered operations qualify.
- **What was changed:** Replaced with "Multi-document writes with `insertMany` and `bulkWrite` (when composed of single-document operations) are also retryable." This is accurate per the MongoDB retryable writes specification and also mentions `bulkWrite` which is another commonly used retryable multi-document operation.
- **Why:** The original statement could lead readers to believe that only ordered `insertMany` is retryable, which is incorrect.

## Review Notes
- Error code 10107 is labeled as `// NotPrimary` in the code comment. The official MongoDB error name is `NotWritablePrimary` (renamed from `NotMaster` in MongoDB 5.0+). The comment is a reasonable shorthand and not incorrect, but readers should be aware of the official name.
- The post mentions `NotMaster` as an error name in the introductory section. This was the pre-5.0 name; the current name is `NotWritablePrimary`. Both are mentioned for completeness and backward compatibility, which is appropriate.
- The Python example correctly uses `NotPrimaryError` which is the PyMongo exception class name (distinct from the MongoDB server error name).
- The `serverSelectionTimeoutMS` default is 30000ms (30 seconds); the post's suggestion of 15000ms is a reasonable tuning recommendation.
