# Validation Summary: How to Set Up Debezium for Change Data Capture on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Debezium
- Apache Kafka
- Kafka Connect
- PostgreSQL logical replication
- MySQL binary logging
- Change data capture
- Kafka Connect Single Message Transforms

## Sources Consulted
- Debezium PostgreSQL connector documentation: https://debezium.io/documentation/reference/stable/connectors/postgresql.html
- Debezium MySQL connector documentation: https://debezium.io/documentation/reference/3.4/connectors/mysql.html
- Debezium installation documentation: https://debezium.io/documentation/reference/stable/install.html
- Debezium event flattening SMT documentation: https://debezium.io/documentation/reference/stable/transformations/event-flattening.html
- Apache Kafka Connect REST API documentation: https://kafka.apache.org/10/kafka-connect/user-guide/
- MySQL binary logging options documentation: https://dev.mysql.com/doc/mysql-replication-excerpt/8.0/en/replication-options-binary-log.html
- Maven Central Debezium connector plugin archive URLs were checked with HTTP HEAD requests.

## Issues Found
- The PostgreSQL setup opened an interactive `psql` session before continuing with shell commands, which would interrupt the command sequence. Removed the stray interactive command.
- The PostgreSQL grants and publication setup did not explicitly connect to the `myapp` database used by the connector. Updated the command to run `psql -d myapp`.
- The PostgreSQL connector referenced `publication.name` but did not create that publication or grant the connector sufficient publication creation privileges. Added a `CREATE PUBLICATION debezium_pub` statement and set `publication.autocreate.mode` to `disabled` so Debezium uses the administrator-created publication.
- The MySQL configuration used `expire_logs_days`, which MySQL documents as deprecated. Replaced it with `binlog_expire_logs_seconds = 604800`.
- The PostgreSQL connector update in the SMT section omitted `publication.name`, so the full config replacement would fall back to Debezium's default publication name. Added `publication.name` and `publication.autocreate.mode` to preserve the original connector behavior.
- The Kafka console consumer example piped up to five JSON records into `python3 -m json.tool`, which expects a single JSON document. Changed the example to consume one message for pretty-print verification.

## Review Notes
- The MySQL grants match Debezium's documented baseline privileges. Hosted MySQL environments that cannot use global read locks may also need `LOCK TABLES`.
- The Debezium connector version in the examples, `2.5.0.Final`, is older than the current stable documentation, but the referenced connector properties and plugin archive URLs remain valid.
