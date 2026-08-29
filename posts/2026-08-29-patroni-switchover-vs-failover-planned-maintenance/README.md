# Patroni Switchover vs Failover for Planned Maintenance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Patroni, High Availability, Failover, Maintenance, Streaming Replication

Description: Use Patroni switchover for planned maintenance, select a safe candidate, verify routing, and recover cleanly when the move does not complete.

---

Use a **switchover** when the Patroni cluster is healthy and you intentionally want to move the primary. Reserve **failover** for an unhealthy cluster where no leader exists or normal synchronous-standby guarantees cannot be satisfied.

The commands are not synonyms:

| Operation | Intended cluster state | Candidate | Data-safety behavior |
| --- | --- | --- | --- |
| `patronictl switchover` | Healthy, with a current leader | Optional; specify one for a deterministic move, or omit it to let eligible nodes race | Validates the current leader and promotion target; normal lag/timeline/synchronous checks apply |
| `patronictl failover` | Unhealthy, commonly no leader | Required | Omits synchronous-member eligibility; with no leader, an explicitly chosen node can also bypass lag and timeline checks |

Patroni allows a manual failover command against a healthy cluster, but its official documentation recommends switchover in that case. A manual failover can lose data if the chosen replica is behind.

## What a safe switchover does

For an immediate switchover from `pg1` to `pg2`, Patroni:

1. Confirms `pg1` is the current leader named in the request.
2. Checks that `pg2` is reachable, is not excluded by `nofailover: true` or `failover_priority <= 0`, has a functional required watchdog, and is an eligible healthy standby.
3. In a healthy cluster, enforces `maximum_lag_on_failover`; when `check_timeline` is enabled, rejects a candidate on an older known timeline.
4. In synchronous mode, requires a valid synchronous candidate according to the switchover rules.
5. Demotes/stops the old primary and promotes the candidate.
6. Updates cluster state so replicas follow the new primary.

HAProxy then observes `/primary` changing from `200` on `pg1` to `200` on `pg2`. Existing database sessions may be terminated; new sessions go to the new primary. Applications still need bounded reconnect and whole-transaction retry logic.

## Preflight the maintenance window

First verify DCS and cluster health:

```bash
etcdctl \
  --endpoints=https://10.50.1.11:2379,https://10.50.2.11:2379,https://10.50.3.11:2379 \
  --cacert=/etc/etcd/tls/ca.pem \
  --cert=/etc/etcd/tls/admin.pem \
  --key=/etc/etcd/tls/admin-key.pem \
  endpoint health --cluster

patronictl -c /etc/patroni/patroni.yml list prod-ha --extended
patronictl -c /etc/patroni/patroni.yml show-config prod-ha
```

Require all of the following before a routine switchover:

- Exactly one leader and at least one `streaming` replica.
- No unplanned restarts, pending reinitializations, DCS instability, or unresolved backup alert.
- Candidate Patroni API and PostgreSQL are reachable.
- Candidate is not excluded by `nofailover: true` or `failover_priority <= 0`, and any required watchdog is usable and can be activated.
- Candidate is on the current timeline and below the accepted lag limit.
- Synchronous-mode candidate is listed appropriately for the configured mode.
- HAProxy and application retry paths have been tested.

On the current primary, inspect replication directly:

```sql
SELECT application_name,
       client_addr,
       state,
       sync_state,
       write_lsn,
       flush_lsn,
       replay_lsn,
       pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS replay_byte_lag
FROM pg_stat_replication
ORDER BY application_name;
```

Choose a replica with `state = 'streaming'`, the expected `sync_state`, and minimal replay lag. Patroni's server-side switchover checks are authoritative; `patronictl list` and the SQL view supply preflight evidence.

Check for long transactions and sessions that will make the interruption expensive:

```sql
SELECT pid,
       usename,
       application_name,
       now() - xact_start AS transaction_age,
       wait_event_type,
       wait_event,
       state
FROM pg_stat_activity
WHERE xact_start IS NOT NULL
ORDER BY xact_start;
```

Drain or let important jobs finish. Pause deploys, schema changes, backup start/stop transitions, and large batch transactions for the short role-change window. Do not use Patroni's cluster pause mode merely for a normal switchover; automatic role management is part of the safety procedure.

## Execute an immediate switchover

Preview the command interactively when operating by hand. In an audited automation, specify all identities and skip only the prompt:

```bash
patronictl -c /etc/patroni/patroni.yml switchover prod-ha \
  --leader pg1 \
  --candidate pg2 \
  --scheduled now \
  --force
```

`--leader pg1` is an optimistic safety check: if leadership changed after preflight, the requested leader no longer matches and Patroni rejects the operation instead of demoting an unexpected node.

Do not run `pg_ctl promote`, call `pg_promote()`, stop PostgreSQL outside Patroni, or edit the DCS leader key. Those actions bypass eligibility and fencing logic.

## Schedule a switchover when appropriate

Patroni accepts an unambiguous timestamp, preferably with an explicit time zone:

```bash
patronictl -c /etc/patroni/patroni.yml switchover prod-ha \
  --leader pg1 \
  --candidate pg2 \
  --scheduled '2026-08-30T01:30:00+00:00' \
  --force
```

Scheduling stores an event; it does not freeze candidate health. Re-run health and lag checks before the window. If the plan changes, remove the pending event:

```bash
patronictl -c /etc/patroni/patroni.yml flush prod-ha switchover --force
```

