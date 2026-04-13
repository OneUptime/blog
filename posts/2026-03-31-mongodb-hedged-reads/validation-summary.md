# Validation Summary: How to Use Hedged Reads in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (sharded clusters, mongos)
- MongoDB hedged reads
- MongoDB read preferences
- MongoDB Node.js driver
- MongoDB serverStatus / hedgingMetrics

## Sources Consulted
- MongoDB Manual: Hedged Reads — https://www.mongodb.com/docs/manual/core/hedged-reads/
- MongoDB Manual: Read Preference Hedge Option — https://www.mongodb.com/docs/manual/core/read-preference-hedge-option/
- MongoDB Manual: Connection String URI Format — https://www.mongodb.com/docs/manual/reference/connection-string/
- MongoDB Manual: serverStatus hedgingMetrics — https://www.mongodb.com/docs/manual/reference/command/serverStatus/
- MongoDB Node.js Driver: ReadPreference API — https://mongodb.github.io/node-mongodb-native/

## Issues Found

1. **`replicaSet` parameter in mongos connection URIs**: The post included `replicaSet=rs0` in two connection string examples targeting mongos routers. The `replicaSet` option is for direct connections to replica set members, not for mongos. Removed the incorrect parameter from the Node.js driver example URI and replaced it with a proper mongos URI (`mongodb://mongos1:27017,mongos2:27017/myapp`).

2. **Connection string claiming to enable hedged reads**: The post showed a standalone connection string as a way to enable hedged reads, but the `hedge` option is not a valid connection string parameter — it can only be set programmatically through driver APIs. Replaced the misleading connection string example with a note explaining that `nearest` has hedging enabled by default on mongos since MongoDB 4.4, and that other read preferences require programmatic configuration.

3. **Typo in hedgingMetrics field name**: The post used `numAdvantageousHedgedOperations` (2 occurrences) but the correct field name is `numAdvantageouslyHedgedOperations` (with "ly"). Fixed both occurrences.

## Review Notes
- Hedged reads were deprecated in MongoDB 8.0 and removed in MongoDB 8.1. The post does not mention a specific MongoDB version, but readers targeting MongoDB 8.0+ should be aware that the server will ignore hedging options. This may warrant a deprecation notice in the future.
- The tail latency probability math (0.05 * 0.05 = 0.25%) is correct assuming independence between node performance, which is a reasonable simplification for illustration purposes.
- The overall explanation of hedged reads, compatible read preferences, mongos implementation, and hedgingMetrics is accurate and well-presented.
