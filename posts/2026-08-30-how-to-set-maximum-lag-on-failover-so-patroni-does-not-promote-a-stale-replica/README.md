# How to Set `maximum_lag_on_failover` So Patroni Does Not Promote a Stale Replica

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Patroni, Failover, Replication Lag, Streaming Replication, High Availability

Description: Turn a PostgreSQL recovery-point objective into a Patroni failover lag limit, account for election sampling, and verify the policy under load.

---

Patroni's dynamic `maximum_lag_on_failover` setting is the maximum number of bytes a follower may lag and still participate in a normal leader election. It is an availability-versus-data-loss gate: a lower value rejects more stale candidates, but can leave the cluster without an automatic failover target.

It is not a promise that at most exactly that many bytes can be lost. Patroni documents a wider asynchronous-replication bound: the threshold plus WAL written during the last `ttl` seconds, because the primary WAL position is sampled rather than known continuously. Typical lag may be much lower, but the failure policy must use the conservative bound.

## Start from an RPO and measured WAL rate

Suppose the business accepts at most 30 seconds of acknowledged-write exposure during a regional incident. Measure WAL generation across representative peaks, not an idle average:

```sql
SELECT pg_current_wal_lsn();
-- wait for a controlled observation interval under representative load
SELECT pg_current_wal_lsn();
```

Use `pg_wal_lsn_diff(new_lsn, old_lsn)` to calculate how far the WAL write position advanced, in bytes, during that interval. Also collect the counter `pg_stat_wal.wal_bytes` on supported PostgreSQL releases. Record ordinary peaks, batch jobs, maintenance, index creation, and write bursts.

A useful sizing exercise is:

```text
RPO byte budget       = peak WAL bytes/second × RPO seconds
sampling exposure     = peak WAL bytes/second × Patroni ttl seconds
configured threshold  <= RPO byte budget - sampling exposure - safety margin
```

If the right-hand side is zero or negative, tuning the lag threshold cannot meet the RPO with the current asynchronous design and Patroni timing. Reduce `ttl` only after validating Patroni's timing constraint and DCS/network reliability, reduce peak lag, or use an appropriate synchronous mode.

For example, a sustained peak of 8 MiB/s and `ttl: 30` already implies up to roughly 240 MiB of sampling exposure before adding the configured threshold. A `maximum_lag_on_failover` of 64 MiB does not turn that architecture into a 64 MiB worst-case RPO.

## Inspect and change the dynamic configuration

The setting belongs in Patroni's cluster-wide dynamic configuration stored in the DCS. Check the live value:

```bash
patronictl -c /etc/patroni/patroni.yml show-config prod-ha
```

Edit interactively:

```bash
patronictl -c /etc/patroni/patroni.yml edit-config prod-ha
```

Then set an integer number of bytes, for example:

```yaml
maximum_lag_on_failover: 67108864
check_timeline: true
```

For reviewed automation, Patroni also supports:

```bash
patronictl -c /etc/patroni/patroni.yml edit-config prod-ha \
  --set maximum_lag_on_failover=67108864 --force
```

Do not change only `bootstrap.dcs` in local YAML after the cluster exists. That section initializes DCS state once at bootstrap. Confirm the new DCS value with `patronictl show-config`. Dynamic changes reach members asynchronously, so check each member's logs and, if necessary, its `patroni.dynamic.json` cache to verify that it processed the new configuration.

`check_timeline: true` is a complementary guard: during a healthy switchover or automatic failover, a node on an older known timeline is not an acceptable candidate. It does not replace lag checking.

## Observe receive and replay positions

On the primary, examine each WAL sender:

```sql
SELECT application_name,
       client_addr,
       state,
       sync_state,
       sent_lsn,
       write_lsn,
       flush_lsn,
       replay_lsn,
       pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS replay_byte_lag
FROM pg_stat_replication
ORDER BY application_name;
```

On a replica:

