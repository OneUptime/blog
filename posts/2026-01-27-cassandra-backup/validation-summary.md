# Validation Summary: How to Backup Cassandra Databases

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Apache Cassandra
- Cassandra nodetool
- Cassandra SSTables and snapshots
- Cassandra incremental backups
- Cassandra commit log archiving
- sstableloader
- Bash
- Kubernetes CronJob
- AWS S3 CLI

## Sources Consulted
- Apache Cassandra Backups documentation: https://cassandra.apache.org/doc/latest/cassandra/managing/operating/backups.html
- Apache Cassandra 4.1 Backups documentation: https://cassandra.apache.org/doc/4.1/cassandra/operating/backups.html
- Apache Cassandra nodetool snapshot documentation: https://cassandra.apache.org/doc/latest/cassandra/managing/tools/nodetool/snapshot.html
- Apache Cassandra nodetool command reference: https://cassandra.apache.org/doc/4.1/cassandra/tools/nodetool/nodetool.html
- Apache Cassandra sstableloader documentation: https://cassandra.apache.org/doc/4.1/cassandra/tools/sstable/sstableloader.html
- Apache Cassandra nodetool import documentation: https://cassandra.apache.org/doc/latest/cassandra/managing/tools/nodetool/import.html
- Apache Cassandra commitlog-archiving.properties documentation: https://cassandra.apache.org/doc/latest/cassandra/managing/configuration/cass_cl_archive_file.html

## Issues Found
- The write-path diagram showed the memtable feeding the commit log, and the backup target diagram associated incremental backups with commit logs. Updated the diagram so writes go to the commit log and memtable, and incremental backups are shown as SSTable hard links.
- The multi-table snapshot example used `-cf` with multiple table names. Cassandra's `-cf` / `--table` option accepts one table with one keyspace; updated the example to use `--kt-list` with comma-separated `keyspace.table` entries.
- The snapshot export script ignored the optional destination argument used later by the cron script. Updated `BACKUP_DIR` to accept an optional second argument.
- Snapshot and incremental archive filenames used a single underscore separator, which breaks for valid keyspace or table names containing underscores. Updated archive naming and parsing to use a double-underscore separator.
- The incremental backup verification command used `nodetool getconfig incremental_backups`, which is not the documented backup status command. Replaced it with `nodetool statusbackup`.
- The pre-backup flush comment implied snapshots would omit recent writes unless manually flushed. Cassandra snapshots flush by default unless `--skip-flush` is used, so the comment now describes the explicit flush as a visible preparatory step.
- The restore examples passed snapshot directories directly to `sstableloader`. Official documentation states that `sstableloader` uses parent directories as the target keyspace/table name, so the examples now stage SSTables under temporary `<keyspace>/<table>/` paths before loading.
- The new-cluster restore example parsed keyspace and table names incorrectly from archive filenames and loaded SSTables from directories without the required keyspace/table parents. Updated parsing and staging before `sstableloader`.
- The point-in-time recovery example used an ISO-style timestamp, but Cassandra's `restore_point_in_time` expects `yyyy:MM:dd HH:mm:ss` in GMT. Updated the example format and ensured `commitlog_archiving.properties` restore settings are written whenever commit logs are restored.
- The cluster backup rsync path missed the table directory level in Cassandra's data layout. Updated it from `/data/*/snapshots/...` to `/data/*/*/snapshots/...`.

## Review Notes
The Bash snippets were extracted and checked with `bash -n`; no shell syntax errors were found. The review did not execute Cassandra, Kubernetes, AWS, or destructive filesystem operations. The examples remain illustrative and still require environment-specific authentication, paths, retention, and operational safeguards before production use.
