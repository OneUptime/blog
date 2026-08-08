# PostgreSQL Cascading Replication After Failover

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Cascading Replication, Failover, Timeline, Replication Slots, High Availability

Description: Predict and control what downstream PostgreSQL standbys do when an upstream relay is promoted, replaced, unreachable, or on a divergent timeline.

---

In cascading PostgreSQL replication, each standby connects to exactly one upstream. For a chain `A -> B -> C`, node B receives WAL from primary A and sends WAL to downstream C. Node C knows B; it does not know A.

After failover, the outcome depends on which node changes role:

- if B is promoted, C can normally continue streaming from B and follow its new timeline;
- if B fails while A remains primary, C does not automatically discover A and must be reparented;
- if a sibling of B is promoted, B and C may need new connection settings and may need rewind or rebuild if they replayed beyond the new timeline's fork point.

PostgreSQL supplies streaming, promotion, timeline history, and recovery tools. It does not provide the cluster manager that detects failure, fences the old primary, chooses a promotion target, rewrites topology, and verifies every descendant.

## Establish the Topology from Both Directions

On each receiver, identify its current upstream:

```sql
SELECT pg_is_in_recovery() AS is_standby;

SELECT status,
       receive_start_lsn,
       receive_start_tli,
       flushed_lsn,
       received_tli,
       last_msg_receipt_time,
       latest_end_lsn,
       slot_name,
       sender_host,
       sender_port,
       conninfo
FROM pg_stat_wal_receiver;
```

On each sender, identify only its direct children:

```sql
SELECT application_name,
       client_addr,
       state,
       sent_lsn,
       write_lsn,
       flush_lsn,
       replay_lsn,
       sync_state,
       reply_time
FROM pg_stat_replication
ORDER BY application_name;
```

`pg_stat_replication` on A shows B, not C. Run the same query on B to see C. A monitoring system that polls only the primary has no built-in visibility into a missing downstream descendant.

Record configuration sources on every standby:

```sql
SELECT name, setting, source, sourcefile, sourceline
FROM pg_settings
WHERE name IN (
    'primary_conninfo',
    'primary_slot_name',
    'recovery_target_timeline',
    'restore_command',
    'max_wal_senders',
    'hot_standby'
)
ORDER BY name;
```

Redact connection secrets. Topology diagrams should include host, `application_name`, slot name, archive source, and expected failover parent for every edge.

## Case 1: The Cascading Standby Is Promoted

Suppose A fails and B is the chosen promotion target. PostgreSQL's cascading-replication documentation says downstream C continues streaming from newly promoted B when `recovery_target_timeline = 'latest'`, which is the default.

That works because:

- C's `primary_conninfo` already points to B;
- B was already configured as a sender for C;
- promotion creates a new timeline whose history descends from the timeline C was replaying;
- C is allowed to follow the latest timeline.

Before relying on this behavior, verify B was prepared to remain a sender after promotion:

```sql
SHOW max_wal_senders;
SHOW max_replication_slots;
SHOW wal_level;
SHOW hot_standby;
```

B needs WAL sender capacity, matching HBA access for C, a login replication role, and any physical slot named by C's `primary_slot_name`. PostgreSQL notes that sending parameters retain their meaning when a standby becomes primary, which is why they must be configured before an incident.

Promote only after the old primary is fenced from accepting writes:

```sql
SELECT pg_promote(wait => true, wait_seconds => 60);
```

Then verify B left recovery and C reconnected:

```sql
-- On B
SELECT pg_is_in_recovery();

SELECT application_name,
       client_addr,
       state,
       sent_lsn,
       flush_lsn,
       replay_lsn
FROM pg_stat_replication;
```

```sql
-- On C
SELECT pg_is_in_recovery(),
       pg_last_wal_receive_lsn(),
       pg_last_wal_replay_lsn();

SELECT status,
       sender_host,
       received_tli,
       last_msg_receipt_time
FROM pg_stat_wal_receiver;
```

Make a canary write on B and prove C replays it. A connected receiver on the old timeline is not enough.

## Case 2: The Relay Fails but the Primary Is Healthy

If B fails while A remains primary, C keeps trying the host in its `primary_conninfo`. PostgreSQL does not traverse a topology map or ask A where to reconnect.

A cascading standby can continue sending WAL already received or restored from archive for as long as new records are available. Once B is gone, that buffer is unavailable to C. Reparent C to A or to another compatible relay through the HA manager.

Before changing C, verify A can serve it:

- C's source address matches an HBA rule on A;
- the replication role and TLS trust work against A;
- A has a free WAL sender;
- required WAL is still in `pg_wal` or the archive;
- C's configured slot name exists on A, or slot use is changed deliberately;
- C has not diverged from A's timeline history.

A standby configuration might change from:

```conf
primary_conninfo = 'host=relay-b.internal port=5432 user=replicator application_name=standby_c sslmode=verify-full'
primary_slot_name = 'standby_c_slot'
```

to:

```conf
primary_conninfo = 'host=primary-a.internal port=5432 user=replicator application_name=standby_c sslmode=verify-full'
primary_slot_name = 'standby_c_slot_on_a'
```

Reload and observe the receiver restart:

```sql
SELECT pg_reload_conf();
```

PostgreSQL documents that a live WAL receiver is signaled to stop and restart when `primary_conninfo` changes. Keep credentials out of the example by using a protected passfile in production.

## Physical Slot Names and Positions Are Local

A physical slot on B is an object in B's cluster state. Repointing C to A does not move that slot or its retention position. Even if A has a slot with the same text name, confirm that it belongs to C and protects an appropriate point.

Inspect the prospective upstream:

