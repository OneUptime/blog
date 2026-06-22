# Validation Summary: How to Set Up Redis Pub/Sub on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- Redis Server and redis-cli
- Redis Pub/Sub
- Redis Streams
- Redis Cluster and Sharded Pub/Sub
- redis-py
- node-redis
- Python
- Node.js
- systemd

## Sources Consulted
- Redis Pub/Sub documentation: https://redis.io/docs/latest/develop/pubsub/
- Redis Streams documentation: https://redis.io/docs/latest/develop/data-types/streams/
- Redis PUBSUB CHANNELS command documentation: https://redis.io/docs/latest/commands/pubsub-channels/
- redis-py Pub/Sub and clustering documentation: https://redis.readthedocs.io/en/stable/advanced_features.html and https://redis.readthedocs.io/en/stable/clustering.html
- Redis node-redis Pub/Sub documentation: https://redis.io/docs/latest/develop/use-cases/pub-sub/nodejs/
- Redis example redis.conf: https://download.redis.io/redis-stable/redis.conf
- Python datetime documentation: https://docs.python.org/3/library/datetime.html

## Issues Found
- Fixed the Redis CLI verification section so `redis-cli ping` is only shown as returning `PONG` when no password is configured; with `requirepass`, authentication is required first.
- Corrected the multi-channel `SUBSCRIBE` output for the third channel from `4) "updates"` to `2) "updates"`.
- Added `redis-cli` subscribed-mode caveats for `UNSUBSCRIBE` and `PUNSUBSCRIBE`, since interactive `redis-cli` exits subscribed mode with `Ctrl-C` rather than accepting typed commands.
- Fixed the node-redis `pSubscribe` examples. Current node-redis callbacks receive `(message, channel)`, so the matched pattern is passed via closure instead of a nonexistent third callback argument.
- Clarified the Redis Lists backup pattern so it does not imply guaranteed exactly-once delivery; the sample can process duplicates unless IDs and deduplication are added.
- Fixed the Redis Cluster setup commands to create both configuration and data directories, use `sudo tee` for files under `/etc`, and start the nodes with `sudo`.
- Updated the redis-py cluster client example to use `ClusterNode` objects for `startup_nodes`, matching current redis-py documentation.
- Replaced deprecated `datetime.utcnow()` with `datetime.now(timezone.utc)` in the message metadata example.

## Review Notes
The post is technically relevant and broadly accurate after the corrections. The examples were checked for Python and JavaScript syntax, but no live Redis server was available in the environment, so Redis command behavior was verified against official documentation rather than by executing a local Redis instance.
