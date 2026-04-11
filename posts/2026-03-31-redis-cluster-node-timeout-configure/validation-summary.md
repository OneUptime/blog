# Validation Summary: How to Configure Redis cluster-node-timeout

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Redis Cluster
- Redis CLI (`redis-cli`)
- Redis configuration (`redis.conf`)
- Redis commands: `CONFIG SET`, `CONFIG GET`, `CLUSTER NODES`, `DEBUG SLEEP`

## Sources Consulted
- Redis Cluster Specification (https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/) — failover process, PFAIL/FAIL state transitions, election delay formula, replica validity
- Redis Cluster Tutorial / Scaling (https://redis.io/docs/latest/operate/oss_and_stack/management/scaling/) — cluster setup and configuration
- Redis 7.2 source code (`src/config.c`) — default values and MODIFIABLE_CONFIG flag for cluster-node-timeout and cluster-replica-validity-factor
- Redis 7.2 default `redis.conf` — default values and configuration comments for cluster-node-timeout and cluster-replica-validity-factor

## Issues Found

### 1. Incorrect description of failover trigger mechanism
- **What was wrong:** The "Failover trigger" bullet stated: "Replicas wait `cluster-node-timeout * cluster-replica-validity-factor` before attempting election." This conflates two different mechanisms. The formula `cluster-node-timeout * cluster-replica-validity-factor` determines replica **validity/eligibility** (whether a replica's data is fresh enough to participate in failover at all), not the election delay timing. The actual election delay is `500ms + random(0, 500ms) + REPLICA_RANK * 1000ms`.
- **What was changed:** Replaced with accurate description: "PFAIL reports from a majority of masters within a `cluster-node-timeout * 2` window promote the state to FAIL, starting replica election."
- **Why:** The original text would mislead readers into thinking the election delay is controlled by the validity factor, which is incorrect per the Redis Cluster Specification.

### 2. Unsupported claim about slot migration abort timing
- **What was wrong:** The "Migration safety" bullet stated: "During slot migration, the `cluster-node-timeout` determines how long to wait before aborting." Neither the Redis Cluster Specification nor official documentation supports a direct relationship between `cluster-node-timeout` and slot migration abort timing. The `MIGRATE` command has its own separate timeout parameter.
- **What was changed:** Replaced with a "Replica validity" bullet describing the actual behavior controlled by `cluster-node-timeout * cluster-replica-validity-factor` — that replicas disconnected longer than this threshold are excluded from failover elections. This is accurate and more useful information for the "What cluster-node-timeout Controls" section.
- **Why:** The original claim was not supported by documentation and could mislead readers about migration behavior.

## Review Notes
- The `DEBUG SLEEP` command used in the failover test example is an internal/debugging command that may be disabled or restricted in production Redis deployments (e.g., via `rename-command`). Readers should be aware this is for testing only.
- The post correctly notes that `CONFIG SET` applies the change at runtime but does not mention `CONFIG REWRITE` to persist the change to the config file. This is a minor omission but not incorrect.
- The `CLUSTER NODES` output example is illustrative and uses simplified node IDs (`a1b2c3...`), which is fine for a tutorial context.
