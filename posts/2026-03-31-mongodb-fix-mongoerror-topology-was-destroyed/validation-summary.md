# Validation Summary: How to Fix MongoError: Topology Was Destroyed in MongoDB

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- MongoDB
- MongoDB Node.js Driver (3.x and 4.x+)
- Node.js
- Express.js (example usage)
- AWS Lambda / Serverless environments

## Sources Consulted
- MongoDB Node.js Driver source code (`src/error.ts`, `src/sdam/topology.ts`) — https://github.com/mongodb/node-mongodb-native
- MongoDB Node.js Driver 3.6 Unified Topology documentation — https://github.com/mongodb/node-mongodb-native/blob/3.6/docs/reference/content/reference/unified-topology/index.md
- MongoDB Atlas Lambda connection guide — https://www.mongodb.com/docs/atlas/manage-connections-aws-lambda/
- MongoDB Node.js Driver SDAM monitoring events documentation

## Issues Found

### 1. Serverless example used internal/private driver API
**What was wrong:** The serverless reconnect guard used `client.topology.isConnected()`, which accesses the driver's internal topology object. This was never a public API. In the 3.x driver, the public method was `client.isConnected()` (on MongoClient directly). In driver 4.x+, `isConnected()` was removed entirely. Even in 3.6+ with Unified Topology, `isConnected()` always returned `true` after initial connection, making it unreliable for detecting stale connections.

**What was changed:** Replaced the `topology.isConnected()` reconnect guard with the MongoDB-recommended pattern: cache the client at module scope and let the driver's SDAM mechanism handle reconnection automatically. Added a `resetClient()` helper for use with the retry pattern in Section 4. Updated the explanatory text to reference the retry pattern for handling stale connections.

**Why:** Using private/internal APIs is fragile and version-dependent. The recommended serverless pattern from MongoDB's own documentation is to cache the client and handle errors via retry, not to proactively check connectivity.

### 2. Missing driver version context
**What was wrong:** The error `MongoError: Topology was destroyed` is specific to the MongoDB Node.js driver 3.x. In driver 4.x+, the same condition throws `MongoTopologyClosedError: Topology is closed`. The post did not mention this, which could confuse users on newer driver versions who search for this error.

**What was changed:** Added a note after the error stack trace explaining the version difference and that the fixes apply to both versions.

**Why:** Users on driver 4.x+ encountering `MongoTopologyClosedError` need to know this guide applies to their situation too, and users on 3.x should be aware of the change if they upgrade.

## Review Notes
- The retry logic in Section 4 checks `err.message.includes('Topology was destroyed')` via string matching. This works for driver 3.x but would miss the 4.x+ `MongoTopologyClosedError` (message: "Topology is closed"). For comprehensive coverage, users could check for both strings or use `instanceof MongoTopologyClosedError` in 4.x+. This is a minor limitation, not an error, since the blog title specifically targets the 3.x error message.
- The `topologyClosed` SDAM monitoring event in the diagnostics section is correct and works across all driver versions.
- The singleton pattern and graceful shutdown advice are sound and align with MongoDB best practices.
- The SIGTERM handler uses an async callback with `process.on`, which does not natively await promises. In practice this works because `client.close()` resolves quickly before `process.exit(0)` is called, but it is worth noting as a known Node.js pattern caveat.
