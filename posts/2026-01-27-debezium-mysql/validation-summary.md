# Validation Summary: How to Configure Debezium for MySQL

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Debezium MySQL connector
- MySQL binary logging and GTID mode
- Apache Kafka
- Kafka Connect REST API
- Kafka schema history topics
- Change Data Capture (CDC)

## Sources Consulted
- Debezium MySQL connector documentation: https://debezium.io/documentation/reference/stable/connectors/mysql.html
- Debezium releases and tested versions matrix: https://debezium.io/releases/
- MySQL 8.0 `SHOW MASTER STATUS` documentation: https://dev.mysql.com/doc/refman/8.0/en/show-master-status.html
- MySQL 8.4 `SHOW MASTER STATUS` replacement notice: https://dev.mysql.com/doc/refman/8.4/en/show-master-status.html
- MySQL 8.4 `SHOW BINARY LOG STATUS` documentation: https://dev.mysql.com/doc/refman/8.4/en/show-binary-log-status.html
- Apache Kafka topic command usage: https://kafka.apache.org/documentation/#basic_ops_add_topic
- Kafka Connect REST API documentation: https://kafka.apache.org/documentation/#connect_rest

## Issues Found
- The prerequisites listed MySQL 5.7+ and MariaDB 10.2+ as current targets. Updated this to MySQL 8.0+ with a note to verify the tested database matrix for the Debezium release, and noted that current Debezium releases use a separate MariaDB connector.
- The MySQL binlog configuration used `expire_logs_days` as the active setting. Changed the active example to `binlog_expire_logs_seconds`, leaving `expire_logs_days` only as the older-version alternative.
- The verification SQL used only `SHOW MASTER STATUS`, which is unsupported in MySQL 8.4+. Added `SHOW BINARY LOG STATUS` for MySQL 8.4+.
- The Debezium user grants were missing `SHOW DATABASES`, and did not mention `LOCK TABLES` for environments where global read locks are unavailable. Added both, with `LOCK TABLES` shown as conditional.
- The connector snippets were marked as strict JSON while containing `//` comments. Changed the fences to `jsonc` and added a note that comments must be removed before submitting to Kafka Connect.
- The snapshot mode examples used deprecated `schema_only` and `schema_only_recovery`. Updated them to `no_data` and `recovery`.
- The snapshot locking section included unsupported `minimal_percona` and incorrectly described `snapshot.fetch.size` as a cursor/select-all mode. Removed `minimal_percona` and corrected the `snapshot.fetch.size` explanation.
- The production connector example used `heartbeat.topics.prefix`, which is not the current Debezium property. Changed it to `topic.heartbeat.prefix`.
- The production connector example set `snapshot.fetch.size` by default even though Debezium recommends leaving it unset for MySQL unless memory impact is tested. Removed it from the production example and left it as an optional commented property in the snapshot section.
- The troubleshooting section implied MyISAM has limited binlog support. Reworded it to recommend InnoDB and explain that MyISAM tables may require table locks during snapshots.

## Review Notes
- `REPLICATION SLAVE` is still shown in Debezium's MySQL connector documentation, although MySQL terminology has evolved in newer replication commands.
- `snapshot.mode=never` remains documented but is under consideration for future deprecation in favor of `no_data`.
- The schema history setting `schema.history.internal.store.only.captured.tables.ddl=true` is valid, but Debezium recommends retaining the default `false` when you might later add existing tables to the capture list.
