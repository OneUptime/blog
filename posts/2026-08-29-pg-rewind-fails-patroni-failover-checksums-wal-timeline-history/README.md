# Why Does `pg_rewind` Fail After a Patroni Failover? Checking Checksums, WAL, and Timeline History

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Patroni, Failover, WAL, WAL Archiving, Streaming Replication, Disaster Recovery

Description: Diagnose Patroni pg_rewind failures by checking page-change tracking, WAL retention, timeline history, credentials, and target integrity.

---

`pg_rewind` is fast because it does not copy every database block. It identifies where the former primary's timeline diverged, scans that target branch's WAL to learn which blocks changed, and copies the authoritative versions from the new primary.

That design explains most failures. Rewind cannot proceed if PostgreSQL did not record enough page-change information, the target no longer has WAL back to the divergence checkpoint, timeline history cannot be followed, or the source/target are not compatible copies of the same cluster.

Do not “fix” a rewind error by starting the former primary. Keep the target fenced, stop Patroni while gathering offline evidence, and decide between restoring prerequisites and taking a fresh base backup.

## Identify source and target before touching data

After failover:

- **Source:** the current Patroni leader/new PostgreSQL primary—the timeline to preserve.
- **Target:** the old primary that must be transformed into a replica.

Confirm from a healthy member:

```bash
patronictl -c /etc/patroni/patroni.yml list prod-ha --extended
patronictl -c /etc/patroni/patroni.yml history prod-ha
```

Then make sure the target cannot receive client writes. Stop its Patroni service for manual diagnosis:

```bash
systemctl stop patroni
```

Do not stop the current leader. Preserve Patroni and PostgreSQL logs, `pg_controldata` output, archive errors, and the exact `pg_rewind` stderr before retrying.

## Check the non-negotiable prerequisites

On the source, inspect current values:

```sql
SHOW data_checksums;
SHOW wal_log_hints;
SHOW full_page_writes;
SHOW server_version;
```

On the stopped target, use the `pg_controldata` from the same PostgreSQL major version:

```bash
/usr/lib/postgresql/18/bin/pg_controldata /var/lib/postgresql/18/main \
  | grep -E 'Database system identifier|Database cluster state|Data page checksum version|wal_log_hints|Latest checkpoint'
```

The rules are:

1. The target must have had either data checksums enabled when initialized **or** `wal_log_hints=on` while it generated the WAL being examined.
2. `full_page_writes` must be `on`.
3. Source and target must have the same database system identifier, PostgreSQL major version, and compatible machine architecture/build.
4. The target must be stopped cleanly for rewind. Current `pg_rewind` normally tries single-user crash recovery if it was not cleanly shut down; missing libraries/configuration can make that preliminary recovery fail.

PostgreSQL 18 may initialize new clusters with checksums by default, but older clusters and upgraded data directories may not have them. Always inspect the actual target. Turning `wal_log_hints` on **after** divergence cannot reconstruct the missing historic page-change evidence, and enabling checksums later does not retroactively repair an already-ineligible branch.

Patroni performs a similar eligibility check using `pg_controldata`. In dynamic configuration, verify:

```yaml
postgresql:
  use_pg_rewind: true
```

If both target checksums and historic `wal_log_hints` are absent, stop troubleshooting rewind and reinitialize the replica from a fresh base backup.

## Understand which WAL rewind needs

`pg_rewind` compares timeline histories, finds the fork point, then scans **target WAL** beginning at the last checkpoint before divergence. It expects WAL in the target's `pg_wal` directory all the way back to the needed point. This is different from merely retaining recent WAL on the new primary.

A typical failure sequence is:

1. `pg1` loses contact but remains active briefly.
2. `pg2` promotes on a new timeline.
3. `pg1` stays offline long enough that the target's old WAL is recycled or removed.
4. Rewind cannot scan the target branch back to the fork checkpoint.

Inventory the target WAL without modifying it:

```bash
find /var/lib/postgresql/18/main/pg_wal -maxdepth 1 -type f \
  -name '[0-9A-F][0-9A-F][0-9A-F][0-9A-F][0-9A-F][0-9A-F][0-9A-F][0-9A-F]*' \
  -print | sort
```

If archived target WAL exists, configure and test the target's `restore_command`. Current `pg_rewind` can retrieve missing target segments with:

