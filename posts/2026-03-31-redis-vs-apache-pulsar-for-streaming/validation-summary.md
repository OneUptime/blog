# Validation Summary: Redis vs Apache Pulsar for Streaming

## Status
validated

## Post Type
Comparison / Reference

## Technologies Covered
- Redis Streams (CLI and redis-py Python client)
- Apache Pulsar (pulsar-admin CLI and pulsar-client Python library)
- Apache BookKeeper (mentioned as Pulsar's storage layer)

## Sources Consulted
- Redis Streams commands reference: https://redis.io/docs/latest/commands/?group=stream
- redis-py `xreadgroup` API: https://redis-py.readthedocs.io/en/stable/commands.html#redis.commands.stream.StreamCommands.xreadgroup
- Apache Pulsar admin CLI reference: https://pulsar.apache.org/docs/next/reference-pulsar-admin/
- Apache Pulsar Python client docs: https://pulsar.apache.org/docs/next/client-libraries-python/
- Apache Pulsar concepts (multi-tenancy, tiered storage, geo-replication): https://pulsar.apache.org/docs/next/concepts-overview/

## Issues Found
1. **redis-py `xreadgroup` call used Redis CLI syntax instead of Python API** (line 36-37): The original code was `r.xreadgroup("GROUP", "processors", "worker1", count=50, block=5000, streams={"events": ">"})`. The Python method signature is `xreadgroup(groupname, consumername, streams, count, block, noack)` -- there is no `"GROUP"` string prefix (that is Redis CLI syntax). Additionally, passing `"worker1"` as the third positional argument would conflict with the `streams` keyword argument, causing a `TypeError: got multiple values for argument 'streams'`. Fixed to: `r.xreadgroup("processors", "worker1", streams={"events": ">"}, count=50, block=5000)`.

## Review Notes
- The `pulsar-admin topics set-retention` command is valid in Pulsar 3.x which introduced topic-level policies. In earlier Pulsar versions, retention was only configurable at the namespace level via `pulsar-admin namespaces set-retention`. The post does not specify a Pulsar version, so readers on older versions may need to adjust.
- The "Ops complexity" row lists "ZooKeeper + BookKeeper + Brokers" for Pulsar. This is accurate for traditional deployments, but Pulsar 3.x+ can optionally run without ZooKeeper using alternative metadata stores (e.g., Oxia or the built-in metadata store).
- The throughput comparison (~100K msg/sec for Redis vs millions for Pulsar) compares a single Redis instance to a Pulsar cluster. Redis Streams on a single instance can exceed 100K msg/sec in many benchmarks; the number is conservative. Throughput depends heavily on message size, persistence settings, and hardware.
- The "Delayed messages: up to 100 years" claim for Pulsar is based on the timestamp-based delay mechanism. While technically possible given the long data type used, it is not a formally documented guarantee.
