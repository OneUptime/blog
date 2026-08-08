# Remove a PostgreSQL Replica Without Orphaning Its Slot

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Replication Slots, Replica Decommissioning, WAL Retention, Physical Replication, Logical Replication

Description: Decommission physical and logical PostgreSQL replicas while proving slot ownership, preventing reconnects, and releasing retained WAL safely.

---

Stopping or deleting a PostgreSQL replica does not necessarily remove its replication slot. Non-temporary slots are persistent, cluster-wide objects that survive client disconnects and server crashes. An abandoned slot can retain WAL indefinitely and, for logical decoding, can also hold row or catalog cleanup horizons.

A safe decommission has two sides: stop the consumer so it cannot reconnect, then remove the slot on the exact upstream that owns it. Logical subscriptions can coordinate both operations when the publisher is reachable. Physical standbys and custom CDC consumers require an explicit slot lifecycle.

## Prove Which Slot Belongs to the Replica

Do not start with `WHERE active = false`. Inactive slots can belong to a temporarily stopped production standby, a disaster-recovery node, an upgrade, or a consumer between reconnect attempts.

On the candidate upstream:

```sql
SELECT slot_name,
       slot_type,
       plugin,
       database,
       temporary,
       active,
       active_pid,
       restart_lsn,
       confirmed_flush_lsn,
       xmin,
       catalog_xmin,
       wal_status,
       safe_wal_size,
       inactive_since,
       invalidation_reason,
       failover,
       synced
FROM pg_replication_slots
ORDER BY slot_name;
```

This is a PostgreSQL 18 inventory. Use the view definition for older releases because newer status columns may not exist.

Correlate active slots with connected senders:

```sql
SELECT r.slot_name,
       r.slot_type,
       r.active_pid,
       s.application_name,
       s.client_addr,
       s.state,
       s.sent_lsn,
       s.flush_lsn,
       s.replay_lsn,
       s.reply_time
FROM pg_replication_slots AS r
LEFT JOIN pg_stat_replication AS s ON s.pid = r.active_pid
ORDER BY r.slot_name;
```

For a physical standby, record its configured upstream and slot on that standby:

```sql
SELECT name, setting, source, sourcefile, sourceline
FROM pg_settings
WHERE name IN ('primary_conninfo', 'primary_slot_name');

SELECT slot_name, sender_host, sender_port, conninfo
FROM pg_stat_wal_receiver;
```

Protect `primary_conninfo` as a secret if it contains credentials. The `conninfo` value in `pg_stat_wal_receiver` has security-sensitive fields obfuscated.

For a logical subscription, record the publisher connection and main slot before changing anything:

```sql
SELECT oid,
       subname,
       subenabled,
       subslotname,
       subpublications
FROM pg_subscription
WHERE subdbid = (SELECT oid
                 FROM pg_database
                 WHERE datname = current_database())
  AND subname = 'orders_sub';
```

The examples below assume the recorded `subslotname` is the default `orders_sub`. If it differs, use the captured value in publisher-side slot queries and drop commands. Protect `subconninfo` as a secret if it must be inspected. Also look for generated table-synchronization slots on the publisher when an initial copy was in progress.

## Quantify Retention Before the Change

On a primary or a publisher that is not in recovery, estimate each slot's WAL distance:

```sql
SELECT slot_name,
       slot_type,
       active,
       restart_lsn,
       pg_size_pretty(
           pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)
       ) AS retained_wal_distance,
       wal_status,
       safe_wal_size,
       inactive_since
FROM pg_replication_slots
ORDER BY pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn) DESC NULLS LAST;
```

`pg_current_wal_lsn()` cannot run during recovery. When inspecting slots on a hot standby, use `pg_last_wal_replay_lsn()` as the comparison point instead.

The LSN distance is not the exact filesystem space that will be freed. WAL can also be retained for archiving, checkpoints, `wal_keep_size`, or other slots. Capture filesystem use separately and preserve this baseline for the change record.

## Remove a Physical Standby

### 1. Remove It from Availability Policy

If the standby is named in `synchronous_standby_names`, stopping it before replacing or removing that requirement can block commits waiting for synchronous acknowledgment. Change the synchronous policy on the primary through the reviewed HA procedure, reload it, and verify actual `sync_state` values:

```sql
SHOW synchronous_standby_names;

SELECT application_name, state, sync_state
FROM pg_stat_replication
ORDER BY application_name;
```

Also remove the node from read routing, failover candidate lists, backups, monitoring expectations, and automation that can restart it.

