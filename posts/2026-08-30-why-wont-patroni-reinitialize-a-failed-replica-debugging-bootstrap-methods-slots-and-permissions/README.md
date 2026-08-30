# Why Won't Patroni Reinitialize a Failed Replica? Debugging Bootstrap Methods, Slots, and Permissions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Patroni, Streaming Replication, Database Cluster, Disaster Recovery, Replication Slots

Description: Diagnose Patroni replica reinitialization failures across target selection, clone methods, source connectivity, replication slots, storage, and permissions.

---

`patronictl reinit` requests a potentially destructive rebuild of a Patroni-managed **replica**. With the built-in `basebackup` method, Patroni removes that member's PostgreSQL data directory and runs `pg_basebackup`; otherwise it tries configured replica-creation methods in order, and a custom method can retain the directory when `keep_data: true` is set. It cannot reinitialize the current primary, and it will not repair a bad source network, missing credentials, full filesystem, or broken backup script.

Begin with the least ambiguous command:

```bash
patronictl -c /etc/patroni/patroni.yml reinit prod-ha pg3 \
  --from-leader --wait
```

Confirm the target name and role before accepting the prompt. `--from-leader` forces the built-in `basebackup` method directly against the leader, bypassing configured custom replica-creation methods; `--wait` waits for completion instead of reporting only that the request was accepted. `--force` skips confirmation and asks Patroni to cancel an already running asynchronous task before scheduling reinitialization. It does not relax replica or leader checks or repair a failed clone path.

## 1. Verify the request is valid

```bash
patronictl -c /etc/patroni/patroni.yml list prod-ha --extended
curl --silent http://10.40.0.13:8008/patroni
```

Check that:

- `pg3` is a member of the expected `scope` and DCS namespace;
- it is a replica, not the primary or standby leader;
- the DCS cluster currently has a leader;
- its Patroni REST API is reachable and authenticated for unsafe methods;
- Patroni is running on the target; and
- no previous reinitialize or restart action is still active.

If the command targets the wrong cluster file, the same member name can refer to a different DCS scope. Treat `--force` as a confirmation and in-progress-action override, not target validation.

## 2. Read the target Patroni log

The `patronictl` response is only the control-plane view. Replica creation runs on the target under the Patroni service account, so inspect that member's complete log from request time through the final child-process exit.

Classify the first causal error rather than the last generic "bootstrap failed" message:

| Error family | Likely layer |
| --- | --- |
| Cannot connect, timeout, name resolution | Route from target to selected clone source |
| No `pg_hba.conf` entry, password failure | Replication role, TLS, HBA, or secret |
| No free replication connection | `max_wal_senders`, connection load, or source availability |
| Replication slot cannot be created | Slot capacity, name collision, permissions, or source route |
| Permission denied under `PGDATA` | OS ownership, mount permissions, SELinux/AppArmor |
| No space left | Data, WAL, tablespace, or temporary filesystem capacity |
| Custom method exited nonzero | Script contract, binary, credentials, or backup repository |
| Missing WAL after clone | Source/archive retention or replica start delay |

Preserve the log and any failed target state that Patroni has not already cleaned until the cause is understood. Repeatedly invoking reinit can erase useful partial state and repeatedly consume source I/O.

## 3. Check replica-creation method order

Patroni uses `postgresql.create_replica_methods` in order and stops at the first method that exits successfully. The built-in `basebackup` is used when the list is empty and may also be listed explicitly:

```yaml
postgresql:
  create_replica_methods:
    - wal_e
    - basebackup

  wal_e:
    command: patroni_wale_restore
    no_leader: 1
    envdir: /etc/wal-e.d/env
```

This follows Patroni's documented custom-method example; an actual WAL-E deployment still needs the backup tool's own repository and credential configuration. Patroni passes cluster arguments such as `--scope`, `--datadir`, `--role`, and `--connstring` unless `no_params: true` is set. The command must be executable by the Patroni OS user and return zero only after it has produced a valid replica data directory.

`no_leader` allows a custom method to run without a live leader or replica source during Patroni's source-less replica-creation path—useful for a backup repository. It does not make built-in `pg_basebackup` independent of a running PostgreSQL source, and it does not bypass the reinitialize endpoint's requirement that the DCS cluster currently have a leader.

A standby cluster has a separate `standby_cluster.create_replica_methods` selection that references method definitions under `postgresql`. Confirm you are debugging the correct list for the cluster's current mode.

## 4. Test the clone path as Patroni's OS user

From the failed replica host, resolve and connect to the actual source chosen by Patroni. Verify TCP, TLS trust, server-name validation, replication credentials, and HBA rules. Do not test only from an administrator laptop.

