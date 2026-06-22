# Validation Summary: How to Troubleshoot Redis Cluster MOVED/ASK Errors

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Redis
- Redis Cluster
- Redis Cluster MOVED and ASK redirections
- Redis Cluster slot migration and failover commands
- redis-cli cluster management commands
- redis-py
- ioredis
- go-redis
- Python
- JavaScript / Node.js
- Go

## Sources Consulted
- Redis Cluster specification: https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/
- Redis CLUSTER SHARDS command documentation: https://redis.io/docs/latest/commands/cluster-shards/
- Redis CLUSTER SLOTS command documentation: https://redis.io/docs/latest/commands/cluster-slots/
- Redis CLUSTER SETSLOT command documentation: https://redis.io/docs/latest/commands/cluster-setslot/
- Redis CLUSTER INFO command documentation: https://redis.io/docs/latest/commands/cluster-info/
- Redis CLUSTER FAILOVER command documentation: https://redis.io/docs/latest/commands/cluster-failover/
- Redis Cluster scaling and node management guide: https://redis.io/docs/latest/operate/oss_and_stack/management/scaling/
- redis-py clustering documentation: https://redis.readthedocs.io/en/stable/clustering.html
- redis-py 8.0.0 API inspected locally from the PyPI package installed under `/tmp/redis-review`
- Redis go-redis connection documentation: https://redis.io/docs/latest/develop/clients/go/connect/
- ioredis cluster documentation: https://ioredis.readthedocs.io/en/stable/README/

## Issues Found
- Updated the slot distribution command to prefer `CLUSTER SHARDS` in Redis 7.0+ while retaining `CLUSTER SLOTS` as the legacy format. Redis marks `CLUSTER SLOTS` as deprecated and recommends `CLUSTER SHARDS` for new code.
- Added a safety note before using `CLUSTER SETSLOT ... NODE` to clear a stuck migration. This final assignment should only be done after verifying the slot's keys are on the destination node.
- Fixed the Node.js example by removing a duplicate `const Redis = require('ioredis');` declaration in the same code fence, which was a JavaScript syntax error.
- Fixed the Go example by importing `fmt`, checking `err`, and using `val`. The original snippet declared `val` and `err` without using them, which would not compile in Go.
- Replaced redis-py `startup_nodes` dictionaries with `ClusterNode` objects in the monitoring and resilient-client examples. Current redis-py expects `startup_nodes` to be a list of `ClusterNode` instances.
- Replaced the old redis-py `skip_full_coverage_check=True` option with the current `require_full_coverage=False` option.
- Changed the slot-map example from `cluster_slots()` as a "force refresh" to `cluster_shards()` for fetching current topology, and used redis-py's `get_node_from_key()` helper instead of manually parsing an outdated `CLUSTER SLOTS` response shape.
- Made the pipeline example self-contained by adding the missing `RedisCluster` import and client initialization.
- Corrected the common-issues table from `CLUSTER FIX` to `redis-cli --cluster fix`, because `CLUSTER FIX` is not a Redis server command.

## Review Notes
Python code fences were syntax-checked with `ast.parse`, and the JavaScript code fence was checked with `node --check`. Go tooling was not installed in the environment, so the Go snippet was reviewed by inspection against the official go-redis documentation rather than compiled locally. The guide remains operationally illustrative; production recovery from stuck migrations should still be performed with backups, key-location checks, and cluster-specific runbooks.