```bash
/usr/lib/postgresql/18/bin/pg_rewind \
  --dry-run \
  --restore-target-wal \
  --progress \
  --target-pgdata=/var/lib/postgresql/18/main \
  --source-server='host=pg2.internal port=5432 dbname=postgres user=rewind_user sslmode=verify-full sslrootcert=/etc/patroni/tls/postgres-ca.pem'
```

`--restore-target-wal` invokes the `restore_command` defined in the target configuration. If Patroni generates configuration outside `PGDATA`, pass the correct main file with `--config-file` in a manual diagnostic. Test archive retrieval using a non-destructive archive command/runbook before assuming it works.

Do not copy guessed WAL files from the new primary into the target. The segment name includes a timeline, and rewind specifically needs records from the target branch or a common ancestor. Use the verified archive and exact error message.

## Check timeline history rather than comparing only timeline numbers

A promotion creates a new timeline and a small `.history` file describing its parent and switch LSN. Timeline 9 is not automatically “newer data” than timeline 8 in every branch; the ancestry and LSN determine whether histories connect.

Use Patroni's recorded history:

```bash
patronictl -c /etc/patroni/patroni.yml history prod-ha
```

Inspect history files without editing them:

```bash
find /var/lib/postgresql/18/main/pg_wal -maxdepth 1 -name '*.history' -type f -print
```

If history files are archived, verify retrieval for the new timeline too. PostgreSQL recommends archiving timeline history files because they are small and needed to navigate recovery across failovers.

Timeline-related failures commonly mean:

- The source and target are unrelated clusters despite similar names.
- A needed history file or WAL segment is missing from local storage and archive.
- The candidate previously followed a different fork and `check_timeline` was not enabled.
- The source changed again during diagnosis because another failover occurred.

Re-run `patronictl list` immediately before any approved rewind. The source must still be the current leader.

## Check rewind authentication and source access

`--source-server` uses a normal SQL connection, not a replication-protocol connection. The role needs `LOGIN` and permission to execute the catalog file functions documented for the installed PostgreSQL version. A superuser works but is broader than necessary.

Patroni can create a dedicated role on PostgreSQL 11 and newer when configured at initialization:

```yaml
postgresql:
  authentication:
    rewind:
      username: rewind_user
      password: REPLACE_WITH_SECRET
      sslmode: verify-full
      sslrootcert: /etc/patroni/tls/postgres-ca.pem
```

Test from the target host using the same network/TLS identity:

```bash
psql 'host=pg2.internal port=5432 dbname=postgres user=rewind_user sslmode=verify-full sslrootcert=/etc/patroni/tls/postgres-ca.pem' \
  -c 'SELECT pg_is_in_recovery();'
```

Expect `false` from the current source primary. Put the password in a protected `PGPASSFILE` or secret agent, not the command line. For an existing role, apply the exact function grants from that PostgreSQL major version's official `pg_rewind` notes; signatures can differ, so do not blindly copy grants from an older blog post.

If Patroni's REST or PostgreSQL certificate uses a DNS name, connecting by raw IP with `sslmode=verify-full` will fail unless the certificate contains that IP identity. Fix identity and routing rather than disabling verification in production.

## Check target files, tablespaces, and configuration

`pg_rewind` must write the target data directory and every target tablespace. It can fail immediately on read-only files, mismatched ownership, broken symlinks, full filesystems, or source/target paths that map external TLS keys into `PGDATA`.

Check without changing ownership recursively:

```bash
namei -l /var/lib/postgresql/18/main
df -h /var/lib/postgresql/18/main
df -i /var/lib/postgresql/18/main
find /var/lib/postgresql/18/main/pg_tblspc -maxdepth 1 -type l -ls
```

Use the PostgreSQL service account consistently. Correct the specific bad mount or file; a broad recursive `chown` can damage security-sensitive keys or tablespace layouts.

Remember that `pg_rewind` copies configuration files found in the data directory from the source. PostgreSQL warns that source configuration may not be correct for the target host. Patroni normally regenerates managed settings, but external configuration, tablespace paths, certificates, and archive credentials still need post-rewind review.

## Run a safe dry-run and classify the result

With Patroni stopped and the target fenced:

```bash
export PGPASSFILE=/etc/patroni/rewind.pgpass

/usr/lib/postgresql/18/bin/pg_rewind \
  --dry-run \
  --progress \
  --restore-target-wal \
  --target-pgdata=/var/lib/postgresql/18/main \
  --source-server='host=pg2.internal port=5432 dbname=postgres user=rewind_user sslmode=verify-full sslrootcert=/etc/patroni/tls/postgres-ca.pem'
```