PostgreSQL requires the base-backup connection role to have `REPLICATION` (or superuser) and `LOGIN`, and `pg_hba.conf` must allow a physical replication connection from the target address. The source needs an available WAL sender for the backup plus another for WAL streaming, which is `pg_basebackup`'s default WAL method. Keep secrets out of command history; use Patroni's configured authentication or a correctly owned password file.

`pg_basebackup` can use a replication slot, which PostgreSQL recommends because it prevents required WAL from being removed during the backup. That also means the source must have slot capacity and disk monitoring.

Inspect on the source:

```sql
SHOW max_wal_senders;
SHOW max_replication_slots;

SELECT slot_name, slot_type, active, restart_lsn,
       wal_status, safe_wal_size
FROM pg_replication_slots
ORDER BY slot_name;

SELECT application_name, client_addr, state, sent_lsn, replay_lsn
FROM pg_stat_replication
ORDER BY application_name;
```

Some columns vary by PostgreSQL major version; use the documentation for the deployed version. Never drop an unfamiliar slot just to free capacity. A logical consumer or offline physical replica may depend on it, while an abandoned slot may be retaining enough WAL to fill `pg_wal`. Resolve ownership before changing it.

## 5. Check target storage and ownership

Patroni must be able to stop PostgreSQL, remove or replace the configured `data_dir`, create directories, write configuration, and set required permissions as its service user. Read the target member's local Patroni configuration and service environment to find the exact path rather than assuming the package default, then inspect that path:

```bash
df -h /var/lib/postgresql
df -i /var/lib/postgresql
namei -l /var/lib/postgresql/18/main
```

Also inspect tablespace mounts, backup scratch space, inode capacity, read-only mounts, quotas, and mandatory-access-control denials. Fix the owning mount or policy; do not recursively change permissions across an unknown PostgreSQL tree.

With the built-in `basebackup` method, reinitialization removes or replaces the replica data directory; a custom replica-creation method can retain it with `keep_data: true`. Back up any target-only diagnostic files first, and remember that user-defined tablespaces may live outside `PGDATA`. Verify your Patroni version's behavior and clean only paths positively owned by this failed replica.

## 6. Handle WAL and configuration edge cases

With the built-in `basebackup` method's `-X stream`, the backup already includes the WAL required for a consistent startup. A custom method that omits required WAL must retrieve it from the archive. The replica still needs subsequent WAL to catch up, so ensure streaming starts promptly or retention or an archive covers the gap. Inspect restore-command errors, timeline history, source slot state, and receiver logs.

Patroni also documents a configuration edge case: it expects `postgresql.conf` or `postgresql.conf.backup` in `PGDATA` after base backup for a standby cluster. If the source stores PostgreSQL configuration elsewhere, the replica-creation procedure is responsible for providing the expected file.

Use `pg_rewind` for a diverged former primary only when its prerequisites and history are intact. Reinit is the clean fallback when rewind is impossible; with the built-in `basebackup` method, it consumes a full copy and discards the target's old data.

## Verify the rebuilt replica

Completion means more than a successful command exit:

```bash
patronictl -c /etc/patroni/patroni.yml list prod-ha --extended
```

On the rebuilt node, verify:

```sql
SELECT pg_is_in_recovery(),
       pg_last_wal_receive_lsn(),
       pg_last_wal_replay_lsn(),
       pg_last_xact_replay_timestamp();
```

It must remain in recovery, stream on the current timeline, and converge below the cluster's lag objective. Only then restore read routing or failover eligibility. Confirm local `nofailover`, `noloadbalance`, `nosync`, and related tags still express the intended policy.

## Official Documentation

- [Patroni `reinit` command](https://patroni.readthedocs.io/en/latest/patronictl.html#patronictl-reinit)
- [Patroni REST reinitialize endpoint](https://patroni.readthedocs.io/en/latest/rest_api.html#reinitialize-endpoint)
- [Patroni replica imaging and bootstrap](https://patroni.readthedocs.io/en/latest/replica_bootstrap.html)
- [Patroni standby clusters](https://patroni.readthedocs.io/en/latest/standby_cluster.html)
- [Patroni YAML configuration](https://patroni.readthedocs.io/en/latest/yaml_configuration.html)
- [PostgreSQL `pg_basebackup`](https://www.postgresql.org/docs/current/app-pgbasebackup.html)
- [PostgreSQL replication slots](https://www.postgresql.org/docs/current/warm-standby.html#STREAMING-REPLICATION-SLOTS)
- [PostgreSQL replication-role attributes](https://www.postgresql.org/docs/current/role-attributes.html)

## Conclusion

Debug reinitialization from the target outward: validate the replica and cluster identity, read the first Patroni error, confirm method order, test the source path as the Patroni user, and inspect slots, WAL retention, storage, and permissions. Reinit can destroy a replica's data directory, so repeat it only after fixing the underlying cause and verify the rebuilt node reaches the current timeline before restoring service.
