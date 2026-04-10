# Validation Summary: Redis vs etcd for Distributed Configuration

## Status
validated

## Post Type
Comparison Guide

## Technologies Covered
- Redis (key-value store, pub/sub, keyspace notifications)
- etcd (distributed key-value store, Raft consensus)
- etcdctl CLI (v3 API)
- redis-cli / redis-py Python client
- python-etcd3 Python client
- Raft consensus algorithm
- Redis Cluster / Sentinel replication

## Sources Consulted
- etcd official documentation for etcdctl v3 commands: https://etcd.io/docs/v3.5/dev-guide/interacting_v3/
- etcd transaction documentation: https://etcd.io/docs/v3.5/dev-guide/interacting_v3/#transaction
- etcd lease documentation: https://etcd.io/docs/v3.5/dev-guide/leases/
- Redis SET command documentation: https://redis.io/docs/latest/commands/set/
- Redis keyspace notifications documentation: https://redis.io/docs/latest/develop/use/keyspace-notifications/
- Redis EVAL command documentation: https://redis.io/docs/latest/commands/eval/
- python-etcd3 client API: https://python-etcd3.readthedocs.io/
- redis-py client API: https://redis-py.readthedocs.io/

## Issues Found

### Issue 1: Incorrect etcdctl flag for serializable reads
- **What was wrong:** The command `etcdctl get /config/db/host --consistency=serializable` used a non-existent `--consistency` flag with a string value.
- **What was changed:** Corrected to `etcdctl get /config/db/host --serializable`, which is the correct boolean flag in etcdctl v3 for performing serializable (non-linearizable) reads.
- **Why:** etcdctl v3 does not accept `--consistency=serializable`. The `--serializable` flag is a standalone boolean flag that switches the read from the default linearizable mode to serializable mode.

### Issue 2: Incorrect etcdctl txn interactive format
- **What was wrong:** The `etcdctl txn` heredoc used a YAML-like format with `compares:` and `success requests:` labels and bulleted list items (`- value(...)`, `- put ...`). This is not a valid format for `etcdctl txn`.
- **What was changed:** Corrected to the actual interactive format: comparison lines followed by a blank line, then success request lines followed by a blank line, then (implicitly empty) failure request lines followed by a blank line.
- **Why:** `etcdctl txn` reads input interactively in three sections separated by blank lines: (1) comparisons, (2) success requests, (3) failure requests. It does not accept YAML labels or dash-prefixed entries.

## Review Notes
- The etcd3 Python client (`python-etcd3`) API usage for watches and elections is correct. The `watch_prefix`, `election`, `campaign`, and `resign` methods are all valid.
- The Redis Lua scripts for CAS and leadership renewal are logically correct and follow best practices for atomic operations.
- The characterization of Redis keyspace notifications as "best-effort" is accurate — they use pub/sub internally and do not buffer missed events.
- The etcd lease grant output parsing with `awk '{print $2}'` is fragile and depends on the exact output format, but is a common pattern in examples and is functionally correct for standard etcdctl output.
- The `etcdctl lease keep-alive` command is correctly shown as a long-running process that must stay active for the lease to persist.
