# Validation Summary: How to Implement Redis Cluster Slot Migration

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Redis Cluster (hash slot architecture, 16384 slots, CRC16)
- redis-cli (--cluster reshard, rebalance, add-node, del-node, check, fix)
- CLUSTER SETSLOT (IMPORTING / MIGRATING / NODE / STABLE)
- MIGRATE command (single-key and multi-key with KEYS)
- CLUSTER GETKEYSINSLOT / COUNTKEYSINSLOT / MYID / BUMPEPOCH
- Bash scripting for migration automation
- Prometheus / redis_exporter metrics for cluster monitoring

## Sources Consulted
- Redis CLUSTER SETSLOT documentation: https://redis.io/docs/latest/commands/cluster-setslot/
- Redis MIGRATE documentation: https://redis.io/docs/latest/commands/migrate/
- Redis CLUSTER GETKEYSINSLOT documentation: https://redis.io/docs/latest/commands/cluster-getkeysinslot/
- Redis CLUSTER COUNTKEYSINSLOT documentation: https://redis.io/docs/latest/commands/cluster-countkeysinslot/
- Redis CLUSTER BUMPEPOCH documentation: https://redis.io/docs/latest/commands/cluster-bumpepoch/
- Redis Cluster Specification: https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/
- Redis Cluster Tutorial (resharding section): https://redis.io/docs/latest/operate/oss_and_stack/management/scaling/
- redis-cli --cluster help reference (built-in subcommands and flags)

## Issues Found
1. **Incorrect use of `COPY` flag with `MIGRATE` during slot migration.** The post used `MIGRATE ... COPY REPLACE` and described `COPY` as "keeps the key on source until migration completes." This is wrong on two counts:
   - Per the official MIGRATE documentation, `COPY` means "Do not remove the key from the local instance" — it leaves the key on the source permanently, not "until migration completes."
   - For slot migration the source key MUST be deleted; otherwise the slot is not actually moved, the cluster ends up with the same key on both nodes, and `CLUSTER SETSLOT ... NODE` will leave stale data. Accordingly, `redis-cli --cluster reshard` does NOT pass `COPY`. The migration script later in the post (which omits `COPY`) is the correct pattern, so the example contradicted the script.
   - **Fix:** Removed `COPY` from the MIGRATE examples in Step 4 (both single-key and multi-key forms) and from the sequence diagram. Updated the accompanying comment to explain that `MIGRATE` atomically transfers the key and deletes it from the source.

## Review Notes
- The CLUSTER SETSLOT IMPORTING/MIGRATING/NODE/STABLE syntax and the ordering shown (target IMPORTING before source MIGRATING, then per-key MIGRATE, then SETSLOT NODE on all reachable masters) match the official Redis Cluster spec.
- The MIGRATE multi-key `KEYS` form was indeed added in Redis 3.0.6, as stated.
- The `cluster nodes` output example uses the pre-Redis-4.0 format (no `@cport` cluster-bus port). Modern Redis emits e.g. `127.0.0.1:7000@17000`. The example is illustrative and still readable, so left as-is.
- The post correctly explains that ASK redirects (not MOVED) are issued for keys in a slot that is mid-migration, and that MOVED takes over after `CLUSTER SETSLOT ... NODE` finalizes ownership.
- The Prometheus metric names listed (`redis_cluster_slots_assigned`, `redis_cluster_slots_ok`, `redis_cluster_slots_pfail`, `redis_cluster_slots_fail`, `redis_cluster_known_nodes`, `redis_cluster_size`) match those exposed by the oliver006/redis_exporter project.
- `--cluster-pipeline` default is 10; the example uses 100, which is a valid override (not a default claim), so no change needed.
- `CLUSTER BUMPEPOCH`, `CLUSTER MYID`, and `CLUSTER SETSLOT ... STABLE` are all real, current commands and used correctly.
- The bash migration script in "Migration Script with Error Handling" is internally consistent and correctly omits `COPY`; iteration via `CLUSTER GETKEYSINSLOT $SLOT 100` with a termination check on empty output is the standard pattern.
