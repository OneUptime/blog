# Migrate JuiceFS Metadata from Redis to MySQL with a Controlled Cutover

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: JuiceFS, Redis, MySQL

Description: Export JuiceFS metadata from Redis, load an empty MySQL database, verify volume identity, and define the point beyond which switching back would lose changes.

Moving JuiceFS metadata to MySQL changes the database that coordinates the filesystem. It does not require copying file contents to a different object bucket. The difficult part is ensuring that every client switches to the same authoritative metadata engine at the same point in time.

This guide pins **JuiceFS Community Edition 1.4.2** and describes a maintenance-window migration. Rehearse against your selected MySQL release and topology before scheduling the cutover. There is no live dual-write phase in this procedure.

## Decide whether the destination is ready

Provision a dedicated empty MySQL database with a transactional engine such as InnoDB. Give the migration identity the privileges needed to create and populate JuiceFS's schema in that database. Do not target a shared application schema and do not run `juicefs format` first.

The destination needs durable backups, tested recovery, sufficient disk space, and an understood high-availability design. A MySQL-compatible endpoint is not automatically equivalent to a tested MySQL deployment: distributed variants can differ in transaction behavior. [JuiceFS MySQL guidance](https://github.com/juicedata/juicefs/blob/v1.4.2/docs/en/administration/metadata/mysql_best_practices.md).

Estimate connection demand across all mounts and tools. For example, a limit of 30 connections per mount can permit 900 connections across 30 mounts, before administrative traffic. Choose limits from the server budget and workload; reducing them too far can make filesystem operations wait for an available connection.

Record the current volume UUID, name, bucket, encryption settings, client versions, mount options, and every service that knows the Redis URL. Include gateways, scheduled jobs, and machines that are normally offline.

## Prepare two independently authenticated endpoints

The source and destination should have separate password files, provisioned through the normal secret-management process. These example variables contain no passwords:

```bash
source_meta='rediss://juicefs@redis.example.internal:6379/1'
target_meta='mysql://juicefs:@(mysql.example.internal:3306)/juicefs_migration?tls=true&max_open_conns=30'
```

Replace hostnames, user names, database names, and the example connection limit. Quote the MySQL URL: parentheses and ampersands have shell meanings when unquoted.

JuiceFS supports `META_PASSWORD_FILE` for MySQL as well as Redis. Its MySQL URL passes driver settings such as `tls=true`, while JuiceFS handles its connection-pool controls. [Metadata URL reference](https://github.com/juicedata/juicefs/blob/v1.4.2/docs/en/reference/how_to_set_up_metadata_engine.md), [SQL connection handling](https://github.com/juicedata/juicefs/blob/v1.4.2/pkg/meta/sql.go).

The MySQL certificate must match the hostname and chain to a CA trusted by the client environment. The bundled Go MySQL driver is version 1.9.3 in this JuiceFS release. Its `tls=true` mode enables TLS; do not substitute `skip-verify` or `preferred`, which do not provide the same verification guarantees. Test the actual JuiceFS connection from every class of client host. [Pinned driver TLS settings](https://github.com/go-sql-driver/mysql/blob/v1.9.3/README.md#tls).

## Establish one final source state

Stop application writers using the application's documented shutdown or checkpoint procedure. Drain pending client uploads, particularly on mounts using writeback, and stop mount owners and other volume-mutating clients. Prevent automatic restarts during the window.

Keep the old Redis service protected and retain its independent backup, but fence normal JuiceFS clients from reconnecting to it. The controlled migration process still needs read access to export its final state.

```mermaid
flowchart LR
  A[Quiesce and fence clients] --> B[Final Redis dump]
  B --> C[Load empty MySQL database]
  C --> D[Verify identity and read-only behavior]
  D --> E[Authorize controlled writes]
  E --> F[Move remaining clients]
```

The `dump` command does not provide a consistent snapshot while files are changing. Stopping writes is therefore part of the migration, not an optional performance optimization. Keep the system quiet until validation reaches the agreed cutover gate. [JuiceFS dump/load consistency guidance](https://github.com/juicedata/juicefs/blob/v1.4.2/docs/en/administration/metadata_dump_load.md).

## Export a durable artifact before importing

Use a new protected directory outside JuiceFS. The following assumes the endpoint variables above are already set and `/srv/migration` exists with appropriate permissions:

```bash
set -eu
umask 077
work=$(mktemp -d /srv/migration/juicefs.XXXXXX)
META_PASSWORD_FILE=/etc/juicefs/redis-password \
  juicefs dump "$source_meta" "$work/final.json.gz"
printf 'Final export: %s\n' "$work/final.json.gz"
```

Keep this file and its transfer checksum with the migration record. The gzip extension is recognized by JuiceFS. An export file gives you an inspectable boundary between the two database operations and a retained input if loading fails.

After independently confirming that the destination database is empty, import that exact artifact:

```bash
META_PASSWORD_FILE=/etc/juicefs/mysql-password \
  juicefs load "$target_meta" "$work/final.json.gz"
```

Each command receives only its own password-file setting. An existing `META_PASSWORD` in the shell should be removed from the migration environment so there is no competing credential source.

If loading fails, preserve its output and the partially populated destination for diagnosis. Have the database owner provision a new empty attempt rather than blindly rerunning against partial state or deleting tables. The command's existing-volume check is a guard, not a substitute for confirming database ownership. [Pinned load implementation](https://github.com/juicedata/juicefs/blob/v1.4.2/cmd/load.go).

## Verify that the volume stayed the same

Inspect the destination configuration:

```bash
META_PASSWORD_FILE=/etc/juicefs/mysql-password \
  juicefs config "$target_meta"
```

Compare UUID, name, storage type, bucket, and encryption settings with the source record. Treat the output as sensitive. Do not invent a new UUID or redirect the bucket to make a failed check disappear.

Metadata exports omit object-storage secrets by default. Restore the required credentials through the supported configuration process before checking objects. Encryption keys and cloud identity access must remain available to the new clients. [Configuration command](https://github.com/juicedata/juicefs/blob/v1.4.2/cmd/config.go).

Run `juicefs fsck` against the destination without repair options during the planned validation window. Then use an isolated read-only mount to check known files, ownership, checksums, and application-level expectations. This requires original Redis-connected clients to remain fenced. A successful metadata import alone does not prove acceptable MySQL latency or complete object availability.

## Make the rollback boundary explicit

Before any destination writes or background mutations, a rejected rehearsal can usually return to the unchanged source after the destination is isolated and its clients are stopped. Confirm that the original object state remains compatible; do not rely on endpoint switching alone.

Once a MySQL-connected client changes the filesystem, Redis is stale. Switching clients back would discard knowledge of those changes and risk conflicting object handling. From that point, reversing the migration requires another coordinated freeze and transfer of the current metadata into a fresh destination, or a separately approved recovery operation.

Authorize a small test writer first. Verify create, flush, cross-client read, rename, and deletion of test data. Monitor MySQL connection use and filesystem errors, then move the remaining clients. Update persistent service configuration so a reboot cannot reconnect a forgotten host to Redis.

Retain the final export and source backup through the acceptance period. Record when MySQL became authoritative and when the first write occurred. Those two timestamps make later incident decisions much clearer than a generic “migration completed” note.

The command options and connection behavior were reviewed against pinned source. Local checks covered shell syntax and MySQL driver parsing, not a live Redis-to-MySQL migration, TLS handshake, FUSE mount, or performance comparison. Those checks belong in the environment-specific rehearsal before production cutover.
