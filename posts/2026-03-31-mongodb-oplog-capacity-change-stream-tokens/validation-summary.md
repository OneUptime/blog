# Validation Summary: How to Monitor Oplog Capacity for Change Stream Token Expiration in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (oplog, change streams, replica sets)
- mongosh (MongoDB Shell)
- Node.js MongoDB Driver (change stream API)
- Prometheus / Grafana (alerting)
- percona/mongodb_exporter (metrics)

## Sources Consulted
- MongoDB Manual — BSON Timestamp type: https://www.mongodb.com/docs/manual/reference/bson-types/
- MongoDB Manual — mongosh data types (Timestamp `.t` and `.i` properties): https://www.mongodb.com/docs/mongodb-shell/reference/data-types/
- MongoDB Node.js Driver BSON Timestamp class API: https://mongodb.github.io/node-mongodb-native/6.3/classes/BSON.Timestamp.html
- MongoDB Manual — Change Streams: https://www.mongodb.com/docs/manual/changeStreams/
- MongoDB Manual — replSetResizeOplog: https://www.mongodb.com/docs/manual/reference/command/replSetResizeOplog/
- MongoDB Manual — Replica Set Oplog: https://www.mongodb.com/docs/manual/core/replica-set-oplog/
- MongoDB Manual — replication configuration options (oplogSizeMB): https://www.mongodb.com/docs/manual/reference/configuration-options/#mongodb-setting-replication.oplogSizeMB

## Issues Found

### 1. Incorrect `getTime()` on BSON Timestamp in mongosh code
- **What was wrong:** The code used `newest.ts.getTime() - oldest.ts.getTime()` to compute the oplog window. BSON `Timestamp` objects in mongosh do not have a `getTime()` method; the correct property is `.t` which returns the seconds-since-epoch component.
- **What was changed:** Replaced `newest.ts.getTime() - oldest.ts.getTime()` with `newest.ts.t - oldest.ts.t`.
- **Why:** `Timestamp.getTime()` is not part of the mongosh BSON Timestamp API. Using it would throw a TypeError at runtime.

### 2. Incorrect `getTime()` on BSON Timestamp in Node.js change stream code
- **What was wrong:** The consumer lag code used `event.clusterTime?.getTime()` to extract the timestamp seconds from a change stream event. The `clusterTime` field is a BSON `Timestamp` object in the Node.js driver, which does not have a `getTime()` method.
- **What was changed:** Replaced `event.clusterTime?.getTime() ?? Date.now() / 1000` with `event.clusterTime?.t ?? Math.floor(Date.now() / 1000)`. Also wrapped the fallback in `Math.floor()` for consistency (both branches now produce integer seconds).
- **Why:** The Node.js BSON `Timestamp` class has `.t` (seconds) and `.i` (increment) properties, or `getHighBits()` as an alternative. `getTime()` does not exist and would throw a TypeError.

## Review Notes
- The Prometheus metric names (`mongodb_mongod_replset_oplog_head_timestamp` / `..._tail_timestamp`) are specific to the percona/mongodb_exporter and may vary across exporter versions. Users of other exporters should check their available metrics.
- The `ChangeStreamHistoryLost` error code name (code 286) applies to MongoDB 4.4+. In earlier versions, the equivalent error was `ChangeStreamFatalError` (code 280). The post does not specify a minimum MongoDB version, which is acceptable since 4.4+ is now the practical baseline.
- The `rs.printReplicationInfo()` output format shown is representative but may differ slightly across MongoDB versions.
