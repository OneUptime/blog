# Validation Summary: Why `pg_rewind` Fails After a Patroni Failover

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered

- PostgreSQL 18 and `pg_rewind`
- Write-ahead logging, WAL archiving, checkpoints, and timeline history
- Patroni failover, replica reinitialization, and dynamic configuration
- PostgreSQL streaming replication and monitoring views
- libpq authentication and TLS certificate verification
- Linux systemd services, filesystems, and tablespaces

## Sources Consulted

- [PostgreSQL 18: pg_rewind](https://www.postgresql.org/docs/18/app-pgrewind.html)
- [PostgreSQL 18: initdb](https://www.postgresql.org/docs/18/app-initdb.html)
- [PostgreSQL 18: Data Checksums](https://www.postgresql.org/docs/18/checksums.html)
- [PostgreSQL 18: Write Ahead Log configuration](https://www.postgresql.org/docs/18/runtime-config-wal.html)
- [PostgreSQL 18: Continuous Archiving and Point-in-Time Recovery](https://www.postgresql.org/docs/18/continuous-archiving.html)
- [PostgreSQL 18: pg_controldata](https://www.postgresql.org/docs/18/app-pgcontroldata.html)
- [PostgreSQL 18: SSL support in libpq](https://www.postgresql.org/docs/18/libpq-ssl.html)
- [PostgreSQL 18: The Password File](https://www.postgresql.org/docs/18/libpq-pgpass.html)
- [PostgreSQL 18: Monitoring Statistics](https://www.postgresql.org/docs/18/monitoring-stats.html)
- [PostgreSQL REL_18_STABLE: pg_rewind source](https://github.com/postgres/postgres/blob/REL_18_STABLE/src/bin/pg_rewind/pg_rewind.c)
- [PostgreSQL REL_18_STABLE: pg_rewind WAL-reading source](https://github.com/postgres/postgres/blob/REL_18_STABLE/src/bin/pg_rewind/parsexlog.c)
- [PostgreSQL REL_18_STABLE: frontend archive-restore source](https://github.com/postgres/postgres/blob/REL_18_STABLE/src/fe_utils/archive.c)
- [Patroni: patronictl](https://patroni.readthedocs.io/en/latest/patronictl.html)
- [Patroni: Dynamic Configuration Settings](https://patroni.readthedocs.io/en/latest/dynamic_configuration.html)
- [Patroni: YAML Configuration Settings](https://patroni.readthedocs.io/en/latest/yaml_configuration.html)
- [Patroni: Pause/Resume mode](https://patroni.readthedocs.io/en/latest/pause.html)
- [Patroni: REST API](https://patroni.readthedocs.io/en/latest/rest_api.html)
- [Patroni: PostgreSQL rewind module](https://patroni.readthedocs.io/en/latest/modules/patroni.postgresql.rewind.html)

## Issues Found

- Corrected the required WAL horizon from the divergence point itself to the last checkpoint before divergence, which is where `pg_rewind` begins scanning the target branch.
- Clarified that stopping Patroni does not necessarily stop PostgreSQL in Patroni pause mode, so operators must verify the target postmaster is stopped before offline inspection.
- Made the checksum, `wal_log_hints`, and `full_page_writes` requirements explicitly apply while the required WAL was generated. Also corrected the PostgreSQL 18 statement: new clusters have checksums enabled by default unless `initdb --no-data-checksums` is selected.
- Corrected the failure sequence that attributed WAL recycling to time spent offline. Needed WAL is recycled when the divergent target continues producing enough WAL, or it may be removed by an external action; elapsed offline time alone does not recycle it.
- Relabeled the WAL inventory command because its prefix glob can include WAL-related files such as `.history`, `.backup`, or `.partial` files, not only complete WAL segments.
- Added the required operating-system identity caveat for manual `pg_rewind` runs and documented that `--dry-run --restore-target-wal` can still execute `restore_command` and write restored segments into target `pg_wal`.
- Corrected timeline-history recovery guidance: `--restore-target-wal` retrieves missing WAL segments but does not fetch missing `.history` files, which must be restored separately when required.
- Clarified Patroni's `check_timeline` behavior. During normal candidate checks it excludes members on lower timeline numbers when enabled, but it does not validate complete branch ancestry.
- Removed the Patroni REST certificate from the libpq `sslmode=verify-full` example because that connection validates the PostgreSQL server certificate, not the separate Patroni REST API certificate.
- Removed the implication that filesystem failures necessarily occur before modification and added checks for separately mounted `pg_wal` and resolved tablespace targets.
- Corrected unclean-shutdown handling for dry runs: dry-run mode reports the state without performing the preliminary single-user crash recovery attempted by a real run.

## Review Notes

The remaining commands, flags, Patroni keys, SQL functions, and monitoring columns were checked against PostgreSQL 18 and current Patroni documentation. Filesystem paths, service names, hostnames, ports, and archive commands remain deployment-specific and must match the local installation.
