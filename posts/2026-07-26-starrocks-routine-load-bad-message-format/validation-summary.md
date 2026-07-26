# Validation Summary: Why Does StarRocks Routine Load Say “Bad Message Format”?

## Status

validated

## Post Type

Troubleshooting guide

## Technologies Covered

- StarRocks Routine Load
- Apache Kafka broker metadata and advertised listeners
- DNS, `/etc/hosts`, and the Linux Name Service Switch
- kcat and librdkafka
- TLS/SSL and OpenSSL
- SASL
- JSON, CSV, and Avro ingestion
- Confluent Schema Registry

## Sources Consulted

- [StarRocks Routine Load FAQ](https://docs.starrocks.io/docs/faq/loading/Routine_load_faq/)
- [StarRocks: Load data using Routine Load](https://docs.starrocks.io/docs/loading/RoutineLoad/)
- [StarRocks: CREATE ROUTINE LOAD](https://docs.starrocks.io/docs/sql-reference/sql-statements/loading_unloading/routine_load/CREATE_ROUTINE_LOAD/)
- [StarRocks: SHOW ROUTINE LOAD](https://docs.starrocks.io/docs/sql-reference/sql-statements/loading_unloading/routine_load/SHOW_ROUTINE_LOAD/)
- [StarRocks: SHOW ROUTINE LOAD TASK](https://docs.starrocks.io/docs/sql-reference/sql-statements/loading_unloading/routine_load/SHOW_ROUTINE_LOAD_TASK/)
- [StarRocks: RESUME ROUTINE LOAD](https://docs.starrocks.io/docs/sql-reference/sql-statements/loading_unloading/routine_load/RESUME_ROUTINE_LOAD/)
- [StarRocks: Loading concepts](https://docs.starrocks.io/docs/loading/loading_introduction/loading_concepts/)
- [Apache Kafka 4.3 broker configurations](https://kafka.apache.org/43/configuration/broker-configs/)
- [Apache Kafka 4.3 consumer configurations](https://kafka.apache.org/43/generated/consumer_config.html)
- [kcat project documentation](https://github.com/edenhill/kcat)
- [librdkafka configuration reference](https://docs.confluent.io/platform/current/clients/librdkafka/html/md_CONFIGURATION.html)
- [OpenSSL 3.6 `s_client` documentation](https://docs.openssl.org/3.6/man1/openssl-s_client/)
- [Linux `getent(1)` manual page](https://man7.org/linux/man-pages/man1/getent.1.html)
- [Linux `nsswitch.conf(5)` manual page](https://man7.org/linux/man-pages/man5/nsswitch.conf.5.html)
- [OpenBSD `nc(1)` manual page](https://man.openbsd.org/nc)

## Issues Found

- The `SHOW ROUTINE LOAD TASK` examples did not specify the `ingestion` database. Unlike `SHOW ROUTINE LOAD FOR ingestion.kafka_orders`, the task statement accepts the database through a `FROM` clause and otherwise depends on the current session database. Both examples now use `SHOW ROUTINE LOAD TASK FROM ingestion WHERE JobName = 'kafka_orders';`.
- The description of `getent` implied that DNS and `/etc/hosts` are always both consulted. It now states that `getent` uses the Name Service Switch path configured in `/etc/nsswitch.conf`, which commonly includes those sources.
- The OpenSSL example supplied SNI and a CA file but did not perform hostname matching, and `s_client` can continue after certificate verification errors by default. The command now uses `-verify_hostname` and `-verify_return_error` so it verifies both the advertised DNS identity and the certificate chain.

## Review Notes

- The central diagnosis matches the current StarRocks Routine Load FAQ: for this specific error, StarRocks recommends adding Kafka hostname resolution on every server that hosts a StarRocks node.
- The bootstrap-versus-advertised-endpoint explanation matches Kafka 4.3 client and broker documentation.
- StarRocks' current documentation confirms that Routine Load tasks execute on BEs or CNs, that resumed jobs transition through `NEED_SCHEDULE`, and that JSON, CSV, and Avro properties discussed in the post are current. Avro Routine Load support requires StarRocks v3.0.1 or later.
- The shell examples assume Linux userland for `getent`; `nc` option behavior can vary among netcat implementations.