### 2. Stop and Fence Its Receiver

Shut down the standby cleanly or remove its ability to connect. The exact service command belongs to the platform's service manager. Confirm the sender row disappears from the upstream and that the slot becomes inactive:

```sql
SELECT slot_name, active, active_pid, inactive_since
FROM pg_replication_slots
WHERE slot_name = 'standby_a_slot';
```

Fencing matters because a still-running standby can reconnect between the check and the drop. If PostgreSQL reports the slot is active, do not kill `active_pid` until its client identity and topology ownership are proven.

### 3. Drop the Slot on Its Actual Upstream

Once the consumer is permanently stopped and the exact slot is approved for deletion:

```sql
SELECT pg_drop_replication_slot('standby_a_slot');
```

This function drops either a physical or logical slot and requires a superuser or a role with replication privilege. It is irreversible for that slot's retained continuity. If the replica might return, plan a new base backup or another documented recovery source before deletion.

In a cascade, run the function on the relay that owns the slot, not automatically on the root primary. Slot names and retention positions are local to each PostgreSQL cluster.

### 4. Remove Stale Configuration

Delete or neutralize `primary_slot_name` and `primary_conninfo` in the retired node's managed configuration before repurposing it. A stale service image that later starts can reconnect or produce confusing errors against a slot that correctly no longer exists.

## Remove a Logical Subscription When the Publisher Is Reachable

The normal path is simple and coordinated. On the subscriber database:

```sql
DROP SUBSCRIPTION orders_sub;
```

When the subscription is associated with a remote slot, PostgreSQL connects to the publisher and attempts to drop the main slot plus any remaining table-synchronization slots. The command fails if it cannot complete that remote cleanup, which prevents the local definition from disappearing while a remote retention object is silently left behind.

Run `DROP SUBSCRIPTION` outside a transaction block when a slot is associated. After success, verify on the publisher:

```sql
SELECT slot_name,
       slot_type,
       active,
       restart_lsn
FROM pg_replication_slots
WHERE slot_name = 'orders_sub'
   OR slot_name LIKE 'pg\_%\_sync\_%' ESCAPE '\';
```

The wildcard can match synchronization slots for other subscriptions. Use the former subscription OID, subscriber relation OID, and subscriber system identifier naming pattern before attributing or deleting any result.

## Remove a Logical Subscription When the Publisher Is Unreachable

If normal `DROP SUBSCRIPTION` fails because the publisher cannot be contacted, first preserve the remote slot name and connection target. Then on the subscriber, as separate commands:

```sql
ALTER SUBSCRIPTION orders_sub DISABLE;

ALTER SUBSCRIPTION orders_sub
SET (slot_name = NONE);

DROP SUBSCRIPTION orders_sub;
```

Disabling stops local workers. Setting `slot_name = NONE` disassociates the main remote slot, so the final drop does not try to drop that slot. It can still attempt a publisher connection to remove internally created table-synchronization slots if synchronization was left unfinished. If the publisher is unreachable, PostgreSQL allows the local drop to complete and leaves those remote slots for manual cleanup.

This deliberately leaves the main remote slot in place. If the publisher still exists but is temporarily unreachable, that slot and any remaining table-synchronization slots continue retaining resources. Put explicit remote cleanup into the incident record. When the publisher is reachable, identify and drop each exact slot individually. For the default main slot:

```sql
SELECT pg_drop_replication_slot('orders_sub');
```

Repeat the function call for every approved remaining table-synchronization slot. A direct `pg_drop_replication_slot()` call drops only the named slot.

If the remote database instance was permanently destroyed, there is no remote slot to clean. If it can return from a snapshot, account for stale slots in its restoration procedure.

## Preserve a Slot Only for an Intentional Consumer Move

Sometimes a subscriber is moving to another host and must resume from the same remote slot. PostgreSQL supports disassociating the slot before dropping the old subscription:

```sql
ALTER SUBSCRIPTION orders_sub DISABLE;

ALTER SUBSCRIPTION orders_sub
SET (slot_name = NONE);

DROP SUBSCRIPTION orders_sub;
```

The replacement subscription can be associated with the pre-existing slot using a reviewed `create_slot = false` procedure. During the gap, monitor retained WAL continuously. Keep the old subscriber fenced so only one consumer can use the slot, and verify the new subscriber's replication origin and table state before enabling it.

This is an exception with a named owner, deadline, and rollback plan. An undocumented inactive slot is not a migration strategy.

