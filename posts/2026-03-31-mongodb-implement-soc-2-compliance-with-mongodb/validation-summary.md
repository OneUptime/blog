# Validation Summary: How to Implement SOC 2 Compliance with MongoDB

## Status
validated

## Post Type
Guide

## Technologies Covered
- MongoDB (createUser, TLS configuration, audit logging, encryption at rest)
- MongoDB Enterprise features (audit logging, encryption at rest)
- SCRAM-SHA-256 authentication
- Prometheus alerting rules
- mongodump / mongorestore
- Python 3 (audit log parsing)

## Sources Consulted
- MongoDB documentation: `db.createUser()` — mechanisms, passwordDigestor, and roles fields (https://www.mongodb.com/docs/manual/reference/method/db.createUser/)
- MongoDB documentation: Audit Log format and Extended JSON timestamp structure (https://www.mongodb.com/docs/manual/core/auditing/)
- MongoDB documentation: mongod.conf TLS and encryption at rest configuration (https://www.mongodb.com/docs/manual/reference/configuration-options/)
- MongoDB documentation: `setParameter` for `auditAuthorizationSuccess` (https://www.mongodb.com/docs/manual/reference/parameters/)
- Prometheus alerting rules syntax (https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)
- MongoDB documentation: mongodump and mongorestore (https://www.mongodb.com/docs/database-tools/)

## Issues Found

1. **Incorrect audit log timestamp key** (line 118): The Python script used `doc['ts']['date']` to access the timestamp in MongoDB audit log JSON entries. MongoDB Extended JSON uses the `$date` key, so the correct access is `doc['ts']['$date']`. The original code would raise a `KeyError` at runtime. Fixed to `doc['ts']['$date']`.

2. **Mixed mongosh/Node.js driver syntax** (line 135): The change management code example used `await db.collection('schema_changes').insertOne(...)`, which is Node.js driver syntax. The rest of the post consistently uses mongosh shell syntax. Changed to `db.schema_changes.insertOne(...)` for consistency. In mongosh, promises are auto-awaited and collections are accessed as properties of `db`.

## Review Notes
- `datetime.utcnow()` in the Python audit log parsing script is deprecated as of Python 3.12 in favor of `datetime.now(datetime.UTC)`. It still functions correctly but will emit a deprecation warning on Python 3.12+.
- Audit logging (`auditLog` configuration) and encryption at rest (`security.enableEncryption`) are MongoDB Enterprise-only features. The encryption section notes this in a comment, but the audit logging section does not explicitly call this out.
- The Prometheus metric name `mongodb_mongod_replset_member_replication_lag` is specific to the exporter in use and may vary across different MongoDB Prometheus exporters.
