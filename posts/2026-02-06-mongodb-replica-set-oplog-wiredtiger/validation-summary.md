# Validation Summary: How to Monitor MongoDB Replica Set Health, Oplog Window, and WiredTiger Cache

## Status
validated

## Post Type
Tutorial / monitoring guide

## Technologies Covered
- MongoDB replica sets
- MongoDB oplog
- WiredTiger cache
- OpenTelemetry Collector
- OpenTelemetry Collector MongoDB receiver
- Docker Compose
- YAML
- mongosh JavaScript snippets

## Sources Consulted
- OpenTelemetry Collector MongoDB receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/mongodbreceiver/README.md
- OpenTelemetry Collector MongoDB receiver metadata: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/mongodbreceiver/metadata.yaml
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- MongoDB replica set member states documentation: https://www.mongodb.com/docs/manual/reference/replica-states/
- MongoDB rs.status() documentation: https://www.mongodb.com/docs/manual/reference/method/rs.status/
- MongoDB replSetGetStatus documentation: https://www.mongodb.com/docs/manual/reference/command/replSetGetStatus/
- MongoDB replica set oplog documentation: https://www.mongodb.com/docs/manual/core/replica-set-oplog/
- MongoDB BSON Timestamp documentation: https://www.mongodb.com/docs/current/reference/bson-types/#timestamps
- MongoDB serverStatus documentation: https://www.mongodb.com/docs/manual/reference/command/serverStatus/

## Issues Found
- The Collector config used `${MONGODB_PASSWORD}`. Updated it to `${env:MONGODB_PASSWORD}` to match current OpenTelemetry Collector environment variable expansion syntax.
- The post referenced `mongodb.replication.lag` as though it were emitted by the MongoDB receiver. The receiver metadata does not list that metric, so the example now uses `custom.mongodb.replication.lag` to make clear it must come from a custom script or transform.
- The oplog window snippet called `getTime()` on BSON Timestamp values. BSON Timestamp stores seconds in the high 32 bits, so the calculation now uses `getHighBits()`.
- The cache metric examples used unsupported `mongodb.cache.operations` attribute values `read_into` and `written_from`. The receiver metadata defines `type` as `hit` or `miss`, so the examples were corrected.
- The cache hit ratio formula referenced `pages_found_in_cache`, which is not the serverStatus field documented for WiredTiger cache. The formula now uses `pages_requested_from_cache`.
- Alert examples used non-receiver metric names for member state, replication lag, oplog window, and WiredTiger cache pressure. These were renamed with a `custom.mongodb.*` prefix to distinguish custom metrics from receiver-emitted metrics.
- The high connection alert did not specify the MongoDB receiver's connection type attribute. Updated it to use `mongodb.connection.count{type="active"}`.

## Review Notes
The Docker Compose example remains a minimal topology sketch rather than a complete, ready-to-run replica set bootstrap. A production-ready example would also initialize the replica set and create the monitoring user, but the post already presents those steps separately.
