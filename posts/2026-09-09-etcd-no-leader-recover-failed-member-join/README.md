# How to Recover an etcd Cluster with No Leader After a Failed Join

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: etcd, Troubleshooting, High Availability, Replication, Disaster Recovery

Description: Determine whether a failed etcd join changed quorum, recover the existing voting majority, and choose snapshot recovery only when necessary.

---

`RAFT NO LEADER` after a failed join does not automatically mean the cluster's data is lost. It means the observed member has no current leader. A temporary election, broken peer connectivity, an incorrectly started new member, or a lost voting majority can all produce that state.

The first task is to reconstruct the committed membership and count available voters. Recovery differs sharply depending on whether the existing cluster can still regain its majority. This walkthrough applies to etcd 3.6 and 3.7 and assumes administrative access to the members and their configuration.

## Preserve the evidence and stop repeated changes

Pause further member additions, removals, restarts, and automated replacement attempts. Record the output from the original `member add`, including the assigned ID, peer URL, and whether `--learner` was used. Keep the startup logs and configuration of the new member.

Preserve all existing data directories and any separate WAL directories. Do not delete files, edit WAL records, or initialize a new cluster over the old paths to clear the error. Those actions can remove the information needed to recover the original cluster.

Use direct client endpoints with the deployment's existing TLS and administrative identity. The commands below assume `ETCDCTL_CACERT`, `ETCDCTL_CERT`, and `ETCDCTL_KEY` are exported with the deployment's certificate paths; supply `--user` if password authentication is required:

```bash
etcdctl --endpoints=https://etcd1.example.com:2379 \
  --command-timeout=5s endpoint status --write-out=table
etcdctl --endpoints=https://etcd2.example.com:2379 \
  --command-timeout=5s endpoint status --write-out=table
etcdctl --endpoints=https://etcd3.example.com:2379 \
  --command-timeout=5s endpoint status --write-out=table
```

Status responses may still provide local identity and Raft information when quorum-dependent operations fail. Treat local observations and old member-list output as evidence with timestamps, not proof that they describe the final committed membership.

## Recalculate the voting majority

For `V` voting members, quorum requires `floor(V / 2) + 1` voters. Learners do not count. A process that is running but isolated from the other voters is not an available vote for their component.

| Committed voting set | Required votes | Example consequence |
| --- | --- | --- |
| Three voters | Two | One failed voter can be tolerated |
| Four voters | Three | A failed join plus one unavailable original voter can stop progress |
| Three voters plus one learner | Two | The learner does not raise quorum, though catch-up adds load |
| One voter plus one new voter | Two | Progress waits for the second voter to start |

The official [runtime reconfiguration guide](https://etcd.io/docs/v3.7/op-guide/runtime-configuration/) explains why membership changes must be serialized and why a learner is preferable for joining a new member. Strict reconfiguration checks reduce risk but do not eliminate failures that happen after an accepted change.

Inspect logs from the surviving members to establish whether the add actually committed. A client timeout around membership modification can leave its outcome uncertain. Do not assume the absence of a successful CLI message means the membership remained unchanged.

## Repair the recorded member before replacing it

Compare the new member's startup values with the registered peer URL and the add command's returned cluster mapping. Check these common causes:

- The member started with `initial-cluster-state: new` instead of `existing`.
- Its advertised peer URL differs from the URL registered by `member add`.
- The initial-cluster mapping omits a member or uses a different name for the new identity.
- Its data directory belongs to a previously removed or unrelated cluster member.
- DNS, routing, or mutual TLS prevents peer communication on the configured peer port.

Fix a local startup or connectivity error while preserving the existing membership. If three original voters can communicate in a four-voter set, they already form a quorum; investigate why they cannot elect or retain a leader, including disk and CPU stalls. If only two are available, restoring the missing original voter or correctly starting the registered new voter may restore the required third vote.

An `initial-cluster` edit on an established member does not rewrite committed membership. A peer URL change requires the supported membership update and a functioning quorum. When quorum is unavailable, making the machine reachable at its already recorded address may be the appropriate repair.

## Remove a failed join only when consensus works

Once the existing cluster has a stable leader and a healthy majority, retrieve a fresh member list through a healthy voter (etcd1 in this example):

```bash
etcdctl --endpoints=https://etcd1.example.com:2379 member list --write-out=table
etcdctl --endpoints=https://etcd1.example.com:2379 endpoint health
```

If the new member is an abandoned join attempt, remove its exact hexadecimal ID through a healthy authenticated voter:

```bash
etcdctl --endpoints=https://etcd1.example.com:2379 member remove FAILED_JOIN_MEMBER_ID
```

Stop the removed process and retain its files for diagnosis. A new attempt must receive a fresh identity and an empty data directory. Verify health again before adding a replacement learner.

Removing a member is itself a consensus operation. It cannot be used as a command-line shortcut to recover a majority that no longer exists. Do not disable strict reconfiguration checks or repeatedly attempt to remove healthy members while the cluster is leaderless.

## Choose disaster recovery only for permanent majority loss

If a majority of the committed voting set cannot be recovered, including by correctly starting the registered new voter, switch to a deliberate disaster-recovery plan. Fence or stop the old members so they cannot later reappear alongside a separately restored cluster. Select the best verified snapshot and explicitly account for writes after that snapshot, which may be lost.

Use `etcdutl snapshot restore` with the appropriate release to create new data directories and a new logical cluster. Restore every member from the same snapshot and use a reviewed new membership mapping. For Kubernetes and other watch-cache consumers, plan revision bumping and marking the bumped history compacted so caches are forced to refresh. The [disaster recovery guide](https://etcd.io/docs/v3.7/op-guide/recovery/) documents this path.

Do not treat `--force-new-cluster` as a routine response to a failed join. It rewrites membership assumptions and is particularly dangerous when old members may still be active. A snapshot-based recovery makes the selected data point and new membership explicit.

## Validate before resuming membership work

After recovery, require a stable leader, healthy voting endpoints, expected membership, and successful authenticated application operations. Verify that all members report the intended cluster identity and that replication progress converges. If a snapshot was restored, validate application state and watch-cache rebuilding before reopening normal traffic.

Document whether the incident was a configuration failure, a connectivity failure, or a genuine majority loss. The next join should address that cause and use a learner, with only one membership change underway at a time.

## Conclusion

Recover the recorded voting majority whenever possible. A failed join can change quorum without destroying data, but membership removal still requires consensus. Reserve snapshot recovery for permanent majority loss and keep old member identities and data intact until that decision is made.

## Official Documentation

- [etcd runtime membership and strict reconfiguration](https://etcd.io/docs/v3.7/op-guide/runtime-configuration/)
- [etcd failure modes](https://etcd.io/docs/v3.6/op-guide/failures/)
- [etcd disaster recovery](https://etcd.io/docs/v3.7/op-guide/recovery/)
- [etcd learner design](https://etcd.io/docs/v3.6/learning/design-learner/)
