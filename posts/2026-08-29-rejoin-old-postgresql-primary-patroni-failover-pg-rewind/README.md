# How to Rejoin the Old PostgreSQL Primary After Patroni Failover with `pg_rewind`

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Patroni, Failover, Streaming Replication, WAL, Disaster Recovery

Description: Rejoin a fenced former Patroni primary on the new PostgreSQL timeline using pg_rewind, with safe fallback to replica reinitialization.

---

After a Patroni failover, a former primary that generated WAL past the new timeline's fork point cannot simply start streaming from the promoted replica. Promotion creates a new timeline, and the old primary's data directory then contains changes that do not exist on the new primary's timeline. If the former primary ended exactly at the fork point, no rewind is needed, but it still must be configured and started as a replica under Patroni.

`pg_rewind` makes that former primary usable as a replica without copying the entire cluster. Patroni can detect the divergence, stop the target safely, run `pg_rewind` against the current leader, and start it in recovery.

The most important rule is: **fence the old primary and leave PostgreSQL under Patroni control**. Never start it as a standalone primary to “see whether it works.”

## What changes at failover

Suppose `pg1` was primary on timeline 7 and `pg2` was promoted:

```text
timeline 7:  ---- common WAL ----+---- writes unique to old pg1
                                 |
timeline 8:                      +---- writes on new primary pg2
```

The timeline history file for timeline 8 records the switch point and parent timeline. PostgreSQL replicas use that history to follow the new branch. The old primary's local blocks may reflect its unique timeline-7 WAL, so changing only `primary_conninfo` is not enough.

`pg_rewind`:

1. Compares source and target timeline histories to locate divergence.
2. Scans the target's WAL from the last checkpoint before that point to identify blocks changed on the target branch.
3. Copies the current versions of those blocks from the source, plus files that were created, removed, or otherwise need synchronization.
4. Prepares the target so source-timeline WAL can be replayed to reach consistency.

The **target** is the old primary (`pg1`). The **source** is the current primary (`pg2`). Reversing them destroys the wrong history.

`pg_rewind` is physical convergence, not conflict resolution. Transactions committed only on the old primary's losing branch are discarded. Preserve forensic evidence before rewind if the business needs to examine or reconcile them.

## Prepare the cluster before any failure

`pg_rewind` requires all of these conditions:

- Source and target belong to the same PostgreSQL cluster/system identifier and use the same major version and compatible architecture.
- Before the relevant target changes were generated, the target had either data checksums enabled at `initdb` time **or** `wal_log_hints=on`; enabling `wal_log_hints` only after failover is too late.
- `full_page_writes=on` remained enabled while the WAL used by rewind was generated.
- Target WAL from the last checkpoint before divergence through the target's end-of-WAL remains in `pg_wal` or is retrievable from its WAL archive.
- Source-timeline WAL needed after rewind to reach the minimum consistency point remains available from the source or its WAL archive for recovery startup.
- The source is reachable using a normal SQL connection with sufficient rewind permissions (or a superuser).
- The target is stopped. If it was not shut down cleanly, current `pg_rewind` can complete crash recovery in single-user mode by default; Patroni also manages this state before invoking rewind.

For a new Patroni cluster, enable rewind and checksums at bootstrap:

```yaml
bootstrap:
  dcs:
    postgresql:
      use_pg_rewind: true
      parameters:
        wal_log_hints: "on"
        full_page_writes: "on"
  initdb:
    - encoding: UTF8
    - data-checksums
```

After bootstrap, `use_pg_rewind` is dynamic configuration. Verify it with `show-config` and, if necessary, change it with `edit-config`:

```bash
patronictl -c /etc/patroni/patroni.yml show-config prod-ha
patronictl -c /etc/patroni/patroni.yml edit-config prod-ha \
  --set postgresql.use_pg_rewind="true"
```

On each node, configure a dedicated rewind account:

```yaml
postgresql:
  authentication:
    rewind:
      username: rewind_user
      password: REPLACE_WITH_SECRET
      sslmode: verify-full
      sslrootcert: /etc/patroni/tls/postgres-ca.pem
  remove_data_directory_on_rewind_failure: false
  remove_data_directory_on_diverged_timelines: false
```