```sql
SELECT pg_last_wal_receive_lsn(),
       pg_last_wal_replay_lsn(),
       pg_wal_lsn_diff(pg_last_wal_receive_lsn(),
                       pg_last_wal_replay_lsn()) AS local_replay_gap,
       pg_last_xact_replay_timestamp();
```

These views explain different bottlenecks. A receive position behind the primary points toward network, sender, receiver, or source pressure. While streaming replication is active, a large positive local receive-to-replay gap means streamed WAL arrived but replay is delayed, perhaps by recovery conflicts, I/O, deliberate apply delay, or resource saturation.

Patroni's election check does not use replay lag alone: for a replica, it uses the greater of the receive and replay LSN as the candidate WAL position. Do not convert `pg_last_xact_replay_timestamp()` into an exact byte or time lag when the primary is idle; once the replica has replayed the last transaction, the value remains unchanged while wall-clock time advances. Monitor positions, rates, receiver state, and time signals together.

## Separate three different lag controls

Similar names serve different purposes:

- `maximum_lag_on_failover` gates leader-election participation.
- `maximum_lag_on_syncnode` controls when Patroni may replace an unhealthy synchronous follower with a healthier asynchronous one; its documented default and disable behavior differ.
- `/replica?lag=64MB` is a REST health-check limit for read routing.

Changing the HAProxy read threshold does not protect an election. Changing the failover threshold does not automatically remove a lagging replica from application read traffic. Configure and alert on each contract explicitly.

## Test the unavailability side of the policy

In a disposable cluster, stop or throttle WAL receipt on one replica, generate known writes, and wait until its candidate WAL position falls more than the selected byte limit behind Patroni's last known leader position. Pausing WAL replay alone is not sufficient because Patroni can count WAL that the replica has received but not yet replayed. Keep another current replica if the test should preserve failover capability.

Verify the lagging member is visible but ineligible, then perform a planned candidate check or a controlled primary failure according to the test runbook. Patroni should prefer an eligible up-to-date node. If every replica is beyond the threshold, automatic failover should not promote one merely to restore availability.

Test the recovery path too: after the replica catches up below the limit, confirm it becomes eligible again without operator folklore or stale monitoring state.

Never validate an RPO with only a clean switchover. Exercise peak WAL generation, delayed receive, delayed replay, and a failure just before the next Patroni observation. Record acknowledged business operations and reconcile them after promotion.

## Know which operation can bypass the guard

Patroni's REST API documents an important escape hatch: during a manual failover when the cluster has no leader, an operator-selected candidate can be promoted even if its lag exceeds `maximum_lag_on_failover`, its timeline is older than the last known cluster timeline, or it is not in the synchronous member set. This supports disaster recovery when availability is chosen over data preservation.

Protect that command with authorization, an explicit data-loss approval, candidate WAL comparison, and fencing of the former primary. Do not present manual failover as equivalent to the automatic policy.

If committed transaction loss is unacceptable, evaluate Patroni synchronous or quorum mode. Synchronous durability trades write availability and latency for stronger promotion constraints; the correct setting depends on failure domains and application requirements.

## Official Documentation

- [Patroni dynamic configuration settings](https://patroni.readthedocs.io/en/latest/dynamic_configuration.html)
- [Patroni replication modes and lag bound](https://patroni.readthedocs.io/en/latest/replication_modes.html)
- [Patroni REST API candidate checks](https://patroni.readthedocs.io/en/latest/rest_api.html)
- [Patroni configuration](https://patroni.readthedocs.io/en/latest/patroni_configuration.html)
- [PostgreSQL replication statistics](https://www.postgresql.org/docs/current/monitoring-stats.html#MONITORING-PG-STAT-REPLICATION-VIEW)
- [PostgreSQL WAL control functions](https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-ADMIN-BACKUP)

## Conclusion

Set `maximum_lag_on_failover` from a measured peak WAL rate and a stated RPO, while budgeting for Patroni's `ttl` sampling window. Apply it through dynamic configuration, monitor receive and replay positions, and test the no-candidate outcome. The setting reduces asynchronous failover risk; it cannot by itself guarantee zero loss or override an operator who deliberately invokes an unsafe manual failover.