The REST equivalent is `POST /switchover` with `leader` required and `candidate`/`scheduled_at` optional. A successful immediate operation returns `200`; a successfully scheduled one returns `202`. Validation or execution errors can return `400`, `412`, or `503` with details. Prefer `patronictl` because it displays cluster state and handles authenticated REST/DCS access.

## Observe routing during the move

From an HAProxy host, watch the exact role check used by the write backend:

```bash
while true; do
  date -u +%FT%TZ
  for host in 10.40.0.11 10.40.0.12 10.40.0.13; do
    curl --silent --output /dev/null \
      --write-out "${host} %{http_code}\n" \
      "http://${host}:8008/primary"
  done
  sleep 1
done
```

Before the operation, only `pg1` returns `200`. During demotion/promotion there may briefly be no eligible write backend. Afterward, only `pg2` returns `200`. More than one `200` is not a normal transition; remove write traffic and investigate scopes, DCS, and fencing immediately.

Do not configure HAProxy with a plain TCP check on port `5432` for writes. A running replica and a demoted former primary can both accept TCP connections while being wrong write targets.

## Validate the new primary before maintenance

Check Patroni history and membership:

```bash
patronictl -c /etc/patroni/patroni.yml list prod-ha --extended
patronictl -c /etc/patroni/patroni.yml history prod-ha
```

Through the same endpoint applications use:

```bash
psql "host=postgres-write.internal port=5000 dbname=postgres user=monitor sslmode=verify-full sslrootcert=/etc/postgresql/tls/ca.pem" \
  -c "SELECT inet_server_addr(), pg_is_in_recovery(), current_setting('transaction_read_only');"
```

Expect `pg2`'s address, `pg_is_in_recovery() = false`, and `transaction_read_only = off`.

On the new primary, verify both expected replicas stream:

```sql
SELECT application_name,
       state,
       sync_state,
       replay_lsn,
       pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS replay_byte_lag
FROM pg_stat_replication;
```

Only after `pg1` has rejoined as a replica should host-level maintenance begin. If it is stopped for package or hardware work, ensure the other replica remains healthy so the cluster does not run without redundancy.

Also verify:

- HAProxy shows one write backend up and the intended read backends.
- PgBouncer has opened new server connections to the new write route.
- Error rate and transaction retries returned to baseline.
- Backups, archiving, logical/physical replication slots, and monitoring follow the new primary.
- The cluster timeline increased and all members converge on it.

## When failover is the correct command

Use manual failover only after an unhealthy-cluster assessment, for example when there is no leader:

```bash
patronictl -c /etc/patroni/patroni.yml failover prod-ha \
  --candidate pg2 \
  --force
```

Before doing this, positively fence the former primary and compare candidate WAL positions. In a cluster without a leader, Patroni's manual failover deliberately permits an operator to choose a node even when it exceeds `maximum_lag_on_failover`, is not in the synchronous DCS key, or has an older timeline than the last known cluster timeline. That escape hatch is why failover can lose committed transactions.

Current Patroni `failover` requires `--candidate` and no longer accepts the deprecated `--leader` option. If the cluster is healthy, return to `switchover`.

## Failure modes and recovery

| Symptom | Likely reason | Safe action |
| --- | --- | --- |
| Candidate rejected | Lag, timeline, tag, watchdog, synchronous eligibility, or reachability check failed | Fix the candidate or choose another; do not force PostgreSQL promotion |
| Command reports leader mismatch | Leadership changed after preflight | Re-list the cluster and restart the decision process |
| No write backend briefly | Expected role-transition interval or failed promotion | Wait only within the runbook budget; inspect Patroni and DCS if exceeded |
| Old primary does not become a replica | Diverged timeline, rewind prerequisite/WAL failure, or maintenance shutdown | Keep it fenced; allow Patroni's configured automatic `pg_rewind` recovery, or use `reinit` |
| Applications report uncertain commits | Connection dropped around transaction commit | Reconcile using application idempotency keys/business records before retrying |
| Scheduled operation is no longer wanted | Pending DCS event remains | Use `patronictl flush ... switchover --force` |

If promotion succeeds but the old primary fails to rejoin, do not switch back merely to restore symmetry. Keep serving from the verified new leader and repair the old member as a replica. `patronictl reinit prod-ha pg1 --wait --force` rebuilds a replica when rewind is impossible, but destroys that replica's local data; preserve anything needed for forensic reconciliation first.

A completed switchover has no transaction-level “undo.” To return leadership to `pg1`, first make it a healthy, caught-up replica, then perform a second planned switchover. This creates another timeline and another short connection interruption, so do it only for an operational reason.

## References

- [Patroni `patronictl` commands](https://patroni.readthedocs.io/en/latest/patronictl.html)
- [Patroni REST switchover and failover API](https://patroni.readthedocs.io/en/latest/rest_api.html#switchover-and-failover-endpoints)
- [Patroni dynamic configuration](https://patroni.readthedocs.io/en/latest/dynamic_configuration.html)
- [Patroni replication modes](https://patroni.readthedocs.io/en/latest/replication_modes.html)
- [PostgreSQL monitoring statistics](https://www.postgresql.org/docs/current/monitoring-stats.html)
- [PostgreSQL warm standby and failover](https://www.postgresql.org/docs/current/warm-standby-failover.html)
- [PostgreSQL SSL/TLS support](https://www.postgresql.org/docs/current/ssl-tcp.html)