## Remove Slots Used by `pg_receivewal` or CDC Clients

For a custom physical WAL receiver, first stop the process and its supervisor, then either use SQL or its companion command:

```sh
pg_receivewal \
  --dbname='host=primary.internal user=replicator sslmode=verify-full' \
  --slot=wal_archive_slot \
  --drop-slot
```

For a logical decoding client:

```sh
pg_recvlogical \
  --dbname='host=publisher.internal dbname=appdb user=cdc_user sslmode=verify-full' \
  --slot=events_cdc_slot \
  --drop-slot
```

Use protected password files rather than command-line secrets. A logical slot is associated with one database, and creating or streaming from it requires the correct database. In PostgreSQL 18, the `--drop-slot` action does not require `--dbname`; using it as a connection string as shown remains valid. Either command is destructive to stream continuity; coordinate the downstream checkpoint and re-seed plan first.

## Handle Failover and Synchronized Slots Carefully

PostgreSQL can synchronize logical failover slots from a primary to a hot standby. On that standby, slots with `synced = true` cannot be manually dropped while it remains a standby. Manage the failover slot on the primary and allow the slot-synchronization design to converge, or follow the documented topology-change procedure.

Do not delete a same-named slot independently from every node. A primary slot, a synchronized standby copy, and a leftover copy on a promoted server have different authority and usability. Record server identity and role with every slot action.

Physical slots are not automatically transplanted to an arbitrary new upstream during failover. When removing an old replica or reparenting it, inventory slots on the old relay, current primary, promoted nodes, and any restored former primary.

## Safety Limits Are Not Lifecycle Management

At checkpoint time, `max_slot_wal_keep_size` can allow a lagging slot to lose required WAL; it is not a hard cap on `pg_wal` usage. PostgreSQL 18's `idle_replication_slot_timeout` can invalidate certain long-inactive slots at checkpoint. Neither feature understands whether a replica was intentionally retired.

An invalidated slot can remain visible for investigation, and its consumer may need re-seeding or another documented recovery source. Use limits as containment, then remove approved orphaned slots explicitly.

Never automate `pg_drop_replication_slot()` solely from `active = false` or age. Require at least:

- an inventory owner and consumer identity;
- confirmation that no service can reconnect;
- removal from synchronous and failover policy;
- a backup or rebuild plan if continuity is needed;
- approval for the exact server and slot name.

## Verify the Decommission

After slot removal:

```sql
SELECT slot_name, slot_type, active, restart_lsn
FROM pg_replication_slots
WHERE slot_name = 'standby_a_slot';
```

The result should be empty on the owning upstream. Also verify:

- no sender row or receiver retry remains;
- no subscription references the remote slot;
- synchronous commit policy no longer waits for the retired node;
- expected remaining replicas still stream;
- `pg_wal` filesystem use stabilizes and old segments become recyclable;
- archiving remains healthy;
- infrastructure automation cannot resurrect the old consumer.

Do not expect the filesystem to shrink at the instant the slot is dropped. WAL recycling and removal interact with checkpoints, archiving, minimum retention, and other slots. Investigate those causes if disk use remains high.

## Official Documentation

- [PostgreSQL replication slots](https://www.postgresql.org/docs/current/warm-standby.html#STREAMING-REPLICATION-SLOTS)
- [PostgreSQL `pg_replication_slots` view](https://www.postgresql.org/docs/current/view-pg-replication-slots.html)
- [PostgreSQL replication management functions](https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-REPLICATION)
- [PostgreSQL subscription slot management](https://www.postgresql.org/docs/current/logical-replication-subscription.html#LOGICAL-REPLICATION-SUBSCRIPTION-SLOT)
- [PostgreSQL `DROP SUBSCRIPTION`](https://www.postgresql.org/docs/current/sql-dropsubscription.html)
- [PostgreSQL `ALTER SUBSCRIPTION`](https://www.postgresql.org/docs/current/sql-altersubscription.html)
- [PostgreSQL `pg_receivewal`](https://www.postgresql.org/docs/current/app-pgreceivewal.html)
- [PostgreSQL `pg_recvlogical`](https://www.postgresql.org/docs/current/app-pgrecvlogical.html)

## Conclusion

Replica deletion and slot deletion are separate lifecycle events. Prove the slot's consumer and upstream, remove the node from routing and synchronous policy, fence reconnects, then drop the slot through the owning subscription or directly on its server. Verify the entire topology afterward. That discipline releases WAL without deleting a live consumer's only recovery path.
