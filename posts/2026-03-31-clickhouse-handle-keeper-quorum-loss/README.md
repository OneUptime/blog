# How to Handle a ClickHouse Keeper Quorum Loss

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Keeper, Quorum, Incident Response, High Availability

Description: Recover from a ClickHouse Keeper quorum loss that blocks replication by identifying the failed nodes, restoring quorum, and resuming replication safely.

---

ClickHouse Keeper manages replication metadata using a Raft consensus protocol. If more than half the Keeper nodes fail, quorum is lost and replication halts. ClickHouse continues serving reads but refuses new replicated writes.

## Detect Quorum Loss

Signs of quorum loss:
- Inserts to ReplicatedMergeTree tables return errors.
- `system.replicas` shows `is_session_expired = 1`.
- Keeper logs show `Leader is not set`.

Check from a ClickHouse client:

```sql
SELECT * FROM system.zookeeper WHERE path = '/';
```

If this returns an error like `Coordination::Exception`, Keeper is not responding.

Check Keeper status directly using the four-letter-word (4LW) admin commands on the client port (default 9181):

```bash
echo stat | nc keeper-01 9181 | head -20
```

Look for `Mode: leader` or `Mode: follower`. If all nodes fail to respond or report `isro: ro` (via `echo isro | nc <host> 9181`) with no leader elected, quorum is lost.

## Identify Failed Nodes

```bash
for HOST in keeper-01 keeper-02 keeper-03; do
    echo -n "$HOST: "
    echo ruok | nc -w 2 $HOST 9181 || echo "UNREACHABLE"
    echo
done
```

A healthy node replies `imok`.

## Restore a Single Failed Node

Restart the Keeper process on the failed node:

```bash
systemctl restart clickhouse-keeper
# or if Keeper runs inside clickhouse-server
systemctl restart clickhouse-server
```

Monitor it rejoining the ensemble:

```bash
echo stat | nc keeper-01 9181 | grep "Mode"
```

## Restore from Keeper Snapshot (Data Loss Scenario)

If a majority of Keeper nodes have unrecoverable data loss:

1. Stop all Keeper nodes.
2. Copy the latest snapshot from the surviving node to the others:

```bash
scp /var/lib/clickhouse/coordination/snapshots/snapshot_* keeper-02:/var/lib/clickhouse/coordination/snapshots/
```

3. Start all Keeper nodes.
4. Verify the ensemble is healthy before restarting ClickHouse nodes.

## Verify Replication Resumes

```sql
-- After quorum restoration
SELECT
    table,
    is_session_expired,
    queue_size,
    absolute_delay
FROM system.replicas
WHERE table = 'events';
```

`is_session_expired` should return 0, and `queue_size` should begin draining.

## Preventing Future Quorum Loss

- Always run an odd number of Keeper nodes: 3 or 5.
- Spread Keeper nodes across availability zones.
- Monitor with [OneUptime](https://oneuptime.com) - alert when fewer than a majority of Keeper nodes respond to `ruok` with `imok`.

## Summary

Keeper quorum loss halts ClickHouse replication. Recovery involves restarting failed Keeper nodes or restoring from snapshots. Preventive placement across AZs and continuous Keeper health monitoring are essential to avoid this condition.