Interpret the broad error class:

| Error class | What it means | Next action |
| --- | --- | --- |
| Checksums/hints prerequisite | Target cannot identify all changed pages | Reinitialize; the setting cannot be repaired retroactively |
| Missing WAL before divergence | Target branch scan is incomplete | Restore exact target WAL from archive with `-c`, otherwise reinitialize |
| Timeline history/ancestor error | Histories do not connect or metadata is missing | Verify source identity and archived history; do not force |
| System identifier/version mismatch | Source is not a compatible copy | Select the correct source or take a new base backup |
| Permission/authentication error | Source catalog files cannot be read or target cannot be written | Fix least-privilege access and rerun the dry run |
| Target not cleanly shut down | Preliminary crash recovery could not complete | Fix target config/libraries and complete safe shutdown, or reinitialize |
| Source changed/unavailable | Leadership or network changed during the operation | Re-list Patroni and restart the decision process |

Do not use `--no-ensure-shutdown` to bypass an unclean target unless a PostgreSQL expert has separately completed crash recovery. The option makes `pg_rewind` error rather than repairing shutdown state; it does not make an unsafe target safe.

Do not use `--no-sync` in production recovery. Skipping final filesystem synchronization makes a subsequent operating-system crash capable of corrupting the rewound target.

## Let Patroni own the actual operation

Once the dry run and prerequisites are sound, remove manual environment overrides and start Patroni. It should detect divergence and run rewind against the current leader:

```bash
systemctl start patroni
journalctl -u patroni --follow
```

Keep these local policies conservative during diagnosis:

```yaml
postgresql:
  remove_data_directory_on_rewind_failure: false
  remove_data_directory_on_diverged_timelines: false
```

These values avoid policy-driven automatic rebuild merely because rewind is unavailable or timelines diverge. They cannot make a partly modified target recoverable or guarantee that Patroni preserves a directory it has detected as broken. If a rewind has already modified files and then fails, repeated execution is not a recovery plan. Preserve evidence and rebuild the replica:

```bash
patronictl -c /etc/patroni/patroni.yml reinit prod-ha pg1 \
  --from-leader --wait --force
```

This destroys the replica's local data, so confirm the target member and preserve any divergent evidence before approval.

## Verify after repair

Require every layer to agree:

```bash
patronictl -c /etc/patroni/patroni.yml list prod-ha --extended
curl --include http://10.40.0.11:8008/replica
```

On the repaired target:

```sql
SELECT pg_is_in_recovery(),
       pg_last_wal_receive_lsn(),
       pg_last_wal_replay_lsn(),
       pg_last_xact_replay_timestamp();

SELECT status, sender_host, latest_end_lsn
FROM pg_stat_wal_receiver;
```

On the current primary:

```sql
SELECT application_name,
       state,
       replay_lsn,
       pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS byte_lag
FROM pg_stat_replication;
```

The former primary must be in recovery, actively streaming, on the current timeline, and below the required lag before it receives read traffic or failover eligibility.

## Prevent the next failure

- Initialize new clusters with data checksums and keep `wal_log_hints=on` plus `full_page_writes=on`.
- Enable and verify Patroni `use_pg_rewind` before failover.
- Archive WAL and timeline history continuously; test target-side `restore_command` restores.
- Retain enough WAL/archives for the maximum realistic outage and discovery time.
- Alert on archive failure, timeline change, missing rewind binary, and replica divergence.
- Run a scheduled switchover/rewind exercise in staging and measure how long target WAL remains available.
- Treat a failed partial rewind as destructive; use a new base backup rather than hoping the directory is consistent.

## References

- [PostgreSQL `pg_rewind`](https://www.postgresql.org/docs/current/app-pgrewind.html)
- [PostgreSQL WAL configuration](https://www.postgresql.org/docs/current/runtime-config-wal.html)
- [PostgreSQL continuous archiving and timeline history](https://www.postgresql.org/docs/current/continuous-archiving.html)
- [PostgreSQL control-data utility](https://www.postgresql.org/docs/current/app-pgcontroldata.html)
- [Patroni dynamic configuration](https://patroni.readthedocs.io/en/latest/dynamic_configuration.html)
- [Patroni YAML configuration settings](https://patroni.readthedocs.io/en/latest/yaml_configuration.html)
- [Patroni rewind implementation reference](https://patroni.readthedocs.io/en/latest/modules/patroni.postgresql.rewind.html)
