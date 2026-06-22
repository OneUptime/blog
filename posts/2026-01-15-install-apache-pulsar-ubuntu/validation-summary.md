# Validation Summary: How to Install Apache Pulsar on Ubuntu

## Status
validated

## Post Type
Tutorial / Installation and configuration guide

## Technologies Covered
- Apache Pulsar 3.3.0 (standalone and clustered)
- Apache BookKeeper
- Apache ZooKeeper
- OpenJDK 17
- Pulsar Java client (producer/consumer)
- Pulsar Python client (`pulsar-client`)
- Pulsar Functions (Python and Java)
- Pulsar SQL (Presto/Trino)
- Prometheus and Grafana monitoring
- systemd service management
- Ubuntu 20.04 / 22.04 / 24.04

## Sources Consulted
- Apache Pulsar Python client API reference — https://pulsar.apache.org/api/python/3.3.x/pulsar.Client.html
- Apache Pulsar Python `ConsumerDeadLetterPolicy` reference — https://pulsar.apache.org/api/python/3.4.x/pulsar.ConsumerDeadLetterPolicy.html
- Managing Namespaces (admin API) — https://pulsar.apache.org/docs/next/admin-api-namespaces/
- Configure metadata store — https://pulsar.apache.org/docs/next/administration-metadata-store/
- Architecture Overview — https://pulsar.apache.org/docs/next/concepts-architecture-overview/
- conf/standalone.conf (apache/pulsar GitHub) — https://github.com/apache/pulsar/blob/master/conf/standalone.conf
- GitHub PR adding RocksdbMetadataStore (#12776) and PR adding Python connection timeout (#11029)

## Issues Found
1. **Python client invalid keyword argument** — The producer example created the client with `connection_timeout_seconds=10`. The Pulsar Python `Client` constructor has no such parameter; the connection timeout is `connection_timeout_ms` (milliseconds, default 10000). Passing an unknown keyword raises a `TypeError`. Fixed to `connection_timeout_ms=10000`.

2. **Python consumer `process_transaction` defined after use** — In `pulsar_consumer.py`, `process_transaction()` was defined at the very bottom of the module, after the `while True` receive loop that calls it. Because the loop runs before execution ever reaches the definition, the first call would raise `NameError` (caught by the surrounding `except`, causing every message to be negatively acknowledged). Moved the function definition above the client/consumer setup so it is defined before it is called.

3. **Standalone mode metadata store inaccuracy** — The post stated that standalone mode runs "broker, bookie, ZooKeeper" and that `pulsar standalone` "starts ZooKeeper, BookKeeper, and a Pulsar broker." As of Pulsar 2.10+/3.x, standalone mode uses an embedded RocksDB local metadata store by default, not ZooKeeper (ZooKeeper requires `PULSAR_STANDALONE_USE_ZOOKEEPER=1`). Updated the prose and the inline comment to refer to a local metadata store / embedded RocksDB.

4. **Invalid admin command `namespaces get-bundle-state`** — The health-check section used `pulsar-admin namespaces get-bundle-state`, which is not a valid subcommand. Replaced with `pulsar-admin namespaces policies my-company/payments`, which is the valid command that reports namespace policies and bundle configuration.

## Review Notes
- The Java producer/consumer examples use current, correct client-builder APIs (`Schema.STRING`, `batchingMaxPublishDelay`, `ackTimeout`, `negativeAckRedeliveryDelay`, `DeadLetterPolicy.builder()`), and the Python `ConsumerDeadLetterPolicy` / `send(..., partition_key=...)` usage is valid.
- The download URL (`archive.apache.org/dist/pulsar/pulsar-3.3.0/...`), Java 17 requirement, default ports (6650 binary, 8080 web, 3181 bookie, 8000 bookie HTTP, 6750 functions worker), and admin/CLI commands (`tenants create`, `namespaces set-retention`, `topics create-partitioned-topic`, `pulsar-client produce/consume`, `pulsar initialize-cluster-metadata`, `bookkeeper shell metaformat/listbookies`, `pulsar tokens create`) are all accurate for Pulsar 3.x.
- Minor, non-blocking: the production cluster config uses the older `zookeeperServers` / `configurationStoreServers` / `--zookeeper` keys, which are deprecated in favor of `metadataStoreUrl` / `configurationMetadataStoreUrl` / `--metadata-store` but remain functional in 3.x. The Grafana install uses the deprecated `apt-key add` method, which still works on supported Ubuntu releases. These were left as-is since they are valid, just not the newest idiom.
