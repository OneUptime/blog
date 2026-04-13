# Validation Summary: How to Use Debezium for MongoDB Change Data Capture

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (replica set, Change Streams)
- Debezium MongoDB Connector 2.x
- Apache Kafka
- Kafka Connect
- Python (kafka-python consumer)
- Debezium JDBC Sink Connector
- PostgreSQL (as sync target)

## Sources Consulted
- Debezium MongoDB Connector Documentation: https://debezium.io/documentation/reference/stable/connectors/mongodb.html
- Debezium 2.0 Release Notes (oplog removal): https://debezium.io/releases/2.0/release-notes
- Debezium 2.0.0.Alpha2 Blog Post: https://debezium.io/blog/2022/06/09/debezium-2.0-alpha2-released/
- Debezium JDBC Connector Documentation: https://debezium.io/documentation/reference/stable/connectors/jdbc.html
- Debezium MongoDB Connector source code (MongoDbConnectorConfig.java capture mode enum): https://github.com/debezium/debezium/blob/main/debezium-connector-mongodb/src/main/java/io/debezium/connector/mongodb/MongoDbConnectorConfig.java

## Issues Found

### 1. Incorrect claim that Debezium 2.x reads the oplog directly (Critical)
- **What was wrong:** The Overview stated "Debezium reads MongoDB's oplog to capture every insert, update, delete, and collection event" and "Debezium reads directly from the oplog." The architecture diagram labeled the source as "MongoDB Oplog." Step 1 said "Debezium requires a replica set to read the oplog." The Summary said "captures every change via the oplog." These are all incorrect for Debezium 2.x — oplog-based capture was deprecated in Debezium 1.8 and removed entirely in Debezium 2.0. The connector exclusively uses MongoDB Change Streams in 2.x.
- **What was changed:** Updated all four locations to reference Change Streams instead of oplog. The Overview was rewritten to accurately describe the Change Streams-based architecture. The architecture diagram now shows "MongoDB Change Streams (replica set)." Step 1 text and Summary were updated accordingly.
- **Why:** The post uses Debezium 2.4.2.Final and configures `capture.mode: change_streams_update_full`, which is a Change Streams mode. The prose was contradicting the actual configuration and the capabilities of the version being used.

## Review Notes
- The MongoDB user roles (`read` on `local`, `readAnyDatabase` on `admin`) are sufficient for a basic replica set setup. For sharded clusters, a `read` role on the `config` database would also be needed, but this is outside the scope of this tutorial.
- All connector configuration property names (`mongodb.connection.string`, `topic.prefix`, `database.include.list`, `collection.include.list`, `capture.mode`, `snapshot.mode`) are correct for Debezium 2.x.
- The Debezium event envelope format is accurately represented, including the `after` field as a JSON string (correct for the MongoDB connector's default behavior).
- The Python consumer code correctly parses the JSON string `after`/`before` fields with `json.loads()`.
- The JDBC Sink Connector class name (`io.debezium.connector.jdbc.JdbcSinkConnector`) and configuration are correct.
- The `kafka-python` library used in Step 6 has been in maintenance mode. Users may want to consider `confluent-kafka` as an alternative, but the code is functionally correct.
