# How to Use pt-table-sync to Fix MySQL Replication Drift

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Replication, Sync, Percona, Consistency

Description: Learn how to use pt-table-sync to repair data differences between MySQL primary and replica servers identified by pt-table-checksum.

---

## What is pt-table-sync?

`pt-table-sync` is a Percona Toolkit utility that resolves data differences between MySQL servers by generating and applying `REPLACE` and `DELETE` statements. It is typically used after `pt-table-checksum` has identified inconsistencies between a primary and its replicas, bringing the replica data back in sync without requiring a full rebuild.

## Prerequisites

- `pt-table-checksum` has been run and the `percona.checksums` table contains diff information
- A user with `SELECT`, `INSERT`, `UPDATE`, `DELETE` privileges on the affected databases
- Run from the primary server, targeting the replica

## Dry Run First

Always preview the changes before applying them:

```bash
pt-table-sync \
  --sync-to-master h=replica-host,u=root,p=secret \
  --databases=mydb \
  --dry-run \
  --print
```

This prints all `REPLACE` and `DELETE` statements that would be applied without executing them.

## Syncing a Replica to the Primary

```bash
pt-table-sync \
  --sync-to-master h=replica-host,u=root,p=secret \
  --databases=mydb \
  --execute
```

`--sync-to-master` tells pt-table-sync to connect to the replica and figure out the primary from its replication status, then sync in the direction of primary to replica.

## Syncing Specific Tables

```bash
pt-table-sync \
  --sync-to-master h=replica-host,u=root,p=secret \
  --tables=mydb.customers,mydb.orders \
  --execute
```

## Using pt-table-checksum Results to Scope the Sync

To only sync tables that pt-table-checksum identified as different:

```bash
pt-table-sync \
  --sync-to-master h=replica-host,u=root,p=secret \
  --replicate=percona.checksums \
  --databases=mydb \
  --execute
```

The `--replicate` option reads the checksum table and limits the sync to only those tables and chunks that showed differences.

## Syncing Between Two Independent Servers

When servers are not in a replication relationship, specify both source and destination directly:

```bash
pt-table-sync \
  h=source-host,u=root,p=secret \
  h=dest-host,u=root,p=secret \
  --databases=mydb \
  --execute
```

## Bidirectional Conflict Resolution

For bidirectional sync scenarios, the `--conflict-column` and `--conflict-comparison` flags resolve which row wins:

```bash
pt-table-sync \
  h=server1,u=root,p=secret \
  h=server2,u=root,p=secret \
  --conflict-column=updated_at \
  --conflict-comparison=newest \
  --databases=mydb \
  --execute
```

## Printing Sync Statements for Review

To save all generated SQL for audit purposes:

```bash
pt-table-sync \
  --sync-to-master h=replica-host,u=root,p=secret \
  --databases=mydb \
  --print \
  --execute 2>&1 | tee sync_changes.sql
```

## Verifying After Sync

After running pt-table-sync, re-run pt-table-checksum to confirm no more diffs:

```bash
pt-table-checksum \
  --host=primary-host \
  --user=root \
  --password=secret \
  --databases=mydb
```

The `DIFFS` column should show `0` for all tables after a successful sync.

## Summary

`pt-table-sync` is the standard repair tool for MySQL replication drift. Always use `--dry-run` and `--print` first to review changes, then apply with `--execute`. Combine it with `--replicate=percona.checksums` when working from pt-table-checksum results to limit the scope and avoid unnecessary work on already-consistent tables.