```sql
SELECT slot_name,
       slot_type,
       active,
       active_pid,
       restart_lsn,
       wal_status,
       safe_wal_size,
       invalidation_reason
FROM pg_replication_slots
WHERE slot_name IN ('standby_c_slot', 'standby_c_slot_on_a');
```

Creating a new slot now cannot restore WAL already removed. If C's requested start point is older than A's retained WAL, it needs the archive or a fresh base backup. A slot prevents future removal from its reservation point; it is not a historical recovery service.

After C is safely attached elsewhere and B is permanently retired, remove B-only orphaned slots through a controlled decommissioning procedure so they do not retain WAL.

## Case 3: A Sibling Standby Is Promoted

Consider A with two direct standbys, B and D, while C cascades from B. If A fails and D is promoted, B still points to A and C still points to B.

The desired topology may be `D -> B -> C` or `D -> C` plus another edge for B. Repointing is safe only if each target's replayed history can follow D's new timeline. `recovery_target_timeline = 'latest'` tells recovery to follow the latest child timeline, but it does not erase WAL that a node replayed beyond the point where D was promoted.

Example risk:

1. B receives and replays old-primary WAL through LSN X.
2. D had received only through an earlier LSN Y.
3. D is promoted at Y and creates a new timeline.
4. B's data between Y and X is not in D's history.

That node has crossed the new primary's fork point. Do not force it to stream by deleting history files or changing a timeline setting. Fence the old primary and use `pg_rewind` when its prerequisites and required WAL are satisfied, or rebuild B from D. Evaluate C independently based on what it replayed.

## Timeline History Is the Continuity Test

Every promotion starts a new timeline and writes a timeline history file. The file records where the new timeline branched. Standbys using `latest` can follow a descendant timeline when their recovery state is compatible with that history.

Archive timeline history files as well as WAL. A shared archive must preserve them and must not let one node overwrite another node's WAL. If a standby cannot retrieve the new history file, it may repeatedly search the old timeline or fail to continue recovery.

Useful evidence includes:

```sql
SELECT pg_is_in_recovery(),
       pg_last_wal_receive_lsn(),
       pg_last_wal_replay_lsn();
```

and, outside SQL:

```sh
pg_controldata /var/lib/postgresql/18/data
```

Capture this before destructive recovery work. Use version-matched binaries and do not infer a safe relationship from LSN magnitude alone; timeline ancestry matters.

## Cascading Replication Is Asynchronous

PostgreSQL currently documents cascading replication as asynchronous. Synchronous replication settings on A do not extend through B to C. A knows only directly connected senders when choosing synchronous standbys.

If B is synchronous to A, a commit can wait for B at the configured write, flush, or apply level. That does not mean C has received the commit. Promoting C after losing both A and B can therefore have a larger recovery point than operators expect.

If C must be a zero-data-loss candidate, connect it directly as an eligible synchronous standby or design another topology whose documented acknowledgment path includes it. Do not label a cascade descendant synchronous because its parent is synchronous.

Hot standby feedback does propagate upstream through a cascade. This can reduce recovery conflicts for downstream queries, but it can also hold cleanup horizons and contribute to bloat on the primary. Monitor the whole chain.

## Preconfigure Every Node for Both Roles

Every possible relay or primary should have, before failover:

- `wal_level = replica` or higher;
- enough `max_wal_senders` and `max_replication_slots` for its possible children and backups;
- HBA rules for the exact downstream networks and replication roles;
- server TLS certificates valid for the names downstreams will use;
- archive access and a collision-safe archive design;
- `recovery_target_timeline = 'latest'` unless a deliberate point-in-time target says otherwise;
- a documented physical-slot strategy for every possible edge;
- monitoring that discovers both sender and receiver relationships.

Changing a startup-only sender setting after promotion can add an avoidable restart to the outage.

## Failover Runbook for a Cascade

1. Freeze routing and fence the failed or isolated primary from writes.
2. Capture receive, flush, and replay positions plus timeline evidence from every reachable node.
3. Choose the promotion target according to the data-loss policy, not simply lowest network latency.
4. Promote exactly one node and verify it exits recovery.
5. Determine each downstream's compatible new parent and slot.
6. Repoint compatible standbys; rewind or rebuild divergent ones.
7. Verify every edge from both sender and receiver views.
8. Write and replay a canary through each path.
9. Restore required synchronous membership and application routing.
10. Remove abandoned slots only after confirming no remaining node owns them.

Automate these steps in an HA manager, but keep the evidence and stop conditions visible. Automation must halt when fencing is uncertain or timeline ancestry is incompatible.

## Official Documentation

- [PostgreSQL cascading replication](https://www.postgresql.org/docs/current/warm-standby.html#CASCADING-REPLICATION)
- [PostgreSQL standby operation and timelines](https://www.postgresql.org/docs/current/warm-standby.html#STANDBY-SERVER-OPERATION)
- [PostgreSQL failover](https://www.postgresql.org/docs/current/warm-standby-failover.html)
- [PostgreSQL recovery target settings](https://www.postgresql.org/docs/current/runtime-config-wal.html#RUNTIME-CONFIG-WAL-RECOVERY-TARGET)
- [PostgreSQL replication configuration](https://www.postgresql.org/docs/current/runtime-config-replication.html)
- [PostgreSQL replication monitoring](https://www.postgresql.org/docs/current/monitoring-stats.html#MONITORING-STATS-VIEWS)
- [PostgreSQL `pg_rewind`](https://www.postgresql.org/docs/current/app-pgrewind.html)

## Conclusion

Downstream standbys keep following a promoted relay because their endpoint already names it and the new timeline descends from their history. They do not automatically reroute around a failed relay or follow a promoted sibling. Model every direct edge, preconfigure every possible sender, treat slots as upstream-local, validate timeline ancestry, and let a fenced HA workflow reparent, rewind, or rebuild each node explicitly.
