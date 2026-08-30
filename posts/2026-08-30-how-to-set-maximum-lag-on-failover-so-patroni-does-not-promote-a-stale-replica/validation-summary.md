# Validation Summary: How to Set `maximum_lag_on_failover` So Patroni Does Not Promote a Stale Replica

## Status

validated

## Post Type

Technical guide / operational runbook

## Technologies Covered

- PostgreSQL physical streaming replication
- PostgreSQL WAL, LSN functions, and replication statistics
- Patroni 4.1.5 dynamic configuration and leader election
- `patronictl` CLI
- Patroni REST API health checks
- Distributed Configuration Store (DCS)
- HAProxy read routing

## Sources Consulted

- [Patroni dynamic configuration settings](https://patroni.readthedocs.io/en/latest/dynamic_configuration.html)
- [Patroni replication modes](https://patroni.readthedocs.io/en/latest/replication_modes.html)
- [Patroni REST API](https://patroni.readthedocs.io/en/latest/rest_api.html)
- [Patroni configuration](https://patroni.readthedocs.io/en/latest/patroni_configuration.html)
- [Patroni YAML bootstrap configuration](https://patroni.readthedocs.io/en/latest/yaml_configuration.html#bootstrap-configuration)
- [`patronictl show-config` and `edit-config`](https://patroni.readthedocs.io/en/latest/patronictl.html)
- [Patroni 4.1.5 source: replica WAL-position calculation](https://github.com/patroni/patroni/blob/v4.1.5/patroni/postgresql/__init__.py#L1269-L1279)
- [Patroni 4.1.5 source: election lag comparison](https://github.com/patroni/patroni/blob/v4.1.5/patroni/ha.py#L1357-L1365)
- [PostgreSQL WAL and recovery functions](https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-ADMIN-BACKUP)
- [PostgreSQL recovery information functions](https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-RECOVERY-INFO-TABLE)
- [PostgreSQL `pg_stat_replication`](https://www.postgresql.org/docs/current/monitoring-stats.html#MONITORING-PG-STAT-REPLICATION-VIEW)
- [PostgreSQL `pg_stat_wal`](https://www.postgresql.org/docs/current/monitoring-stats.html#MONITORING-PG-STAT-WAL-VIEW)
- [PostgreSQL 14 release notes](https://www.postgresql.org/docs/14/release-14.html)
- [PostgreSQL streaming-replication monitoring](https://www.postgresql.org/docs/current/warm-standby.html#STREAMING-REPLICATION-MONITORING)
- [PostgreSQL hot-standby conflicts](https://www.postgresql.org/docs/current/hot-standby.html#HOT-STANDBY-CONFLICT)
- [PostgreSQL `recovery_min_apply_delay`](https://www.postgresql.org/docs/current/runtime-config-replication.html#GUC-RECOVERY-MIN-APPLY-DELAY)

## Issues Found

1. **WAL sampling terminology** - `pg_current_wal_lsn()` reports the current WAL write location, so a difference between two samples measures WAL write-position advancement rather than an exact generated-byte counter at each endpoint. Changed the explanation accordingly; `pg_stat_wal.wal_bytes` remains the cumulative generated-WAL counter.
2. **Per-member configuration verification** - `patronictl show-config` displays the cluster dynamic configuration stored in the DCS; it does not demonstrate that every Patroni member has already processed the change. Updated the instructions to distinguish the DCS check from per-member verification through logs or the local `patroni.dynamic.json` cache.
3. **Receive-to-replay gap interpretation** - `pg_last_wal_receive_lsn()` describes WAL received and synced through streaming replication and may be `NULL` when streaming has not started. Qualified the explanation so that only a large positive gap while streaming is active is described as streamed WAL waiting for replay.
4. **Transaction replay timestamp wording** - `pg_last_xact_replay_timestamp()` can represent the primary timestamp of a replayed commit or abort record, not only a commit timestamp. Reworded the idle-primary caveat to refer to the transaction replay timestamp.
5. **Invalid failover-lag test method** - Pausing WAL replay alone does not necessarily make a replica exceed `maximum_lag_on_failover`. Patroni uses the greater of the replica's received and replayed LSN as its election WAL position, so receipt can remain current while replay is paused. Changed the test to stop or throttle WAL receipt and clarified the position Patroni compares.

## Review Notes

- The `patronictl show-config` and `edit-config` commands, global `-c` option, `--set`, and `--force` syntax are valid in Patroni 4.1.5. The example value `67108864` is a valid integer-byte setting equal to 64 MiB.
- The documented asynchronous-loss bound of `maximum_lag_on_failover` plus WAL written during the last `ttl` seconds is correct. Patroni's timing constraint is `loop_wait + 2 * retry_timeout <= ttl`.
- `check_timeline`, `maximum_lag_on_syncnode`, `/replica?lag=64MB`, one-time `bootstrap.dcs` initialization, and the manual-failover bypass conditions are described accurately.
- `pg_stat_wal.wal_bytes` is available beginning with PostgreSQL 14 and is present in all PostgreSQL releases supported on the validation date.
- Positions reported by `pg_stat_replication` are standby status-feedback values and need not update instantaneously; the post correctly recommends combining positions, rates, receiver state, and timestamps.
- Patroni synchronous mode has availability and configuration caveats, including the distinction between regular and strict synchronous mode. The post appropriately says to evaluate synchronous or quorum mode rather than claiming an unconditional zero-loss guarantee.
