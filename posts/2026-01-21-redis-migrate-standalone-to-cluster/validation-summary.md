# Validation Summary: How to Migrate from Standalone Redis to Redis Cluster

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- Redis Open Source
- Redis Cluster
- redis-cli cluster management
- redis-py / RedisCluster
- Python
- Redis Lua scripting
- Redis DUMP/RESTORE
- Redis Pub/Sub and sharded Pub/Sub

## Sources Consulted
- Redis Cluster specification: https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/
- Redis Cluster scaling and redis-cli cluster import documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/scaling/
- Redis RESTORE command documentation: https://redis.io/docs/latest/commands/restore/
- Redis Pub/Sub documentation, including sharded Pub/Sub: https://redis.io/docs/latest/develop/pubsub/
- redis-py clustering documentation: https://redis.readthedocs.io/en/stable/clustering.html
- redis-py advanced features documentation for cluster pipelines and transactions: https://redis.readthedocs.io/en/stable/advanced_features.html
- redis-py command reference for cluster multi-key behavior: https://redis.readthedocs.io/en/stable/commands.html

## Issues Found
- The key analysis Python snippet used `re.sub()` without importing `re`. Added `import re`.
- The UUID normalization ran after digit replacement, so UUIDs would be altered before the UUID regex could match. Reordered the regex substitutions to replace UUIDs first.
- The key analysis snippet contained an unused `multi_key_commands` variable. Removed it to keep the example clean and executable.
- The Redis Cluster Pub/Sub comparison incorrectly described cluster Pub/Sub as per-node by default. Updated it to state that classic Pub/Sub uses global fan-out and sharded Pub/Sub is per shard.
- "Method 2: Using MIGRATE Command" did not use the Redis `MIGRATE` command; it copied values type by type through client commands. Renamed the section and docstring to accurately describe the code.
- The DUMP/RESTORE snippet caught `redis.ResponseError` but did not import `redis` in that standalone example. Added `import redis`.
- The Redis Cluster transaction example used `rc.pipeline()` while describing transactions. Updated it to `rc.pipeline(transaction=True)` so it matches redis-py's documented transaction pipeline behavior for same-slot keys.
- The key-slot grouping example imported `get_key_slot`, which is not the documented redis-py client API. Replaced it with `rc.keyslot(key)`.

## Review Notes
- The migration examples cover common Redis core data types but do not handle streams, modules, ACL/auth variants, or absolute expiration options. That is acceptable for the current scope, but production migrations should account for any non-covered data types and operational constraints.
- `redis-cli` was not installed in the local environment, so CLI flags were verified against Redis documentation rather than local `--help` output.
