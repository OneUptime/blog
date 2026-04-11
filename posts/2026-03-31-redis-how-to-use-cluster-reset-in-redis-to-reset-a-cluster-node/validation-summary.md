# Validation Summary: How to Use CLUSTER RESET in Redis to Reset a Cluster Node

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Redis (Cluster mode)
- Redis CLI (`redis-cli`)
- redis-py (Python client library)

## Sources Consulted
- Official Redis documentation for CLUSTER RESET: https://redis.io/docs/latest/commands/cluster-reset/
- redis-py source code (v7.0.1) — verified `cluster()` method signature and `parse_cluster_nodes` response callback

## Issues Found

### 1. Incorrect claim that CLUSTER RESET never flushes data
**What was wrong:** The table listed "Flush all data (FLUSHALL): No / No" for both SOFT and HARD resets, and a note stated "CLUSTER RESET does NOT delete the data stored in the node." Per the official Redis documentation, if the node is a replica, CLUSTER RESET flushes its dataset and converts it into an empty master. This applies to both SOFT and HARD resets.

**What was changed:** Replaced the "Flush all data" table row with "Turn replica into empty master (data flushed): Yes / Yes". Rewrote the note to accurately describe the different behaviors for replicas (data flushed) and masters (command refuses to run if keys exist).

### 2. Missing critical restriction: command refuses to run on masters with keys
**What was wrong:** The "Important Cautions" section said "Do not run CLUSTER RESET on a master that still owns hash slots without first migrating them — this will cause a partial cluster and data loss risk." This framed it as a recommendation, but the actual behavior is that the command **returns an error and refuses to execute** on a master that holds any keys. The condition is about having keys, not just having slots.

**What was changed:** Updated the caution to state that CLUSTER RESET will not execute on a master with keys, and that FLUSHALL must be run first. Also replaced the incorrect "flushes only cluster state, not keyspace data" bullet with an accurate description of replica vs. master behavior.

### 3. Python example verified as correct
The `r.cluster('reset', 'soft')` API was verified against redis-py v7.0.1 source. The `Redis.cluster()` method dispatches to `execute_command(f"CLUSTER {cluster_arg.upper()}", *args)`, and the `CLUSTER NODES` response is parsed by `parse_cluster_nodes` into a dict keyed by node ID, making `len(nodes)` correct for counting nodes.

## Review Notes
- The CLI commands (`redis-cli --cluster reshard`, `redis-cli --cluster create`, etc.) are correct and use current syntax.
- The decommissioning workflow (reshard → forget → reset) is a sound operational pattern.
- The post could benefit from mentioning that `CLUSTER RESET` has been available since Redis 3.0.0, but this is not a correctness issue.
- Redis Cloud and Redis Software (Enterprise) do not support the `CLUSTER RESET` command directly, which may be worth noting for readers using managed services.
