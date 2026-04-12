# Validation Summary: How to Compare MongoDB vs CouchDB for Sync Capabilities

## Status
validated

## Post Type
Comparison Guide / Tutorial

## Technologies Covered
- Apache CouchDB (replication, _replicator database, _changes feed)
- PouchDB (browser/mobile sync with CouchDB)
- MongoDB (replica sets, oplog, Change Streams)
- MongoDB Atlas Device Sync (deprecated September 2025)
- Realm SDK (deprecated alongside Atlas Device Sync)
- MongoDB Node.js driver (Change Streams API)
- MongoDB Aggregation Pipeline
- CouchDB MapReduce views and Mango queries

## Sources Consulted
- CouchDB 3.x official documentation on replication (`/{db}/_replicator`) and changes feed (`/{db}/_changes`)
- PouchDB API documentation (v9.0.0) for `sync()`, `put()`, `get()`, and `remove()` methods
- MongoDB official documentation on Change Streams (`collection.watch()`)
- MongoDB official documentation on replica sets and oplog
- MongoDB Atlas Device Sync deprecation announcement (September 2024)
- MongoDB Node.js driver documentation for `MongoClient`, `collection.watch()`, and change event fields

## Issues Found

### 1. Atlas Device Sync presented as current (Critical)
**What was wrong:** The post presented MongoDB Atlas Device Sync and the Realm SDK as current, viable options for offline-first mobile sync. Atlas Device Sync was deprecated by MongoDB in September 2024 and the service was shut down on September 30, 2025. As of the post's date (March 2026), this service no longer exists.

**What was changed:**
- Updated the MongoDB Replication Model section to note the deprecation and shutdown timeline.
- Updated the comparison table header and relevant rows to indicate Device Sync is deprecated.
- Added a deprecation notice to the "MongoDB Atlas Device Sync" section heading and introduction, noting the code is preserved for historical reference.
- Updated the "When to Choose MongoDB" recommendation to note the deprecation and suggest alternatives.
- Updated the Summary to reflect that Device Sync is no longer available, strengthening the CouchDB recommendation for sync use cases.

### 2. CouchDB latency description understated (Minor)
**What was wrong:** The comparison table listed CouchDB's latency model as "HTTP polling or long-poll," which omits CouchDB's support for continuous streaming (`feed=continuous`) and Server-Sent Events (`feed=eventsource`). This made CouchDB appear less capable for real-time use cases than it actually is.

**What was changed:** Updated the latency row to "HTTP polling, long-poll, or continuous streaming."

### 3. MongoDB Change Streams replica set requirement missing (Minor)
**What was wrong:** The Change Streams code example used a connection string `mongodb://localhost:27017` without noting that Change Streams require a replica set or sharded cluster. Running this against a standalone `mongod` would fail with an error.

**What was changed:**
- Added a note before the code block stating the replica set requirement.
- Updated the connection string to include `?replicaSet=rs0` and added a comment in the code.

## Review Notes
- The CouchDB replication curl command uses credentials embedded in the URL. While functionally correct, CouchDB 3.x recommends using the `auth` sub-object within the source/target objects for better security practices. This is a best-practice suggestion, not a technical error.
- The PouchDB code examples use top-level `await` without an explicit async wrapper. This works in ES modules or modern Node.js with top-level await support, but readers using CommonJS (`require`) may need to wrap the code in an async function.
- MongoDB's `fullDocument: "updateLookup"` option has been joined by newer options in MongoDB 6.0+ (`"whenAvailable"`, `"required"`, and `fullDocumentBeforeChange`), but `"updateLookup"` remains valid and is the most commonly used value.
- CouchDB's query model description (MapReduce views + Mango queries being less expressive than MongoDB's aggregation pipeline) is accurate and fair.
- With Atlas Device Sync now deprecated, the MongoDB ecosystem lacks a first-party offline-first mobile sync solution. Teams needing this capability should evaluate CouchDB + PouchDB, or third-party solutions like WatermelonDB, PowerSync, or custom sync implementations using MongoDB Change Streams.
