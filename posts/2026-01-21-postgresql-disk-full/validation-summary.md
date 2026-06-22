# Validation Summary: How to Fix PostgreSQL 'Disk Full' Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- PostgreSQL 16
- PostgreSQL WAL and replication slots
- PostgreSQL VACUUM and CHECKPOINT
- Linux coreutils disk usage commands
- Prometheus alerting rules

## Sources Consulted
- PostgreSQL 16 Write Ahead Log configuration: https://www.postgresql.org/docs/16/runtime-config-wal.html
- PostgreSQL 16 Replication configuration: https://www.postgresql.org/docs/16/runtime-config-replication.html
- PostgreSQL 16 pg_replication_slots view: https://www.postgresql.org/docs/16/view-pg-replication-slots.html
- PostgreSQL 16 System Administration Functions: https://www.postgresql.org/docs/16/functions-admin.html
- PostgreSQL 16 VACUUM command: https://www.postgresql.org/docs/16/sql-vacuum.html
- PostgreSQL 16 Database File Layout: https://www.postgresql.org/docs/16/storage-file-layout.html
- PostgreSQL 16 WAL Internals: https://www.postgresql.org/docs/16/wal-internals.html
- PostgreSQL 16 Table Partitioning: https://www.postgresql.org/docs/16/ddl-partitioning.html
- Prometheus alerting rules: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- GNU coreutils df, du, sort, and head help output from the local environment.

## Issues Found
- The "Clear WAL Files" heading could be read as manually deleting files from `pg_wal`, which is unsafe. Changed it to "Release WAL Held by Slots (if safe)" and clarified that only confirmed unused inactive slots should be dropped.
- The checkpoint example implied a checkpoint always releases WAL. Clarified that it recycles or removes WAL only when the files are no longer needed.
- The `VACUUM FULL` example omitted the key operational caveat that it needs additional free disk space while rewriting the table. Added that caveat to the comment.
- The WAL configuration section described all settings as retention controls, but `max_wal_size` is a soft checkpoint target and replication slots can retain WAL independently. Renamed the section to "Configure WAL Growth and Retention" and added `max_slot_wal_keep_size` to cap WAL retained by slots.

## Review Notes
The commands and SQL examples are broadly correct for PostgreSQL 16, but the recovery commands assume the Debian/Ubuntu package layout at `/var/lib/postgresql/16/main/` and a `postgresql` systemd unit name. Other distributions may use different data directory paths or service names.