On PostgreSQL 11 and newer, Patroni creates the configured rewind role at initialization and grants the functions it needs. Existing clusters may need the version-specific grants listed in the PostgreSQL `pg_rewind` documentation. Ensure `pg_hba.conf` permits that account from Patroni members using the required TLS/authentication policy.

Keeping both removal options `false` prevents Patroni's rewind and divergence paths from automatically deleting and rebuilding the replica. It does not make a failed rewind rollback-safe: `pg_rewind` may already have modified `PGDATA` and left it unusable. Preserve any required forensic copy before the attempt. Once backups and the reinitialization runbook are proven, an organization may explicitly choose automatic rebuild behavior; that is a destructive policy decision, not a prerequisite for rewind.

Configure WAL archiving and test restores. On current PostgreSQL releases, `pg_rewind --restore-target-wal` can invoke the target cluster's `restore_command` when required target WAL is no longer in `pg_wal`. Patroni can use the configured recovery/archive integration as part of its rewind handling.

## Stabilize the new primary first

After failover, do not rush to start the old host. Establish the authoritative cluster state:

```bash
patronictl -c /etc/patroni/patroni.yml list prod-ha --extended
patronictl -c /etc/patroni/patroni.yml history prod-ha
```

Confirm:

- Exactly one Patroni leader exists.
- The promoted node returns `200` for `/primary`.
- Applications and backups now use the promoted node.
- At least one other replica is healthy, if available.
- The DCS is healthy and, where applicable, its quorum is stable.

Fence `pg1` at every write path until Patroni controls it: disable or remove the `pg1` server entry from the HAProxy backend, block application traffic, and use power/storage fencing if its state is uncertain. Fencing must still allow controlled access from `pg1` to the new primary and to any WAL archive or backup services required for rewind or reinitialization.

## Let Patroni perform the rewind

Once `pg1` is reachable and its Patroni/PostgreSQL configuration still identifies the same `scope`, restart **Patroni**, not the standalone PostgreSQL service:

```bash
systemctl start patroni
journalctl -u patroni --follow
```

Patroni reads local control data and the DCS cluster view. When it detects that `pg1` diverged from the current leader and `use_pg_rewind` is enabled, it determines whether rewind is possible, ensures the target is stopped/consistent, and invokes the matching `pg_rewind` binary from `postgresql.bin_dir` or `PATH`.

Useful log milestones include:

- Divergence/timeline comparison against the current leader
- Crash-recovery completion if the old target was not cleanly shut down
- `pg_rewind` start and completion
- Recovery configuration on `pg1` pointing to the new leader
- PostgreSQL starting as a replica and entering `streaming`

Do not copy a `standby.signal` or hand-edit `postgresql.auto.conf` while Patroni is doing this. Patroni owns recovery configuration and may overwrite or reject conflicting settings.

## Use a dry run only for controlled diagnosis

If automatic rewind does not begin, stop Patroni on the target and gather evidence. A `pg_rewind --dry-run` does not apply the rewind's source-to-target file changes:

```bash
systemctl stop patroni

sudo -H -u postgres -- /usr/lib/postgresql/18/bin/pg_rewind \
  --dry-run \
  --progress \
  --restore-target-wal \
  --config-file=/etc/postgresql/18/main/postgresql.conf \
  --target-pgdata=/var/lib/postgresql/18/main \
  --source-server='host=pg2.internal port=5432 dbname=postgres user=rewind_user sslmode=verify-full sslrootcert=/etc/patroni/tls/postgres-ca.pem'
```

Run `pg_rewind` as the operating-system account that owns `PGDATA`; it refuses to run as root. Use a protected password file or secret provider rather than putting a password in the command line. The target must remain fenced, offline, and already cleanly shut down: `--dry-run` skips automatic crash recovery, so verify that no postmaster remains and that the control state is clean. `--restore-target-wal` can execute the target configuration's `restore_command` even during a dry run and place missing segments in `pg_wal`. The shown `--config-file` is required for this Debian-style layout because the main server configuration is outside `PGDATA`; adjust it if the target configuration path differs. Verify the restore command and archive credentials before the dry run.

An actual manual `pg_rewind` should be a break-glass procedure owned by the PostgreSQL runbook, with Patroni stopped and a recoverable copy of target configuration. Patroni normally supplies the correct source and then configures recovery. Running both at once risks concurrent changes to `PGDATA`.

## Verify the rejoined replica

Patroni should show `pg1` as a streaming replica on the new timeline:

```bash
patronictl -c /etc/patroni/patroni.yml list prod-ha --extended

curl --include http://10.40.0.11:8008/replica
curl --silent http://10.40.0.11:8008/patroni | jq '{role,state,xlog,timeline}'
```

The `/replica` endpoint returns `200` only for a running replica that is eligible for load balancing. A `503` is expected while `noloadbalance` is `true`; use `/patroni`, `patronictl`, and PostgreSQL statistics to verify replication independently.

On the rejoined node:

```sql
SELECT pg_is_in_recovery(),
       pg_last_wal_receive_lsn(),
       pg_last_wal_replay_lsn(),
       pg_last_xact_replay_timestamp();

SELECT status,
       sender_host,
       sender_port,
       written_lsn,
       flushed_lsn,
       latest_end_lsn
FROM pg_stat_wal_receiver;
```

Expect `pg_is_in_recovery() = true`, one WAL-receiver row while streaming, and receive/replay LSNs that advance when the source generates WAL.

On the current primary:

```sql
SELECT application_name,
       state,
       sync_state,
       replay_lsn,
       pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS byte_lag
FROM pg_stat_replication
WHERE application_name = 'pg1';
```

Wait until lag returns to the operational threshold. Only then restore read traffic or failover eligibility. Confirm `nofailover`/`noloadbalance` tags have the intended values rather than clearing them automatically.

## If rewind is impossible, reinitialize

Common blockers are missing target WAL, neither checksums nor `wal_log_hints`, `full_page_writes=off`, authentication failure, different system identifiers, unavailable tablespaces, or a partial previous rewind.

Do not repeatedly restart the target. Preserve logs and any divergent data needed for investigation. Then rebuild the Patroni member from the current cluster:

```bash
patronictl -c /etc/patroni/patroni.yml reinit prod-ha pg1 \
  --from-leader --wait --force
```

`reinit` destroys and recreates the replica's PostgreSQL data directory. Confirm the member named `pg1` is a replica—not the current leader—and obtain explicit destructive-operation approval in the operational runbook. A fresh base backup takes longer and uses more network/storage than rewind but is the safe fallback.

## Failure modes and recovery

| Symptom | Likely cause | Safe response |
| --- | --- | --- |
| Patroni says rewind is not possible | Checksums off and `wal_log_hints` off, or binary missing | Reinitialize from a fresh base backup |
| `could not find previous WAL record` or missing segment | Target no longer has WAL back to the last checkpoint before divergence | Restore target WAL from archive with `restore_command`, or reinitialize |
| Source connection denied | Rewind account, HBA, TLS, or function grants are wrong | Fix least-privilege access and rerun only after a dry run passes |
| Target starts as primary | Patroni was bypassed or recovery config is missing | Immediately isolate it; stop PostgreSQL and re-establish Patroni-controlled recovery |
| Rewind fails after modifying files | Target directory may be unrecoverable | Do not start it; reinitialize or restore a known-good copy |
| Replica streams but is far behind | WAL receive/replay is still catching up | Keep it out of reads/failover until within policy |

There is no rollback of a partly applied rewind. PostgreSQL's documentation warns that failure during processing can leave the target data directory unrecoverable. Use a fresh base backup or restore a pre-rewind filesystem snapshot that was taken while the target was stopped and is known consistent.

Rejoining the old host restores redundancy; it does not recover transactions that were acknowledged only on the divergent old timeline. Reconcile those from preserved evidence at the application/business layer.

## References

- [PostgreSQL `pg_rewind`](https://www.postgresql.org/docs/current/app-pgrewind.html)
- [PostgreSQL timeline history and continuous archiving](https://www.postgresql.org/docs/current/continuous-archiving.html)
- [PostgreSQL warm standby and failover](https://www.postgresql.org/docs/current/warm-standby-failover.html)
- [Patroni dynamic configuration](https://patroni.readthedocs.io/en/latest/dynamic_configuration.html)
- [Patroni YAML configuration settings](https://patroni.readthedocs.io/en/latest/yaml_configuration.html)
- [Patroni `patronictl reinit`](https://patroni.readthedocs.io/en/latest/patronictl.html#patronictl-reinit)
- [Patroni rewind implementation reference](https://patroni.readthedocs.io/en/latest/modules/patroni.postgresql.rewind.html)
