# Validation Summary: How to Handle ClickHouse Keeper Leader Election

## Status
validated

## Post Type
Tutorial / Operations guide

## Technologies Covered
- ClickHouse Keeper (standalone coordination service)
- Raft consensus protocol (leader election)
- ClickHouse server (replicated tables, distributed DDL)
- ZooKeeper-compatible four-letter-word (4LW) commands (`stat`, `mntr`)
- Prometheus metrics exposition (ClickHouse async metrics)
- XML-based ClickHouse Keeper configuration (`<coordination_settings>`)

## Sources Consulted
- [ClickHouse Keeper Operations](https://clickhouse.com/docs/operations/clickhouse-keeper)
- [ClickHouse Keeper SRE Guide](https://clickhouse.com/docs/guides/sre/keeper/clickhouse-keeper)
- [system.zookeeper](https://clickhouse.com/docs/operations/system-tables/zookeeper)
- [system.replicas](https://clickhouse.com/docs/operations/system-tables/replicas)
- [system.asynchronous_metrics](https://clickhouse.com/docs/operations/system-tables/asynchronous_metrics)
- ClickHouse source: `src/Coordination/KeeperAsynchronousMetrics.cpp` (for actual `Keeper*` async metric names)
- Altinity KB: [clickhouse-keeper](https://kb.altinity.com/altinity-kb-setup-and-maintenance/altinity-kb-zookeeper/clickhouse-keeper/)

## Issues Found

1. **Nonexistent Prometheus metric `ClickHouseKeeperEpochsElapsed`.** The post recommended alerting on a metric named `ClickHouseKeeperEpochsElapsed`, which does not exist in ClickHouse Keeper's Prometheus exposition. ClickHouse Keeper exposes Raft state via async metrics under the `ClickHouseAsyncMetrics_` prefix. The actual metric whose value increments on each new election is `KeeperLastLogTerm` (the Raft term of the last log entry). Replaced the fake metric with the real `ClickHouseAsyncMetrics_KeeperLastLogTerm` and added the companion `ClickHouseAsyncMetrics_KeeperIsLeader` (1/0 leader indicator). The Summary paragraph was updated to match.

2. **Nonexistent `mntr` field `leader_uptime`.** The "Key metrics" code block listed `leader_uptime` as a field returned by Keeper's `mntr` 4LW command. Standard ZooKeeper-compatible `mntr` output (which Keeper implements) does not include `leader_uptime`. Removed it and replaced with `zk_synced_followers`, which is a real `mntr` field exposed by the leader and useful in the same monitoring context.

## Review Notes

- The Raft explanation (random election timeout between `election_timeout_lower_bound_ms` and `election_timeout_upper_bound_ms`, leader sends heartbeats, missed heartbeats trigger re-election) is accurate.
- Configuration setting names are correct: `<coordination_settings>` is the right wrapper element under `<keeper_server>`, and `heart_beat_interval_ms`, `election_timeout_lower_bound_ms`, and `election_timeout_upper_bound_ms` are all valid setting names in current ClickHouse releases. Defaults are 500/1000/2000 ms respectively; the post's tuned values for local and cross-DC networks are reasonable trade-offs.
- The 4LW `stat` "Mode: leader/follower" output line is correct, as is the `mntr` field `zk_server_state`.
- `system.zookeeper WHERE path = '/'` is a valid connectivity sanity check; it does not directly identify the leader, but the post does not claim it does — it is presented as a separate way to query Keeper from SQL.
- The "1-3 seconds" election pause for a local cluster is a plausible estimate given default election timeout bounds (1000-2000 ms) plus follower detection and vote round-trip; real-world numbers depend on `heart_beat_interval_ms` and network conditions.
- The note that ClickHouse Keeper itself is not JVM-based (the GC-pause caveat is about co-located JVM monitoring tools, not Keeper) is correct — Keeper is C++.
- `system.replicas.is_readonly` and `queue_size` are real columns and are an appropriate post-election recovery check.
- `netstat -s | grep "failed connection attempts"` is a valid Linux diagnostic but only surfaces one of several network-loss symptoms; readers may also want to look at `Tcp:` retransmits and interface-level drops. Not incorrect, so left as written.
