# Validation Summary: How to Rejoin the Old PostgreSQL Primary After Patroni Failover with `pg_rewind`

## Status
validated

## Post Type
Operational guide / disaster-recovery runbook

## Technologies Covered

- PostgreSQL 18 physical streaming replication
- PostgreSQL WAL, timelines, timeline history, and archive recovery
- PostgreSQL `pg_rewind`
- Patroni 4.1.5 high availability, dynamic configuration, REST API, and `patronictl`
- HAProxy fencing and systemd service management
- TLS-authenticated libpq connections

## Sources Consulted

- [PostgreSQL 18 `pg_rewind` documentation](https://www.postgresql.org/docs/18/app-pgrewind.html)
- [PostgreSQL 18.6 `pg_rewind` implementation](https://github.com/postgres/postgres/blob/REL_18_6/src/bin/pg_rewind/pg_rewind.c)
- [PostgreSQL 18.6 target-WAL reader](https://github.com/postgres/postgres/blob/REL_18_6/src/bin/pg_rewind/parsexlog.c) and [archive restore implementation](https://github.com/postgres/postgres/blob/REL_18_6/src/fe_utils/archive.c)
- [PostgreSQL timeline history and continuous archiving](https://www.postgresql.org/docs/18/continuous-archiving.html)
- [PostgreSQL log-shipping standby and failover documentation](https://www.postgresql.org/docs/18/warm-standby.html)
- [PostgreSQL WAL configuration](https://www.postgresql.org/docs/18/runtime-config-wal.html), [data checksums](https://www.postgresql.org/docs/18/checksums.html), and [`initdb`](https://www.postgresql.org/docs/18/app-initdb.html)
- [PostgreSQL monitoring views](https://www.postgresql.org/docs/18/monitoring-stats.html) and [recovery/WAL functions](https://www.postgresql.org/docs/18/functions-admin.html)
- [Patroni dynamic configuration](https://patroni.readthedocs.io/en/latest/dynamic_configuration.html) and [YAML settings](https://patroni.readthedocs.io/en/latest/yaml_configuration.html)
- [Patroni `patronictl` documentation](https://patroni.readthedocs.io/en/latest/patronictl.html) and [REST API](https://patroni.readthedocs.io/en/latest/rest_api.html)
- [Patroni 4.1.5 rewind implementation](https://github.com/patroni/patroni/blob/v4.1.5/patroni/postgresql/rewind.py), [HA implementation](https://github.com/patroni/patroni/blob/v4.1.5/patroni/ha.py), and [rewind module reference](https://patroni.readthedocs.io/en/latest/modules/patroni.postgresql.rewind.html)
- [Patroni pause-mode behavior](https://patroni.readthedocs.io/en/latest/pause.html)
- [HAProxy Runtime API `disable server`](https://www.haproxy.com/documentation/haproxy-runtime-api/reference/disable-server/)
- [PostgreSQL supported-version policy](https://www.postgresql.org/support/versioning/) and [CVE-2026-6475 notice](https://www.postgresql.org/support/security/CVE-2026-6475/)

## Issues Found

- The opening implied that every former primary requires rewind. It now limits that claim to a former primary that generated WAL beyond the new timeline's fork point and explains that a direct ancestor does not require rewind.
- The rewind prerequisites understated the WAL range and its timing requirements. They now require target WAL from the last checkpoint before divergence through target end-of-WAL, source-timeline WAL needed to reach consistency, and `wal_log_hints`/`full_page_writes` before the relevant changes were generated.
- The shutdown prerequisite conflated a stopped target with an already clean shutdown. It now states that the target must be stopped and explains the automatic single-user crash-recovery step used by current `pg_rewind` and Patroni.
- The post said `show-config` could change `use_pg_rewind`, but that command is read-only. A valid `patronictl edit-config --set postgresql.use_pg_rewind=true` command was added.
- The deletion-policy paragraph suggested current Patroni might override both `remove_data_directory_*: false` settings after rewind failure. It now reflects Patroni 4.1.5: those settings prevent automatic deletion by the rewind/divergence paths, although a failed rewind may already have left `PGDATA` unusable.
- The HAProxy fencing instruction used incorrect backend terminology and described access needed by the wrong node. It now disables/removes the `pg1` server entry and preserves controlled target access to the new primary and recovery services.
- The expected Patroni logs promised live rewind progress and described recovery configuration ambiguously. Patroni 4.1.5 does not pass `--progress` during automatic rewind, so the milestones now say start/completion and identify recovery configuration on `pg1` pointing to the new leader.
- The manual command could be run as root even though PostgreSQL rejects that. It now runs as the `postgres` operating-system account, which owns the example `PGDATA`.
- The Debian-style manual example omitted `--config-file`, so `--restore-target-wal` might not find an external `postgresql.conf`. The correct external target configuration path was added and documented as deployment-specific.
- The dry-run description incorrectly claimed that nothing changes. It now explains that dry run skips the rewind's normal file synchronization and automatic crash recovery, requires an already clean target, and may still execute `restore_command` and place archived WAL in target `pg_wal`.
- Stopping Patroni alone did not prove PostgreSQL was offline, especially in pause mode. The instructions now require verification that no postmaster remains before manual diagnosis.
- The `/replica` check did not account for `noloadbalance=true`. The post now explains that this tag intentionally produces HTTP 503 even when replication itself is healthy.
- The verification text implied LSNs advance continuously. It now qualifies that they advance when the source generates WAL.
- The failure table incorrectly suggested rewind file copying could continue after streaming starts. It now correctly identifies target WAL receive/replay backlog as the cause.
- The generic DCS quorum check was not applicable to every Patroni DCS. It now requires a healthy DCS and a stable quorum where applicable.

## Review Notes

- PostgreSQL 18 enables data checksums by default, but retaining the explicit Patroni `data-checksums` bootstrap option is valid and documents intent.
- PostgreSQL 11 is end-of-life. Its mention is retained only as the historical version boundary for Patroni's dedicated rewind-role support; supported PostgreSQL majors on the validation date are 14 through 18.
- Operators should use patched minor releases. CVE-2026-6475 affected `pg_rewind` and was fixed in PostgreSQL 18.4, 17.10, 16.14, 15.18, and 14.23; PostgreSQL 18.6 is current and fixed on the validation date.
- Binary, data-directory, configuration, service, TLS, and password-file paths remain deployment-specific examples and must match the target host.
- All seven reference URLs in the post resolved successfully to the intended official PostgreSQL or Patroni documentation during validation.
- The YAML snippets were parsed successfully, all shown PostgreSQL 18 SQL functions/view columns were verified, and all `patronictl`/`pg_rewind` options were checked against current documentation and released source. No destructive live failover or rewind was performed.
