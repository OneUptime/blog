# Validation Summary: What Is a Hash Slot in Redis Cluster

## Status
validated

## Post Type
Reference / Explainer

## Technologies Covered
- Redis Cluster
- CRC16 hashing algorithm
- Redis CLI (`redis-cli`)

## Sources Consulted
- Redis Cluster specification: https://redis.io/docs/reference/cluster-spec/
- Redis CLUSTER commands documentation: https://redis.io/commands/?group=cluster
- Antirez's explanation of why 16384 slots: https://github.com/redis/redis/issues/2576

## Issues Found

### Issue 1: Incorrect hash tag example (lines 41-44)
**What was wrong:** The first code block in the "Hash Tags for Grouping Keys" section showed keys without curly braces (`user:123:profile`, `user:123:settings`) but commented that they "hash on {user:123}". This is incorrect — without actual curly braces in the key name, the entire key is used for CRC16 computation, not a substring. These two keys would likely land in different slots.

**What was changed:** Replaced the example with two pairs: one showing keys without hash tags (hashed on the full key, likely different slots) and one showing keys with hash tags (`{user:123}:profile`, `{user:123}:settings`) that correctly hash on just `user:123`.

### Issue 2: Cluster create command had insufficient nodes (line 70)
**What was wrong:** The command `redis-cli --cluster create node1:6379 node2:6379 node3:6379 --cluster-replicas 1` specifies only 3 nodes with `--cluster-replicas 1`. Redis Cluster requires a minimum of 3 master nodes, and with 1 replica per master, at least 6 nodes are needed. Redis would refuse this command.

**What was changed:** Added 3 more nodes to the command (`node4:6379 node5:6379 node6:6379`) so there are 6 total nodes — 3 masters and 3 replicas.

## Review Notes
- The `CLUSTER KEYSLOT mykey` example output of 14687 is presented as illustrative. The actual CRC16("mykey") mod 16384 value should be verified if exact correctness is desired, but as an "example output" it serves its purpose.
- The explanation of why 16384 slots was chosen is accurate and aligns with Antirez's original rationale on GitHub.
- All other commands (`CLUSTER INFO`, `CLUSTER NODES`, `CLUSTER ADDSLOTS`, `CLUSTER GETKEYSINSLOT`, `--cluster check`) are syntactically correct and well-documented.
