# Validation Summary: How to Monitor MongoDB Performance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- MongoDB server monitoring commands
- MongoDB database profiler
- MongoDB Database Tools (`mongostat`, `mongotop`)
- MongoDB replica sets
- Percona MongoDB Exporter
- Prometheus
- Grafana
- Node.js MongoDB driver

## Sources Consulted
- MongoDB `serverStatus` command documentation: https://www.mongodb.com/docs/manual/reference/command/serverStatus/
- MongoDB `currentOp` command documentation: https://www.mongodb.com/docs/manual/reference/command/currentOp/
- MongoDB database profiler documentation: https://www.mongodb.com/docs/manual/tutorial/manage-the-database-profiler/
- MongoDB `collStats` command documentation: https://www.mongodb.com/docs/manual/reference/command/collStats/
- MongoDB `$collStats` aggregation stage documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/collStats/
- MongoDB `mongostat` documentation: https://www.mongodb.com/docs/database-tools/mongostat/
- MongoDB `mongotop` documentation: https://www.mongodb.com/docs/database-tools/mongotop/
- MongoDB Node.js driver `MongoClient` documentation: https://www.mongodb.com/docs/drivers/node/current/connect/mongoclient/
- Percona MongoDB Exporter README and reference: https://github.com/percona/mongodb_exporter

## Issues Found
- Replaced `db.collection.stats()` examples with `$collStats` aggregation examples because the underlying `collStats` command is deprecated in MongoDB 6.2 and later.
- Updated the Percona MongoDB Exporter image from `0.40` to `0.51` and used the current `--mongodb.uri` option shown in the exporter documentation.
- Corrected connection utilization PromQL to divide current connections by current plus available connections. Dividing current by available does not calculate utilization.
- Replaced the WiredTiger cache hit ratio query with a read-hit ratio based on pages requested from cache and pages read into cache. The original formula mixed read-into-cache and write-from-cache byte counters and did not represent cache hits.
- Corrected query targeting efficiency to compare scanned objects against returned documents using rates of the relevant counters.
- Fixed Grafana panel PromQL quoting and changed the replication lag legend from a nonexistent `member` label to the exporter-provided `name` label.
- Wrapped the CommonJS Node.js monitoring script usage in an async `main()` function because top-level `await` is not valid in CommonJS files.
- Replaced the `MongoDBNoPrimary` alert expression with one based on `mongodb_mongod_replset_my_state`; the referenced `mongodb_mongod_replset_member_state` metric is not provided by the current Percona exporter compatibility metrics.

## Review Notes
The Prometheus examples assume Percona MongoDB Exporter compatibility mode is enabled, as shown in the Docker Compose snippet. Without compatibility mode, several metric names and labels use the exporter's newer naming scheme.
