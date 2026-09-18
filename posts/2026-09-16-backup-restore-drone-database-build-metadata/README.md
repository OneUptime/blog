# Back Up and Restore Drone's Database While Preserving Repository and Build Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Drone, Backup, PostgreSQL, SQLite, DevOps

Description: Back up and restore Drone with consistent database snapshots, preserved encryption keys, external logs, and verified repository and build identities.

A successful database restore can still leave Drone unable to decrypt a repository secret, find old logs, or connect a runner. A usable recovery point includes the database, the matching server configuration, and any external storage referenced by the database.

This procedure assumes a self-hosted Drone installation and a planned maintenance window. Restore into an isolated environment first. Use the same Drone image version as the backup before considering an upgrade.

## Inventory the recovery unit

Record the database driver and datasource, server image digest, persistent volume mapping, public URL, source-control provider configuration, and secret-manager references. Drone defaults to SQLite and supports alternative databases as described in its [database documentation](https://docs.drone.io/server/storage/database/). Use a currently supported database release compatible with your installation; an old minimum version in a product example is not a maintenance recommendation.

If database encryption is enabled, preserve the exact `DRONE_DATABASE_SECRET` through your secret-management process. Replacing it with a new random value during restoration does not decrypt existing records. Drone's [encryption documentation](https://docs.drone.io/server/storage/encryption/) also warns that encryption must be enabled before secrets are added; recovery is not the time to retrofit that setting.

Check [blob storage configuration](https://docs.drone.io/server/storage/blob/). Logs may live in the database or an S3-compatible store. An SQL backup does not include external objects. Record their bucket, prefix, access policy, and retention settings, and preserve the objects belonging to the recovery point. Build-produced images and reports stored by pipeline tools are a further, separate dependency.

## Establish a quiet recovery point

Hold new triggers through a reversible maintenance procedure, record webhook deliveries needing replay, and wait for active builds to finish. Drain runners while the server remains available for their final updates. Stop the server only after those updates are visible.

For multiple server replicas, stop all database writers. A load balancer maintenance page alone does not stop internal schedulers or an already connected runner. Record pending build identifiers and external deployment operations so restoration cannot silently repeat an irreversible action.

Keep a small verification ledger: a repository identifier, several historical build numbers and commit SHAs, the most recent completed build, one old log, and the name of a secret-dependent test. Do not place secret values in that ledger.

## Create the database backup

For SQLite, use its backup mechanism rather than copying only a live database file and ignoring a possible write-ahead log. This host-side example assumes the configured database really is at the illustrated path and the operator has appropriate access:

```sh
set -eu
umask 077
mkdir -p /secure-backups/drone
test -f /var/lib/drone/database.sqlite || exit 1
sqlite3 /var/lib/drone/database.sqlite \
  ".backup '/secure-backups/drone/database.sqlite'"
sqlite3 /secure-backups/drone/database.sqlite 'PRAGMA integrity_check;'
```

Require the backup command to succeed before checking the output, then require the integrity result to be `ok`. The shell's `set -e` stops the snippet on a failed backup instead of checking a stale file from an earlier run. Confirm the path from configuration; do not let a typo create an empty database and then mistake its successful integrity check for a valid backup. SQLite documents consistent copying through its [backup API](https://www.sqlite.org/backup.html) and the shell's [backup command](https://sqlite.org/cli.html).

For PostgreSQL, use an authenticated service definition or your approved credential mechanism:

```sh
set -eu
umask 077
mkdir -p /secure-backups/drone
pg_dump --dbname=service=drone_backup --format=custom \
  --file=/secure-backups/drone/drone.dump
pg_restore --list /secure-backups/drone/drone.dump > /secure-backups/drone/drone.contents
```

The listing checks that the archive can be read; it does not replace an actual restore. Match the `pg_dump` client to the supported server versions, and separately preserve required roles and ownership arrangements. A [pg_dump archive](https://www.postgresql.org/docs/current/app-pgdump.html) covers one database, not all cluster-wide objects.

## Restore without creating a second active installation

Create a clean database or volume in the isolated environment. Keep runners, inbound webhooks, cron processing, and outbound production side effects disabled while validating it. Restore SQLite with the server stopped and correct filesystem ownership. For PostgreSQL, restore into a deliberately created empty destination, use `pg_restore --exit-on-error`, and check every error before starting Drone.

Load the matching encryption and provider configuration securely. Avoid reactivating repositories simply because the UI looks empty: first verify that Drone is connected to the restored database. Recreating records can create different identities and new webhooks while hiding the underlying configuration mistake.

Compare the verification ledger, open historical logs, and run a harmless secret-dependent canary in an explicitly isolated repository. Reconcile pending and interrupted builds before enabling runners. A restored record cannot establish whether an external deployment completed after the backup; inspect the deployment target itself.

During cutover, keep the former installation fenced off, enable only the restored instance, and replay held events deliberately. Record the recovered timestamp and any lost interval. The recovery is complete when repository identities, history, secrets, logs, and a fresh build all work together.
