# Validation Summary: How to Build Split-Brain Prevention

## Status
validated

## Post Type
Tutorial / Guide — multi-technology walkthrough of split-brain prevention with concrete config, code, and shell examples.

## Technologies Covered
- etcd (v3.5.9) — Raft consensus, cluster configuration, learner/voter members
- etcd Go client v3 (`go.etcd.io/etcd/client/v3`)
- etcdctl CLI (member add/promote, endpoint health/status)
- Apache ZooKeeper — Zab protocol, ensemble configuration (`zoo.cfg`)
- ZooKeeper Java client (`org.apache.zookeeper`) — Watcher, ephemeral sequential nodes, leader election
- Kubernetes (StatefulSet, Deployment, RBAC for fence controller)
- IPMI / `ipmitool` — hardware fencing via BMC
- Python 3.9+ (dataclasses, Enum, subprocess) for STONITH controller
- Bash + iptables for partition simulation

## Sources Consulted
- etcd configuration reference: https://etcd.io/docs/v3.5/op-guide/configuration/
- etcd runtime reconfiguration: https://etcd.io/docs/v3.5/op-guide/runtime-configuration/
- etcd learner design: https://etcd.io/docs/v3.5/learning/design-learner/
- etcd API guarantees (linearizable reads): https://etcd.io/docs/v3.5/learning/api_guarantees/
- etcd cluster status tutorial: https://etcd.io/docs/v3.5/tutorials/how-to-check-cluster-status/
- `clientv3` godoc: https://pkg.go.dev/go.etcd.io/etcd/client/v3
- etcd issues on witness support: https://github.com/etcd-io/etcd/issues/20696 and https://github.com/etcd-io/etcd/issues/8934
- ZooKeeper Watcher.Event.KeeperState: https://zookeeper.apache.org/doc/r3.9.2/apidocs/zookeeper-server/org/apache/zookeeper/Watcher.Event.KeeperState.html
- ZooKeeper Watcher.Event.EventType: https://zookeeper.apache.org/doc/r3.9.2/apidocs/zookeeper-server/org/apache/zookeeper/Watcher.Event.EventType.html
- ZooKeeper admin guide (zoo.cfg / autopurge / admin server): https://zookeeper.apache.org/doc/r3.9.2/zookeeperAdmin.html
- ipmitool man page (chassis power subcommands)

## Issues Found

1. **Incorrect characterization of an etcd "witness" node.** The original text claimed the deployed witness "participates in quorum but stores minimal data" and "only participates in voting, not data storage." etcd does not have a witness or arbiter member type — all voting members replicate the full keyspace (etcd learner design doc; tracked but unimplemented in etcd issues #8934 and #20696). The pattern shown is really a third voting member sized smaller than the data nodes, which works as a tie-breaker but still stores all data.

   **Fix:** Added a clarifying paragraph above the YAML noting that etcd has no dedicated witness type, reworded the YAML comments to describe the member as a small tie-breaker that still stores the full keyspace, and updated the volume-size comment to advise scaling with data growth. No code logic was changed.

## Review Notes

- The etcd Go client code is accurate: `clientv3.Client` exposes `Status` (via embedded `Maintenance`) and `MemberList` (via embedded `Cluster`); `clientv3.Config` fields `Endpoints`, `DialTimeout`, `AutoSyncInterval` are correct; default `Get` is linearizable.
- The etcd YAML's `initial-cluster` is written with a YAML folded scalar (`>-`). After folding, the resulting string will contain a single space after each comma. etcd's `URLsMap` parser splits on `,` without trimming, so leading/trailing whitespace can land in the parsed member entries. In practice users typically write `initial-cluster` on a single line or as a flow string. Not changed because the value is illustrative, but worth flagging if anyone copies it verbatim.
- The etcd witness StatefulSet command omits the `--initial-cluster` and `--initial-cluster-token` flags that an etcd member needs when joining an existing cluster (normally surfaced as `ETCD_INITIAL_CLUSTER` from `etcdctl member add`). The companion `add-etcd-witness.sh` shows the `member add` step but does not propagate those env vars to the pod. A real deployment would need them. Not fixed because the section is illustrative and labeled as adding-then-promoting.
- The Python STONITH controller uses `dict[...]` and `tuple[...]` in annotations, which requires Python 3.9+ at runtime. The `from typing import Optional` import is unused — minor lint, not a correctness issue.
- ZooKeeper Java leader-election example uses correct enum names (`Watcher.Event.KeeperState.{SyncConnected,Disconnected,Expired}`, `Event.EventType.NodeDeleted`), correct `CreateMode.EPHEMERAL_SEQUENTIAL`, and a standard "watch the predecessor" pattern (Apache ZooKeeper recipes). The `nodeId` interpolation produces names like `/election/node-<id>-<seq>`; sorting by string works because the trailing sequence is fixed-width zero-padded by ZooKeeper.
- etcd v3.5.9 (Oct 2023) is real but no longer the latest patch in the 3.5 line as of 2026-06; readers may want to pick a more current 3.5.x tag.
- IPMI status-string substring checks (`"off" in verify_msg.lower()`, `"on" in verify_msg.lower()`) are correct for typical `Chassis Power is on/off` output because "off" does not contain "on" and vice versa, but the heuristic could match unexpected output in edge cases.
- The cluster-sizing table (quorum and fault tolerance for N=1,2,3,5,7) is arithmetically correct.
