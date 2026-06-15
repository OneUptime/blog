# Validation Summary: How to Fix 'Redis is loading the dataset' Errors

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Redis Open Source
- Redis persistence: RDB and AOF
- Redis CLI and Redis server configuration
- Redis Sentinel
- Redis Cluster
- redis-py
- Kubernetes readiness probes
- Python
- Bash

## Sources Consulted
- Redis INFO command documentation: https://redis.io/docs/latest/commands/info/
- Redis persistence documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/
- Redis Sentinel documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/
- Redis CLUSTER FAILOVER command documentation: https://redis.io/docs/latest/commands/cluster-failover/
- Redis CLI documentation: https://redis.io/docs/latest/develop/tools/cli/
- redis-py production usage documentation: https://redis.io/docs/latest/develop/clients/redis-py/produsage/
- redis-py connection and RedisCluster API documentation: https://redis.readthedocs.io/en/stable/connections.html
- Kubernetes probe documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/

## Issues Found
- The redis-py connection example used `retry_on_timeout=True`, which is deprecated in current redis-py guidance and does not directly retry `BusyLoadingError`. Updated the example to use `Retry`, `ExponentialBackoff`, and `retry_on_error=[BusyLoadingError]`.
- The Kubernetes readiness probe relied on `redis-cli ping` alone. Updated it to explicitly require a `PONG` response so the exec probe succeeds only when Redis is ready to serve requests.
- The persistence configuration block mixed shell commands with raw `redis.conf` directives under a `bash` fence, and said "Both" modes used RDB for loading. Updated the examples to use `redis-cli CONFIG SET` where shown as shell commands and clarified that when AOF is enabled Redis loads AOF; with `aof-use-rdb-preamble`, the rewritten AOF base is RDB-formatted.
- The AOF preamble explanation said Redis writes the "initial data" as RDB. Clarified that the rewritten AOF base is RDB-formatted and subsequent commands are appended as AOF.
- The disk I/O section stated loading is always disk-bound. Softened this to "often disk I/O-bound" because CPU and memory also affect load time.
- Two `CONFIG SET` commands in a shell block omitted `redis-cli`. Added `redis-cli` so the commands are runnable from a terminal.
- The Sentinel description implied a replica can directly serve in place of a loading primary. Updated the wording to describe Sentinel promotion when the primary remains unavailable.
- The RedisCluster example used the older `skip_full_coverage_check` parameter. Updated it to current redis-py `require_full_coverage=False`.
- The rolling restart example ran `CLUSTER FAILOVER TAKEOVER` against the node being restarted, but Redis Cluster failover must be issued to a replica. Updated the example to run failover on a replica before restarting the target node.
- The standalone Python snippets for graceful degradation and replica reads omitted required imports. Added `time`, `redis`, `BusyLoadingError`, and redis-py `ConnectionError` imports where needed.
- The RDB snapshots section claimed more frequent snapshots mean smaller AOF replay. Updated it to say regular RDB snapshots keep a recent compact dump available, while AOF replay size is addressed by AOF rewrites.
- The automatic AOF rewrite settings were shown as raw config directives in a `bash` block. Updated them to `redis-cli CONFIG SET` commands.

## Review Notes
- The Kubernetes readiness probe and Redis loading progress fields are consistent with current official documentation.
- The rolling restart script remains illustrative and assumes a predictable replica hostname such as `redis-1-replica`; production automation should discover the replica for each primary before issuing `CLUSTER FAILOVER`.
