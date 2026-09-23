# How to Promote the Most Up-to-Date Follower Without Losing Acknowledged Writes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Patroni, Replication, Failover, High Availability

Description: Select a safe failover candidate by combining durable commit policy, valid replication history, fencing, and promotion eligibility.

The most advanced reachable follower can still be missing acknowledged writes. If an asynchronous primary returned success before shipping the last transaction, choosing the largest follower log position cannot recover that transaction.

Preserving acknowledged writes is therefore a property of the commit policy and the promotion protocol together. Candidate ranking is only one step. This guide uses PostgreSQL physical replication managed by Patroni to make the conditions concrete.

## State the guarantee precisely

Define an acknowledged write as one for which the application received an unambiguous successful commit response under the required durability policy. Track timeouts separately: they may have committed, but their outcome is unknown to the caller.

Specify the failures the guarantee covers. A design that protects against loss of one host may not protect against destruction of both durable copies. Storage durability, independent failure domains, and retention of the surviving log are prerequisites, not details to add after an incident.

Also distinguish a clean switchover from an unplanned failure. During maintenance, a functioning primary can stop new work and establish a final WAL boundary. After a crash, the last monitoring sample is not proof of its final commit position.

## Configure safe eligibility before failure

For a cluster whose contract requires remote durability, an illustrative Patroni dynamic configuration is:

```yaml
synchronous_mode: "on"
synchronous_mode_strict: true
synchronous_node_count: 1
check_timeline: true
postgresql:
  parameters:
    synchronous_commit: "on"
```

Apply reviewed dynamic changes through `patronictl edit-config` and verify the live result; do not assume changing a bootstrap file modifies an existing cluster. The settings and their scope are described in [Patroni dynamic configuration](https://patroni.readthedocs.io/en/latest/dynamic_configuration.html).

Patroni's synchronous mode constrains automatic promotion using maintained synchronization state. Strict mode prevents it from dropping the remote wait when no suitable synchronous standby is available. Applications can still weaken individual commits through `synchronous_commit`; audit connection and transaction settings. See [Patroni replication modes](https://patroni.readthedocs.io/en/latest/replication_modes.html).

This example is a starting policy, not a universal topology. Budget enough eligible replicas and capacity for maintenance. If all safe copies are unavailable, refusing promotion can be the only way to preserve the stated guarantee.

## Collect positions with their history

Before a planned move, inspect replication on the current primary:

```sql
SELECT application_name,
       state,
       sync_state,
       sent_lsn,
       write_lsn,
       flush_lsn,
       replay_lsn
FROM pg_stat_replication
ORDER BY application_name;
```

On each surviving standby:

```sql
SELECT pg_is_in_recovery(),
       pg_last_wal_receive_lsn(),
       pg_last_wal_replay_lsn();
```

Receive, durable flush, and replay answer different questions. A follower can possess durable WAL that it has not yet applied; a low replay position alone does not prove it lacks the data. Conversely, a recent heartbeat does not prove it possesses the required commit. Use the documented [replication statistics](https://www.postgresql.org/docs/current/monitoring-stats.html#MONITORING-PG-STAT-REPLICATION-VIEW) with controller state and logs.

Compare positions only within compatible replication histories and the same database system. A high LSN from a divergent former primary is not a better candidate. Preserve timeline information and let the HA controller enforce its supported selection protocol.

## Separate durability, election, and fencing

The election quorum authorizes a leader. The replication acknowledgment policy determines which copies contain successful commits. Fencing stops the former leader from continuing to accept writes. None substitutes for the other two.

For example, a healthy three-member configuration store can elect a node that lacks data if the promotion policy permits it. Similarly, a perfectly current replica can create split brain if promoted while the old primary still accepts mutations.

Use this sequence as a review model for the controller's runbook:

```text
establish recovery authority
exclude the former writer from every write path
verify eligible candidates and their compatible histories
select a candidate under the configured durability protocol
complete recovery and promotion
verify one effective writer
reopen application routing
reconcile acknowledged and uncertain operations
```

Avoid building a replacement election system from a script that sorts LSNs. Distributed state can change between observations, especially during replica membership changes.

## Recognize unsafe escape hatches

An asynchronous lag threshold is a risk limit, not a proof of zero loss. A candidate within the limit might still lack the last successful transaction. Reducing the threshold to zero does not make a stale primary observation current.

Manual failover also has different semantics from automatic selection. Patroni documents that a manual failover without a leader can permit a candidate that fails normal lag, timeline, or synchronous-membership checks. Consult the [REST API failover behavior](https://patroni.readthedocs.io/en/latest/rest_api.html#failover) before using that escape hatch.

If operators deliberately promote a copy whose completeness cannot be established, record the decision as recovery with possible loss. Do not describe the result as a verified no-loss promotion merely because all available replicas agreed on the same incomplete position.

## Validate the application contract

Run a controlled writer that assigns stable operation IDs and records successful acknowledgments outside the database failure domain. After promotion, check every acknowledged ID on the new primary. Keep an independent list of timeouts and reconcile those separately.

Test loss of the primary, loss of a synchronous follower, loss of both required copies, delayed WAL receipt, and a replica returning on an old history. The expected outcome can include no promotion when evidence is insufficient.

Finally, test cancellation while a commit is waiting for replication. Patroni explicitly documents that such a transaction can become locally visible without having reached the standby. Do not let another service treat that visibility as proof that the original client received a durable acknowledgment.

Safe promotion means the surviving system can justify its authority and its data boundary. When it cannot establish both, pause recovery at that boundary rather than turning the most convenient reachable follower into an unsupported guarantee.
